"use server";

import { ORDER_CANCEL_REASON_MAX_LENGTH, ORDER_CANCEL_REASON_MIN_LENGTH } from "@itmarket/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  ApiError,
  getCart,
  removeCartItem,
  continuePayment,
  createCart,
  createCashOrder,
  createOnlineOrder,
  submitCreditApplication,
  submitProductAvailabilityRequest as submitProductAvailabilityRequestApi,
  upsertCartItem,
} from "@/lib/api";
import {
  attachCustomerCart,
  cancelCustomerOrder,
  createCustomerAddress,
  createCustomerProductReview,
  deleteCustomerAddress,
  type CustomerAddressInput,
  updateCustomerAddress,
  updateCustomerProfile,
} from "@/lib/customer-account";
import {
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  requestPasswordReset,
  resetCustomerPassword,
} from "@/lib/customer-auth";
import {
  clearCustomerSession,
  getCustomerProfile,
  getCustomerSessionToken,
  setCustomerSession,
} from "@/lib/customer-session";
import {
  clearGuestCartId,
  getCheckoutIdempotencyKey,
  getGuestCartSession,
  setGuestCartSession,
} from "@/lib/cart-session";
import type { CartCompleteBarSummary } from "@/lib/cart-complete-bar";

function text(formData: FormData, key: string): string | undefined {
  const values = formData
    .getAll(key)
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim() !== "",
  );
  const value = values.at(-1);
  return value === undefined ? undefined : value.trim();
}

function integer(formData: FormData, key: string): number | undefined {
  const value = text(formData, key);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

const INSTALLMENT_PROVIDERS = ["birbank", "tamkart", "leobank"] as const;
type InstallmentProviderId = (typeof INSTALLMENT_PROVIDERS)[number];

function parseInstallmentProvider(
  value: string | undefined,
): InstallmentProviderId | undefined {
  if (
    value === "birbank" ||
    value === "tamkart" ||
    value === "leobank"
  ) {
    return value;
  }
  return undefined;
}

function mergeCheckoutNotes(
  notes: string | undefined,
  initialPayment: string | undefined,
  deliverySpeed?: "STANDARD" | "EXPRESS",
): string | undefined {
  const parts = [
    notes,
    deliverySpeed
      ? `Çatdırılma növü: ${deliverySpeed === "EXPRESS" ? "Təcili" : "Standart"}`
      : undefined,
    initialPayment ? `İlkin ödəniş: ${initialPayment} AZN` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : undefined;
}

function readDeliverySpeed(
  formData: FormData,
  fulfillmentType: string | undefined,
): "STANDARD" | "EXPRESS" | undefined {
  if (fulfillmentType !== "DELIVERY") return undefined;

  const speed = text(formData, "deliverySpeed");
  if (speed === "EXPRESS") return "EXPRESS";
  return "STANDARD";
}

function rethrowCartStockError(error: unknown): never {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.toLowerCase().includes("insufficient available stock")
  ) {
    throw new Error(
      "Seçilmiş miqdar stokda yoxdur — digər sifarişlər üçün rezerv olunub ola bilər.",
    );
  }
  throw error;
}

async function upsertCartLineFromForm(formData: FormData) {
  const variantId = text(formData, "variantId");
  if (variantId === undefined) throw new Error("Variant seçilməyib");
  const quantity = Number(text(formData, "quantity") ?? "1");
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("Miqdar düzgün deyil");
  }
  const session = await getGuestCartSession();
  const existingCartId = text(formData, "cartId") ?? session.cartId;
  let cartId = existingCartId;
  if (cartId === undefined) {
    const createdCart = await createCart(session.guestToken);
    cartId = createdCart.id;
    await setGuestCartSession({
      cartId: createdCart.id,
      guestToken: createdCart.guestToken,
    });
  } else if (session.cartId !== cartId) {
    await setGuestCartSession({ cartId, guestToken: session.guestToken });
  }
  try {
    await upsertCartItem({ cartId, variantId, quantity });
  } catch (error) {
    rethrowCartStockError(error);
  }
  return cartId;
}

function authField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export type CustomerAuthActionResult = {
  error?: string;
  customer?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  };
};

async function attachActiveCartToCustomer(sessionToken: string) {
  const session = await getGuestCartSession();
  if (session.cartId === undefined) return;
  await attachCustomerCart(sessionToken, session.cartId);
}

export async function customerLogin(
  formData: FormData,
): Promise<CustomerAuthActionResult> {
  const email = authField(formData, "email")?.toLowerCase();
  const password = authField(formData, "password");
  if (email === undefined || password === undefined) {
    return { error: "E-poçt və şifrə tələb olunur" };
  }

  const result = await loginCustomer(email, password);
  if (!result.ok) {
    return { error: "E-poçt və ya şifrə yanlışdır" };
  }

  await setCustomerSession({
    sessionToken: result.sessionToken,
    customer: result.customer,
  });
  await attachActiveCartToCustomer(result.sessionToken);
  revalidatePath("/", "layout");
  revalidatePath("/account");
  return { customer: result.customer };
}

export async function customerRegister(
  formData: FormData,
): Promise<CustomerAuthActionResult> {
  const email = authField(formData, "email")?.toLowerCase();
  const firstName = authField(formData, "firstName");
  const lastName = authField(formData, "lastName");
  const password = authField(formData, "password");
  const passwordConfirm = authField(formData, "passwordConfirm");

  if (
    email === undefined ||
    firstName === undefined ||
    lastName === undefined ||
    password === undefined ||
    passwordConfirm === undefined
  ) {
    return { error: "Bütün qeydiyyat sahələri tələb olunur" };
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return { error: "Ad və soyad ən azı 2 simvol olmalıdır" };
  }
  if (password.length < 8) {
    return { error: "Şifrə ən azı 8 simvol olmalıdır" };
  }
  if (password !== passwordConfirm) {
    return { error: "Şifrələr uyğun gəlmir" };
  }

  const result = await registerCustomer({
    email,
    firstName,
    lastName,
    password,
    passwordConfirm,
  });
  if (!result.ok) {
    return { error: "Hesab yaradıla bilmədi. E-poçt artıq istifadə olunur ola bilər." };
  }

  await setCustomerSession({
    sessionToken: result.sessionToken,
    customer: result.customer,
  });
  await attachActiveCartToCustomer(result.sessionToken);
  revalidatePath("/", "layout");
  revalidatePath("/account");
  return { customer: result.customer };
}

export async function customerLogout(): Promise<CustomerAuthActionResult> {
  const sessionToken = await getCustomerSessionToken();
  await logoutCustomer(sessionToken);
  await clearCustomerSession();
  revalidatePath("/", "layout");
  revalidatePath("/account");
  return {};
}

export type CustomerProfileActionResult = {
  error?: string;
  customer?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
  };
};

export async function customerUpdateProfile(
  formData: FormData,
): Promise<CustomerProfileActionResult> {
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: "Daxil olmaq tələb olunur" };
  }

  const firstName = authField(formData, "firstName");
  const lastName = authField(formData, "lastName");
  const phone = authField(formData, "phone");

  if (firstName === undefined || lastName === undefined) {
    return { error: "Ad və soyad tələb olunur" };
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return { error: "Ad və soyad ən azı 2 simvol olmalıdır" };
  }

  const result = await updateCustomerProfile(sessionToken, {
    firstName,
    lastName,
    ...(phone === undefined ? {} : { phone }),
  });
  if (!result.ok) {
    return { error: result.message };
  }

  await setCustomerSession({
    sessionToken,
    customer: result.data,
  });
  revalidatePath("/account");
  revalidatePath("/", "layout");
  return { customer: result.data };
}

export type CustomerAddressActionResult = {
  error?: string;
  success?: boolean;
};

function readAddressInput(formData: FormData): CustomerAddressInput | { error: string } {
  const recipientName = authField(formData, "recipientName");
  const phone = authField(formData, "phone");
  const addressLine = authField(formData, "addressLine");
  const administrativeArea = authField(formData, "administrativeArea");
  const label = authField(formData, "label");
  const notes = authField(formData, "notes");
  const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

  if (addressLine === undefined) {
    return { error: "Ünvan tələb olunur" };
  }
  if (recipientName === undefined || recipientName.length < 2) {
    return {
      error:
        "Ünvan əlavə etmək üçün şəxsi məlumatlarda ad və soyadınızı yazın",
    };
  }
  if (phone === undefined || phone.length < 7) {
    return {
      error:
        "Ünvan əlavə etmək üçün şəxsi məlumatlarda telefon nömrənizi yazın",
    };
  }
  if (addressLine.length < 5) {
    return { error: "Ünvan ən azı 5 simvol olmalıdır" };
  }

  return {
    recipientName,
    phone,
    addressLine,
    ...(label === undefined ? {} : { label }),
    ...(administrativeArea === undefined ? {} : { administrativeArea }),
    ...(notes === undefined ? {} : { notes }),
    isDefault,
  };
}

export async function customerCreateAddress(
  formData: FormData,
): Promise<CustomerAddressActionResult> {
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: "Daxil olmaq tələb olunur" };
  }

  const input = readAddressInput(formData);
  if ("error" in input) {
    return { error: input.error };
  }

  const result = await createCustomerAddress(sessionToken, input);
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function customerUpdateAddress(
  formData: FormData,
): Promise<CustomerAddressActionResult> {
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: "Daxil olmaq tələb olunur" };
  }

  const addressId = authField(formData, "addressId");
  if (addressId === undefined) {
    return { error: "Ünvan tapılmadı" };
  }

  const input = readAddressInput(formData);
  if ("error" in input) {
    return { error: input.error };
  }

  const result = await updateCustomerAddress(sessionToken, addressId, input);
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function customerDeleteAddress(
  formData: FormData,
): Promise<CustomerAddressActionResult> {
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: "Daxil olmaq tələb olunur" };
  }

  const addressId = authField(formData, "addressId");
  if (addressId === undefined) {
    return { error: "Ünvan tapılmadı" };
  }

  const result = await deleteCustomerAddress(sessionToken, addressId);
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export type CustomerOrderActionResult = {
  error?: string;
  success?: boolean;
  review?: {
    id: string;
    orderItemId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  };
};

export async function customerCancelOrder(
  formData: FormData,
): Promise<CustomerOrderActionResult> {
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: "Daxil olmaq tələb olunur" };
  }

  const orderId = authField(formData, "orderId");
  if (orderId === undefined) {
    return { error: "Sifariş tapılmadı" };
  }

  const reason = authField(formData, "reason")?.trim();
  if (
    reason === undefined ||
    reason.length < ORDER_CANCEL_REASON_MIN_LENGTH ||
    reason.length > ORDER_CANCEL_REASON_MAX_LENGTH
  ) {
    return { error: "Ləğv səbəbini qeyd edin" };
  }

  const result = await cancelCustomerOrder(sessionToken, orderId, reason);
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/account");
  return { success: true };
}

export async function customerCreateProductReview(
  formData: FormData,
): Promise<CustomerOrderActionResult> {
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: "Daxil olmaq tələb olunur" };
  }

  const orderId = authField(formData, "orderId");
  const orderItemId = authField(formData, "orderItemId");
  const productSlug = authField(formData, "productSlug");
  const ratingRaw = authField(formData, "rating");
  const comment = authField(formData, "comment")?.trim();

  if (orderId === undefined || orderItemId === undefined) {
    return { error: "Sifariş məhsulu tapılmadı" };
  }

  const rating = ratingRaw === undefined ? Number.NaN : Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Reytinq 1–5 arasında olmalıdır" };
  }

  const result = await createCustomerProductReview(
    sessionToken,
    orderId,
    orderItemId,
    {
      rating,
      ...(comment === undefined || comment === "" ? {} : { comment }),
    },
  );
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/account");
  if (productSlug !== undefined) {
    revalidatePath(`/products/${productSlug}`);
  }
  revalidatePath("/", "layout");
  return {
    success: true,
    review: {
      id: result.data.id,
      orderItemId: result.data.orderItemId,
      rating: result.data.rating,
      comment: result.data.comment,
      createdAt: result.data.createdAt,
    },
  };
}

export type ForgotPasswordActionResult = {
  error?: string;
  accepted?: boolean;
  devResetUrl?: string;
};

export async function customerForgotPassword(
  formData: FormData,
): Promise<ForgotPasswordActionResult> {
  const email = authField(formData, "email")?.toLowerCase();
  if (email === undefined) {
    return { error: "E-poçt tələb olunur" };
  }

  const result = await requestPasswordReset(email);
  if (!result.ok) {
    return { error: "Sorğu göndərilə bilmədi. Bir az sonra yenidən cəhd edin." };
  }

  return { accepted: true, devResetUrl: result.devResetUrl };
}

export type ResetPasswordActionResult = {
  error?: string;
  reset?: boolean;
};

export async function customerResetPassword(
  formData: FormData,
): Promise<ResetPasswordActionResult> {
  const token = authField(formData, "token");
  const password = authField(formData, "password");
  if (token === undefined || password === undefined) {
    return { error: "Bərpa məlumatları natamamdır" };
  }
  if (password.length < 8) {
    return { error: "Şifrə ən azı 8 simvol olmalıdır" };
  }

  const result = await resetCustomerPassword(token, password);
  if (!result.ok) {
    return { error: "Bərpa linki etibarsızdır və ya vaxtı keçib" };
  }

  return { reset: true };
}

export async function getCartCompleteBarSummary(
  cartId?: string,
): Promise<CartCompleteBarSummary | null> {
  const session = await getGuestCartSession();
  const resolvedCartId = cartId ?? session.cartId;
  if (resolvedCartId === undefined) return null;

  try {
    const cart = await getCart(resolvedCartId);
    if (cart.status !== "ACTIVE" || cart.items.length === 0) {
      return null;
    }

    return {
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.subtotal,
      items: cart.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        image: item.image,
      })),
    };
  } catch {
    return null;
  }
}

export async function addToCart(formData: FormData) {
  await upsertCartLineFromForm(formData);
  revalidatePath("/", "layout");
  revalidatePath("/cart");
}

export async function buyNow(formData: FormData) {
  const cartId = await upsertCartLineFromForm(formData);
  redirect(`/cart?cartId=${encodeURIComponent(cartId)}`);
}

export async function updateCartQuantity(formData: FormData) {
  const cartId = text(formData, "cartId");
  const variantId = text(formData, "variantId");
  const quantity = Number(text(formData, "quantity") ?? "0");
  if (cartId === undefined || variantId === undefined) {
    throw new Error("Səbət sətri tapılmadı");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error("Miqdar ən azı 1 olmalıdır");
  }
  try {
    await upsertCartItem({ cartId, variantId, quantity });
  } catch (error) {
    rethrowCartStockError(error);
  }
  revalidatePath("/cart");
}

export async function removeCartLine(formData: FormData) {
  const cartId = text(formData, "cartId");
  const variantId = text(formData, "variantId");
  if (cartId === undefined || variantId === undefined) {
    throw new Error("Səbət sətri tapılmadı");
  }
  await removeCartItem({ cartId, variantId });
  revalidatePath("/cart");
}

export async function checkoutCash(formData: FormData) {
  const cartId = text(formData, "cartId");
  const fulfillmentType = text(formData, "fulfillmentType");
  if (cartId === undefined) throw new Error("Səbət tapılmadı");
  if (fulfillmentType !== "DELIVERY" && fulfillmentType !== "PICKUP") {
    throw new Error("Fulfillment seçimi düzgün deyil");
  }
  const deliveryZoneId = text(formData, "deliveryZoneId");
  const pickupLocationId = text(formData, "pickupLocationId");
  if (fulfillmentType === "DELIVERY" && deliveryZoneId === undefined) {
    throw new Error("Çatdırılma zonası seçilməyib");
  }
  if (fulfillmentType === "PICKUP" && pickupLocationId === undefined) {
    throw new Error("Pickup məntəqəsi seçilməyib");
  }
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken !== undefined) {
    await attachCustomerCart(sessionToken, cartId);
  }
  const recipientName =
    text(formData, "recipientName") ??
    [text(formData, "firstName"), text(formData, "lastName")]
      .filter(Boolean)
      .join(" ");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const administrativeArea = text(formData, "administrativeArea");
  const addressLine = text(formData, "addressLine");
  if (recipientName.trim().length < 2) {
    throw new Error("Ad və soyad düzgün deyil");
  }
  if (phone === undefined) {
    throw new Error("Telefon nömrəsi düzgün deyil");
  }
  if (email === undefined) {
    throw new Error("E-poçt düzgün deyil");
  }
  if (fulfillmentType === "DELIVERY" && administrativeArea === undefined) {
    throw new Error("Şəhər / Rayon seçilməyib");
  }
  if (
    fulfillmentType === "DELIVERY" &&
    administrativeArea?.trim().toLowerCase() === "baku"
  ) {
    throw new Error("Rayon seçilməyib");
  }
  if (fulfillmentType === "DELIVERY" && addressLine === undefined) {
    throw new Error("Ünvan tələb olunur");
  }
  if (
    fulfillmentType === "DELIVERY" &&
    addressLine !== undefined &&
    addressLine.length < 5
  ) {
    throw new Error("Ünvan ən azı 5 simvol olmalıdır");
  }
  const deliverySpeed = readDeliverySpeed(formData, fulfillmentType);
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  const paymentMethod = text(formData, "paymentMethod");
  const installmentMonths = integer(formData, "installmentMonths");
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error("Taksit ayı seçilməyib");
  }
  let order;
  try {
    order = await createCashOrder({
      cartId,
      fulfillmentType,
      ...(fulfillmentType === "DELIVERY" ? { deliveryZoneId } : {}),
      ...(fulfillmentType === "PICKUP" ? { pickupLocationId } : {}),
      recipientName: recipientName.trim(),
      phone,
      email,
      ...(administrativeArea === undefined ? {} : { administrativeArea }),
      ...(addressLine === undefined ? {} : { addressLine }),
      notes: mergeCheckoutNotes(
        text(formData, "notes"),
        text(formData, "initialPayment"),
        deliverySpeed,
      ),
      ...(paymentMethod === "INSTALLMENT"
        ? { paymentMethod: "INSTALLMENT" as const, installmentMonths }
        : {}),
      idempotencyKey,
    });
  } catch (error) {
    rethrowCartStockError(error);
  }
  await clearGuestCartId();
  redirect(
    `/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}${
      paymentMethod === "INSTALLMENT" ? "&review=1" : ""
    }`,
  );
}

export async function checkoutOnline(formData: FormData) {
  const cartId = text(formData, "cartId");
  const fulfillmentType = text(formData, "fulfillmentType");
  const paymentMethod = text(formData, "paymentMethod");
  if (cartId === undefined) throw new Error("Səbət tapılmadı");
  if (fulfillmentType !== "DELIVERY" && fulfillmentType !== "PICKUP") {
    throw new Error("Fulfillment seçimi düzgün deyil");
  }
  if (paymentMethod !== "CARD" && paymentMethod !== "INSTALLMENT") {
    throw new Error("Online ödəniş növü düzgün deyil");
  }
  const deliveryZoneId = text(formData, "deliveryZoneId");
  const pickupLocationId = text(formData, "pickupLocationId");
  if (fulfillmentType === "DELIVERY" && deliveryZoneId === undefined) {
    throw new Error("Çatdırılma zonası seçilməyib");
  }
  if (fulfillmentType === "PICKUP" && pickupLocationId === undefined) {
    throw new Error("Pickup məntəqəsi seçilməyib");
  }
  const installmentMonths = integer(formData, "installmentMonths");
  const installmentProvider = parseInstallmentProvider(
    text(formData, "installmentProvider"),
  );
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error("Taksit ayı seçilməyib");
  }
  if (paymentMethod === "INSTALLMENT" && installmentProvider === undefined) {
    throw new Error("Taksit kartı seçilməyib");
  }
  const recipientName =
    text(formData, "recipientName") ??
    [text(formData, "firstName"), text(formData, "lastName")]
      .filter(Boolean)
      .join(" ");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const administrativeArea = text(formData, "administrativeArea");
  const addressLine = text(formData, "addressLine");
  if (recipientName.trim().length < 2) {
    throw new Error("Ad və soyad düzgün deyil");
  }
  if (phone === undefined) {
    throw new Error("Telefon nömrəsi düzgün deyil");
  }
  if (email === undefined) {
    throw new Error("E-poçt düzgün deyil");
  }
  if (fulfillmentType === "DELIVERY" && administrativeArea === undefined) {
    throw new Error("Şəhər / Rayon seçilməyib");
  }
  if (
    fulfillmentType === "DELIVERY" &&
    administrativeArea?.trim().toLowerCase() === "baku"
  ) {
    throw new Error("Rayon seçilməyib");
  }
  if (fulfillmentType === "DELIVERY" && addressLine === undefined) {
    throw new Error("Ünvan tələb olunur");
  }
  if (
    fulfillmentType === "DELIVERY" &&
    addressLine !== undefined &&
    addressLine.length < 5
  ) {
    throw new Error("Ünvan ən azı 5 simvol olmalıdır");
  }
  const deliverySpeed = readDeliverySpeed(formData, fulfillmentType);
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken !== undefined) {
    await attachCustomerCart(sessionToken, cartId);
  }
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  let order;
  try {
    order = await createOnlineOrder({
      cartId,
      fulfillmentType,
      ...(fulfillmentType === "DELIVERY" ? { deliveryZoneId } : {}),
      ...(fulfillmentType === "PICKUP" ? { pickupLocationId } : {}),
      recipientName: recipientName.trim(),
      phone,
      email,
      ...(administrativeArea === undefined ? {} : { administrativeArea }),
      ...(addressLine === undefined ? {} : { addressLine }),
      notes: mergeCheckoutNotes(
        text(formData, "notes"),
        text(formData, "initialPayment"),
        deliverySpeed,
      ),
      paymentMethod,
      ...(paymentMethod === "INSTALLMENT" && installmentMonths !== undefined
        ? { installmentMonths }
        : {}),
      ...(paymentMethod === "INSTALLMENT" && installmentProvider !== undefined
        ? { installmentProvider }
        : {}),
      idempotencyKey,
    });
  } catch (error) {
    rethrowCartStockError(error);
  }
  await clearGuestCartId();
  redirect(order.checkoutUrl);
}

export async function continuePaymentAction(formData: FormData) {
  const attemptToken = text(formData, "attemptToken");
  const orderNumber = text(formData, "orderNumber");
  const action = text(formData, "action");
  if (attemptToken === undefined || orderNumber === undefined) {
    throw new Error("Ödəniş sessiyası tapılmadı");
  }
  if (action !== "proceed" && action !== "cancel") {
    throw new Error("Ödəniş əməliyyatı düzgün deyil");
  }
  const result = await continuePayment({ attemptToken, action });
  redirect(result.nextUrl);
}

export type CreditApplicationActionResult = {
  error?: string;
  success?: boolean;
};

export async function submitProductCreditApplication(
  formData: FormData,
): Promise<CreditApplicationActionResult> {
  const finCode = text(formData, "finCode")?.toUpperCase();
  const phone = text(formData, "phone");
  const productId = text(formData, "productId");
  const variantId = text(formData, "variantId");
  const quantity = integer(formData, "quantity");
  const cartId = text(formData, "cartId");

  if (finCode === undefined || !/^[A-Z0-9]{7}$/.test(finCode)) {
    return { error: "FIN kod 7 simvoldan ibarət olmalıdır" };
  }
  if (phone === undefined || phone.length < 7) {
    return { error: "Telefon nömrəsi düzgün deyil" };
  }
  if (productId === undefined || variantId === undefined) {
    return { error: "Məhsul seçimi tapılmadı" };
  }
  if (quantity === undefined || quantity < 1) {
    return { error: "Miqdar düzgün deyil" };
  }

  try {
    await submitCreditApplication({
      finCode,
      phone,
      productId,
      variantId,
      quantity,
      ...(cartId === undefined ? {} : { cartId }),
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : "Kredit müraciəti göndərilə bilmədi";
    return { error: message };
  }
}

export type ProductAvailabilityRequestActionResult = {
  error?: string;
  success?: boolean;
  duplicate?: boolean;
};

export async function submitProductAvailabilityRequest(
  formData: FormData,
): Promise<ProductAvailabilityRequestActionResult> {
  const type = text(formData, "type");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const productId = text(formData, "productId");
  const variantId = text(formData, "variantId");

  if (type !== "STOCK_ALERT" && type !== "PREORDER") {
    return { error: "Sorğu növü düzgün deyil" };
  }
  if (firstName === undefined || firstName.length < 2) {
    return { error: "Ad ən azı 2 simvol olmalıdır" };
  }
  if (lastName === undefined || lastName.length < 2) {
    return { error: "Soyad ən azı 2 simvol olmalıdır" };
  }
  if (phone === undefined || phone.length < 7) {
    return { error: "Telefon nömrəsi düzgün deyil" };
  }
  if (productId === undefined || variantId === undefined) {
    return { error: "Məhsul seçimi tapılmadı" };
  }

  const customer = await getCustomerProfile();

  try {
    const result = await submitProductAvailabilityRequestApi({
      type,
      phone,
      productId,
      variantId,
      firstName,
      lastName,
      ...(email === undefined ? {} : { email }),
      ...(customer === null ? {} : { customerId: customer.id }),
    });
    return {
      success: true,
      duplicate: result.duplicate === true,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : "Sorğu göndərilə bilmədi";
    return { error: message };
  }
}
