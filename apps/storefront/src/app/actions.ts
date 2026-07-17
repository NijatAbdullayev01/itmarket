"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  removeCartItem,
  completeMockPayment,
  createCart,
  createCashOrder,
  createOnlineOrder,
  submitCreditApplication,
  submitProductAvailabilityRequest as submitProductAvailabilityRequestApi,
  upsertCartItem,
} from "@/lib/api";
import {
  attachCustomerCart,
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
  clearCheckoutIdempotencyKey,
  clearGuestCartId,
  getCheckoutIdempotencyKey,
  getGuestCartSession,
  setGuestCartSession,
} from "@/lib/cart-session";

function text(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
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
): string | undefined {
  const parts = [
    notes,
    initialPayment ? `İlkin ödəniş: ${initialPayment} AZN` : undefined,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join("\n") : undefined;
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
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  const order = await createCashOrder({
    cartId,
    fulfillmentType,
    ...(fulfillmentType === "DELIVERY" ? { deliveryZoneId } : {}),
    ...(fulfillmentType === "PICKUP" ? { pickupLocationId } : {}),
    recipientName: text(formData, "recipientName") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email") ?? "",
    administrativeArea: text(formData, "administrativeArea"),
    addressLine: text(formData, "addressLine") ?? "",
    notes: mergeCheckoutNotes(
      text(formData, "notes"),
      text(formData, "initialPayment"),
    ),
    idempotencyKey,
  });
  await clearCheckoutIdempotencyKey(cartId);
  await clearGuestCartId();
  redirect(
    `/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`,
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
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error("Taksit ayı seçilməyib");
  }
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
    recipientName: text(formData, "recipientName") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email") ?? "",
    administrativeArea: text(formData, "administrativeArea"),
    addressLine: text(formData, "addressLine") ?? "",
    notes: mergeCheckoutNotes(
      text(formData, "notes"),
      text(formData, "initialPayment"),
    ),
    paymentMethod,
    ...(paymentMethod === "INSTALLMENT" && installmentMonths !== undefined
      ? { installmentMonths }
      : {}),
    idempotencyKey,
  });
  await clearCheckoutIdempotencyKey(cartId);
  await clearGuestCartId();
  redirect(order.checkoutUrl);
}

export async function completeMockPaymentAction(formData: FormData) {
  const attemptToken = text(formData, "attemptToken");
  const scenario = text(formData, "scenario");
  const orderNumber = text(formData, "orderNumber");
  if (attemptToken === undefined || orderNumber === undefined) {
    throw new Error("Mock payment sessiyası tapılmadı");
  }
  if (
    scenario !== "success" &&
    scenario !== "failure" &&
    scenario !== "cancel" &&
    scenario !== "timeout"
  ) {
    throw new Error("Mock payment ssenarisi düzgün deyil");
  }
  await completeMockPayment({ attemptToken, scenario });
  redirect(`/checkout/status?orderNumber=${encodeURIComponent(orderNumber)}`);
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
