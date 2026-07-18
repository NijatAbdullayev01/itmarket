"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
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

function mergeCheckoutNotes(
  notes: string | undefined,
  initialPayment: string | undefined,
  deliverySchedule?: { date: string; time: string },
  deliverySpeed?: "STANDARD" | "EXPRESS",
): string | undefined {
  const parts = [
    notes,
    deliverySchedule
      ? `Çatdırılma: ${formatDeliveryScheduleNote(deliverySchedule.date, deliverySchedule.time)}`
      : undefined,
    deliverySpeed
      ? `Çatdırılma növü: ${deliverySpeed === "EXPRESS" ? "Təcili" : "Standart"}`
      : undefined,
    initialPayment ? `İlkin ödəniş: ${initialPayment} AZN` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : undefined;
}

function formatDeliveryScheduleNote(date: string, time: string) {
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) {
    return `${date}, saat ${time}`;
  }
  return `${day}.${month}.${year}, saat ${time}`;
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

function readDeliverySchedule(
  formData: FormData,
  fulfillmentType: string | undefined,
): { date: string; time: string } | undefined {
  if (fulfillmentType !== "DELIVERY") return undefined;

  const date = text(formData, "deliveryDate");
  const time = text(formData, "deliveryTime");
  if (date === undefined) {
    throw new Error("Çatdırılma tarixi tələb olunur");
  }
  if (time === undefined) {
    throw new Error("Çatdırılma saatı tələb olunur");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Çatdırılma tarixi düzgün deyil");
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("Çatdırılma saatı düzgün deyil");
  }

  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error("Çatdırılma tarixi düzgün deyil");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDate < today) {
    throw new Error("Çatdırılma tarixi keçmiş ola bilməz");
  }

  return { date, time };
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
  await upsertCartItem({ cartId, variantId, quantity });
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

  const result = await cancelCustomerOrder(sessionToken, orderId);
  if (!result.ok) {
    return { error: result.message };
  }

  revalidatePath("/account");
  return { success: true };
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
  await upsertCartItem({ cartId, variantId, quantity });
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
    throw new Error("Şəhər / rayon seçilməyib");
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
  const deliverySchedule = readDeliverySchedule(formData, fulfillmentType);
  const deliverySpeed = readDeliverySpeed(formData, fulfillmentType);
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  const paymentMethod = text(formData, "paymentMethod");
  const installmentMonths = integer(formData, "installmentMonths");
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error("Taksit ayı seçilməyib");
  }
  const order = await createCashOrder({
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
      deliverySchedule,
      deliverySpeed,
    ),
    ...(paymentMethod === "INSTALLMENT"
      ? { paymentMethod: "INSTALLMENT" as const, installmentMonths }
      : {}),
    idempotencyKey,
  });
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
  const installmentProvider = text(formData, "installmentProvider");
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error("Taksit ayı seçilməyib");
  }
  if (
    paymentMethod === "INSTALLMENT" &&
    (installmentProvider === undefined ||
      (installmentProvider !== "birbank" &&
        installmentProvider !== "tamkart" &&
        installmentProvider !== "leobank"))
  ) {
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
    throw new Error("Şəhər / rayon seçilməyib");
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
  const deliverySchedule = readDeliverySchedule(formData, fulfillmentType);
  const deliverySpeed = readDeliverySpeed(formData, fulfillmentType);
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken !== undefined) {
    await attachCustomerCart(sessionToken, cartId);
  }
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  const order = await createOnlineOrder({
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
      deliverySchedule,
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
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const productId = text(formData, "productId");
  const variantId = text(formData, "variantId");

  if (type !== "STOCK_ALERT" && type !== "PREORDER") {
    return { error: "Sorğu növü düzgün deyil" };
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
