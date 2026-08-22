"use server";

import { ORDER_CANCEL_REASON_MAX_LENGTH, ORDER_CANCEL_REASON_MIN_LENGTH } from "@itmarket/contracts";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
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
import { getMessages, formatMessage, type StorefrontMessages } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/get-locale";

async function getActionMessages(): Promise<StorefrontMessages> {
  const locale = await getRequestLocale();
  return getMessages(locale);
}

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
  deliverySpeed: "STANDARD" | "EXPRESS" | undefined,
  messages: StorefrontMessages,
): string | undefined {
  const parts = [
    notes,
    deliverySpeed
      ? formatMessage(messages.checkout.orderNoteDeliverySpeed, {
          speed:
            deliverySpeed === "EXPRESS"
              ? messages.checkoutWizard.speedExpress
              : messages.checkoutWizard.speedStandard,
        })
      : undefined,
    initialPayment
      ? formatMessage(messages.checkout.orderNoteInitialPayment, {
          amount: initialPayment,
        })
      : undefined,
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

function rethrowCartStockError(
  error: unknown,
  messages?: StorefrontMessages,
): never {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.message.toLowerCase().includes("insufficient available stock")
  ) {
    throw new Error(messages?.cart.stockError ?? "Kifayət qədər stok yoxdur.");
  }
  throw error;
}

async function upsertCartLineFromForm(formData: FormData) {
  const messages = await getActionMessages();
  const variantId = text(formData, "variantId");
  if (variantId === undefined) throw new Error(messages.cart.lineNotFound);
  const quantity = Number(text(formData, "quantity") ?? "1");
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(messages.cart.minQuantity);
  }
  const session = await getGuestCartSession();
  const existingCartId = text(formData, "cartId") ?? session.cartId;
  let cartId = existingCartId;
  let guestToken = session.guestToken;
  if (cartId === undefined) {
    const createdCart = await createCart(session.guestToken);
    cartId = createdCart.id;
    guestToken = createdCart.guestToken;
    await setGuestCartSession({
      cartId: createdCart.id,
      guestToken: createdCart.guestToken,
    });
  } else if (session.cartId !== cartId) {
    await setGuestCartSession({ cartId, guestToken: session.guestToken });
  }
  if (guestToken === undefined) {
    throw new Error(messages.cart.sessionNotFound);
  }
  try {
    await upsertCartItem({ cartId, guestToken, variantId, quantity });
  } catch (error) {
    rethrowCartStockError(error, messages);
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
  if (session.cartId === undefined || session.guestToken === undefined) return;
  const attached = await attachCustomerCart(
    sessionToken,
    session.cartId,
    session.guestToken,
  );
  if (attached?.guestToken !== undefined) {
    await setGuestCartSession({
      cartId: session.cartId,
      guestToken: attached.guestToken,
    });
  }
}

/** Attach cart and return the post-rotation guest token for checkout. */
async function attachCartForCheckout(
  sessionToken: string,
  cartId: string,
  guestToken: string,
): Promise<string> {
  const attached = await attachCustomerCart(sessionToken, cartId, guestToken);
  if (attached?.guestToken !== undefined) {
    await setGuestCartSession({ cartId, guestToken: attached.guestToken });
    return attached.guestToken;
  }
  return guestToken;
}

export async function customerLogin(
  formData: FormData,
): Promise<CustomerAuthActionResult> {
  const messages = await getActionMessages();
  const email = authField(formData, "email")?.toLowerCase();
  const password = authField(formData, "password");
  if (email === undefined || password === undefined) {
    return { error: messages.account.credentialsInvalid };
  }

  const result = await loginCustomer(email, password);
  if (!result.ok) {
    return { error: messages.account.credentialsInvalid };
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
  const messages = await getActionMessages();
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
    return { error: messages.account.allFieldsRequired };
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return { error: messages.account.nameMinLength };
  }
  if (password.length < 12) {
    return { error: messages.account.passwordMinLength };
  }
  if (password !== passwordConfirm) {
    return { error: messages.account.passwordMismatch };
  }

  const result = await registerCustomer({
    email,
    firstName,
    lastName,
    password,
    passwordConfirm,
  });
  if (!result.ok) {
    return { error: messages.account.registrationFailed };
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
  const messages = await getActionMessages();
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: messages.common.unauthorized };
  }

  const firstName = authField(formData, "firstName");
  const lastName = authField(formData, "lastName");
  const phone = authField(formData, "phone");

  if (firstName === undefined || lastName === undefined) {
    return { error: messages.accountDashboard.profileNameRequired };
  }
  if (firstName.length < 2 || lastName.length < 2) {
    return { error: messages.accountDashboard.profileNameMinLength };
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

function readAddressInput(formData: FormData, messages: StorefrontMessages): CustomerAddressInput | { error: string } {
  const recipientName = authField(formData, "recipientName");
  const phone = authField(formData, "phone");
  const addressLine = authField(formData, "addressLine");
  const administrativeArea = authField(formData, "administrativeArea");
  const label = authField(formData, "label");
  const notes = authField(formData, "notes");
  const isDefault = formData.get("isDefault") === "on" || formData.get("isDefault") === "true";

  if (addressLine === undefined) {
    return { error: messages.accountDashboard.addressRequired };
  }
  if (recipientName === undefined || recipientName.length < 2) {
    return {
      error: messages.accountDashboard.addressRecipientRequired,
    };
  }
  if (phone === undefined || phone.length < 7) {
    return {
      error: messages.accountDashboard.addressPhoneRequired,
    };
  }
  if (addressLine.length < 5) {
    return { error: messages.accountDashboard.addressMinLength };
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
  const messages = await getActionMessages();
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: messages.common.unauthorized };
  }

  const input = readAddressInput(formData, messages);
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
  const messages = await getActionMessages();
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: messages.common.unauthorized };
  }

  const addressId = authField(formData, "addressId");
  if (addressId === undefined) {
    return { error: messages.accountDashboard.addressNotFound };
  }

  const input = readAddressInput(formData, messages);
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
  const messages = await getActionMessages();
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: messages.common.unauthorized };
  }

  const addressId = authField(formData, "addressId");
  if (addressId === undefined) {
    return { error: messages.accountDashboard.addressNotFound };
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
  const messages = await getActionMessages();
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: messages.common.unauthorized };
  }

  const orderId = authField(formData, "orderId");
  if (orderId === undefined) {
    return { error: messages.accountDashboard.cancelOrderNotFound };
  }

  const reason = authField(formData, "reason")?.trim();
  if (
    reason === undefined ||
    reason.length < ORDER_CANCEL_REASON_MIN_LENGTH ||
    reason.length > ORDER_CANCEL_REASON_MAX_LENGTH
  ) {
    return { error: messages.accountDashboard.cancelOrderReasonRequired };
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
  const messages = await getActionMessages();
  const sessionToken = await getCustomerSessionToken();
  if (sessionToken === undefined) {
    return { error: messages.common.unauthorized };
  }

  const orderId = authField(formData, "orderId");
  const orderItemId = authField(formData, "orderItemId");
  const productSlug = authField(formData, "productSlug");
  const ratingRaw = authField(formData, "rating");
  const comment = authField(formData, "comment")?.trim();

  if (orderId === undefined || orderItemId === undefined) {
    return { error: messages.accountDashboard.reviewProductNotFound };
  }

  const rating = ratingRaw === undefined ? Number.NaN : Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: messages.accountDashboard.reviewRatingRange };
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
  const messages = await getActionMessages();
  const email = authField(formData, "email")?.toLowerCase();
  if (email === undefined) {
    return { error: messages.account.emailRequired };
  }

  const result = await requestPasswordReset(email);
  if (!result.ok) {
    return { error: messages.account.requestFailedTryLater };
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
  const messages = await getActionMessages();
  const token = authField(formData, "token");
  const password = authField(formData, "password");
  if (token === undefined || password === undefined) {
    return { error: messages.account.resetIncomplete };
  }
  if (password.length < 12) {
    return { error: messages.account.passwordMinLength };
  }

  const result = await resetCustomerPassword(token, password);
  if (!result.ok) {
    return { error: messages.account.resetInvalidLink };
  }

  return { reset: true };
}

export async function getCartCompleteBarSummary(
  cartId?: string,
): Promise<CartCompleteBarSummary | null> {
  const session = await getGuestCartSession();
  const resolvedCartId = cartId ?? session.cartId;
  if (resolvedCartId === undefined || session.guestToken === undefined) {
    return null;
  }

  try {
    const cart = await getCart(resolvedCartId, session.guestToken);
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
  const messages = await getActionMessages();
  const cartId = text(formData, "cartId");
  const variantId = text(formData, "variantId");
  const quantity = Number(text(formData, "quantity") ?? "0");
  if (cartId === undefined || variantId === undefined) {
    throw new Error(messages.cart.lineNotFound);
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1) {
    throw new Error(messages.cart.minQuantity);
  }
  const session = await getGuestCartSession();
  if (session.guestToken === undefined) {
    throw new Error(messages.cart.sessionNotFound);
  }
  try {
    await upsertCartItem({
      cartId,
      guestToken: session.guestToken,
      variantId,
      quantity,
    });
  } catch (error) {
    rethrowCartStockError(error, messages);
  }
  revalidatePath("/cart");
}

export async function removeCartLine(formData: FormData) {
  const messages = await getActionMessages();
  const cartId = text(formData, "cartId");
  const variantId = text(formData, "variantId");
  if (cartId === undefined || variantId === undefined) {
    throw new Error(messages.cart.lineNotFound);
  }
  const session = await getGuestCartSession();
  if (session.guestToken === undefined) {
    throw new Error(messages.cart.sessionNotFound);
  }
  await removeCartItem({
    cartId,
    guestToken: session.guestToken,
    variantId,
  });
  revalidatePath("/cart");
}

export async function checkoutCash(formData: FormData) {
  const messages = await getActionMessages();
  const cartId = text(formData, "cartId");
  const fulfillmentType = text(formData, "fulfillmentType");
  if (cartId === undefined) throw new Error(messages.checkout.cartNotFound);
  if (fulfillmentType !== "DELIVERY" && fulfillmentType !== "PICKUP") {
    throw new Error(messages.checkout.invalidFulfillment);
  }
  const deliveryZoneId = text(formData, "deliveryZoneId");
  const pickupLocationId = text(formData, "pickupLocationId");
  if (fulfillmentType === "DELIVERY" && deliveryZoneId === undefined) {
    throw new Error(messages.checkout.deliveryZoneRequired);
  }
  if (fulfillmentType === "PICKUP" && pickupLocationId === undefined) {
    throw new Error(messages.checkout.pickupLocationRequired);
  }
  const sessionToken = await getCustomerSessionToken();
  const guestCart = await getGuestCartSession();
  let guestToken = guestCart.guestToken;
  if (sessionToken !== undefined && guestToken !== undefined) {
    guestToken = await attachCartForCheckout(sessionToken, cartId, guestToken);
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
    throw new Error(messages.checkout.recipientNameInvalid);
  }
  if (phone === undefined) {
    throw new Error(messages.checkout.phoneInvalid);
  }
  if (email === undefined) {
    throw new Error(messages.checkout.emailInvalid);
  }
  if (fulfillmentType === "DELIVERY" && administrativeArea === undefined) {
    throw new Error(messages.checkout.areaRequired);
  }
  if (
    fulfillmentType === "DELIVERY" &&
    administrativeArea?.trim().toLowerCase() === "baku"
  ) {
    throw new Error(messages.checkout.districtRequired);
  }
  if (fulfillmentType === "DELIVERY" && addressLine === undefined) {
    throw new Error(messages.checkout.addressRequired);
  }
  if (
    fulfillmentType === "DELIVERY" &&
    addressLine !== undefined &&
    addressLine.length < 5
  ) {
    throw new Error(messages.checkout.addressMinLength);
  }
  const deliverySpeed = readDeliverySpeed(formData, fulfillmentType);
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  const paymentMethod = text(formData, "paymentMethod");
  const installmentMonths = integer(formData, "installmentMonths");
  if (
    fulfillmentType === "DELIVERY" &&
    paymentMethod !== "INSTALLMENT"
  ) {
    throw new Error(messages.checkout.noCashOnDelivery);
  }
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error(messages.checkout.installmentMonthsRequired);
  }
  const finCodeRaw = text(formData, "finCode")?.toUpperCase();
  const finCode =
    finCodeRaw !== undefined && /^[A-Z0-9]{7}$/.test(finCodeRaw)
      ? finCodeRaw
      : undefined;
  if (paymentMethod === "INSTALLMENT" && finCode === undefined) {
    throw new Error(messages.checkout.finCodeInvalid);
  }
  if (guestToken === undefined) {
    throw new Error(messages.cart.sessionNotFound);
  }
  let order;
  try {
    order = await createCashOrder({
      cartId,
      guestToken,
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
        messages,
      ),
      ...(paymentMethod === "INSTALLMENT"
        ? {
            paymentMethod: "INSTALLMENT" as const,
            installmentMonths,
            ...(finCode === undefined ? {} : { finCode }),
          }
        : {}),
      idempotencyKey,
    });
  } catch (error) {
    rethrowCartStockError(error, messages);
  }
  await clearGuestCartId();
  redirect(
    `/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}${
      paymentMethod === "INSTALLMENT" ? "&review=1" : ""
    }`,
  );
}

export async function checkoutOnline(formData: FormData) {
  const messages = await getActionMessages();
  const cartId = text(formData, "cartId");
  const fulfillmentType = text(formData, "fulfillmentType");
  const paymentMethod = text(formData, "paymentMethod");
  if (cartId === undefined) throw new Error(messages.checkout.cartNotFound);
  if (fulfillmentType !== "DELIVERY" && fulfillmentType !== "PICKUP") {
    throw new Error(messages.checkout.invalidFulfillment);
  }
  if (paymentMethod !== "CARD" && paymentMethod !== "INSTALLMENT") {
    throw new Error(messages.checkout.invalidOnlinePayment);
  }
  const deliveryZoneId = text(formData, "deliveryZoneId");
  const pickupLocationId = text(formData, "pickupLocationId");
  if (fulfillmentType === "DELIVERY" && deliveryZoneId === undefined) {
    throw new Error(messages.checkout.deliveryZoneRequired);
  }
  if (fulfillmentType === "PICKUP" && pickupLocationId === undefined) {
    throw new Error(messages.checkout.pickupLocationRequired);
  }
  const installmentMonths = integer(formData, "installmentMonths");
  const installmentProvider = parseInstallmentProvider(
    text(formData, "installmentProvider"),
  );
  if (paymentMethod === "INSTALLMENT" && installmentMonths === undefined) {
    throw new Error(messages.checkout.installmentMonthsRequired);
  }
  if (paymentMethod === "INSTALLMENT" && installmentProvider === undefined) {
    throw new Error(messages.checkout.installmentProviderRequired);
  }
  const finCodeRaw = text(formData, "finCode")?.toUpperCase();
  const finCode =
    finCodeRaw !== undefined && /^[A-Z0-9]{7}$/.test(finCodeRaw)
      ? finCodeRaw
      : undefined;
  if (paymentMethod === "INSTALLMENT" && finCode === undefined) {
    throw new Error(messages.checkout.finCodeInvalid);
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
    throw new Error(messages.checkout.recipientNameInvalid);
  }
  if (phone === undefined) {
    throw new Error(messages.checkout.phoneInvalid);
  }
  if (email === undefined) {
    throw new Error(messages.checkout.emailInvalid);
  }
  if (fulfillmentType === "DELIVERY" && administrativeArea === undefined) {
    throw new Error(messages.checkout.areaRequired);
  }
  if (
    fulfillmentType === "DELIVERY" &&
    administrativeArea?.trim().toLowerCase() === "baku"
  ) {
    throw new Error(messages.checkout.districtRequired);
  }
  if (fulfillmentType === "DELIVERY" && addressLine === undefined) {
    throw new Error(messages.checkout.addressRequired);
  }
  if (
    fulfillmentType === "DELIVERY" &&
    addressLine !== undefined &&
    addressLine.length < 5
  ) {
    throw new Error(messages.checkout.addressMinLength);
  }
  const deliverySpeed = readDeliverySpeed(formData, fulfillmentType);
  const sessionToken = await getCustomerSessionToken();
  const idempotencyKey = await getCheckoutIdempotencyKey(cartId);
  const cartSession = await getGuestCartSession();
  if (cartSession.guestToken === undefined) {
    throw new Error(messages.cart.sessionNotFound);
  }
  let guestToken = cartSession.guestToken;
  if (sessionToken !== undefined) {
    guestToken = await attachCartForCheckout(
      sessionToken,
      cartId,
      guestToken,
    );
  }
  let order;
  try {
    order = await createOnlineOrder({
      cartId,
      guestToken,
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
        messages,
      ),
      paymentMethod,
      ...(paymentMethod === "INSTALLMENT" && installmentMonths !== undefined
        ? { installmentMonths }
        : {}),
      ...(paymentMethod === "INSTALLMENT" && installmentProvider !== undefined
        ? { installmentProvider }
        : {}),
      ...(paymentMethod === "INSTALLMENT" && finCode !== undefined
        ? { finCode }
        : {}),
      idempotencyKey,
    });
  } catch (error) {
    rethrowCartStockError(error, messages);
  }
  await clearGuestCartId();
  redirect(order.checkoutUrl);
}

export async function continuePaymentAction(formData: FormData) {
  const messages = await getActionMessages();
  const orderNumber = text(formData, "orderNumber");
  const action = text(formData, "action");
  const cookieStore = await cookies();
  const attemptToken = cookieStore.get("itmarket_payment_attempt_token")?.value;
  if (attemptToken === undefined || orderNumber === undefined) {
    throw new Error(messages.checkout.paySessionNotFound);
  }
  if (action !== "proceed" && action !== "cancel") {
    throw new Error(messages.checkout.payActionInvalid);
  }
  const result = await continuePayment({
    attemptToken,
    action,
    orderNumber,
  });
  cookieStore.set("itmarket_payment_attempt_token", "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/checkout/pay",
    maxAge: 0,
  });
  redirect(result.nextUrl);
}

export type CreditApplicationActionResult = {
  error?: string;
  success?: boolean;
};

export async function submitProductCreditApplication(
  formData: FormData,
): Promise<CreditApplicationActionResult> {
  const messages = await getActionMessages();
  const finCode = text(formData, "finCode")?.toUpperCase();
  const phone = text(formData, "phone");
  const email = text(formData, "email")?.toLowerCase();
  const productId = text(formData, "productId");
  const variantId = text(formData, "variantId");
  const quantity = integer(formData, "quantity");
  const cartId = text(formData, "cartId");

  if (finCode === undefined || !/^[A-Z0-9]{7}$/.test(finCode)) {
    return { error: messages.product.creditApplicationFinInvalid };
  }
  if (phone === undefined || phone.length < 7) {
    return { error: messages.product.creditApplicationPhoneInvalid };
  }
  if (email === undefined || !email.includes("@") || email.length < 5) {
    return { error: messages.product.creditApplicationEmailInvalid };
  }
  if (productId === undefined || variantId === undefined) {
    return { error: messages.product.creditApplicationProductNotFound };
  }
  if (quantity === undefined || quantity < 1) {
    return { error: messages.product.creditApplicationQuantityInvalid };
  }

  try {
    const cartSession = await getGuestCartSession();
    await submitCreditApplication({
      finCode,
      phone,
      email,
      productId,
      variantId,
      quantity,
      ...(cartId === undefined ? {} : { cartId }),
      ...(cartId !== undefined && cartSession.guestToken !== undefined
        ? { guestToken: cartSession.guestToken }
        : {}),
    });
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : messages.product.creditApplicationFailed;
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
  const messages = await getActionMessages();
  const type = text(formData, "type");
  const firstName = text(formData, "firstName");
  const lastName = text(formData, "lastName");
  const phone = text(formData, "phone");
  const email = text(formData, "email");
  const productId = text(formData, "productId");
  const variantId = text(formData, "variantId");

  if (type !== "STOCK_ALERT" && type !== "PREORDER") {
    return { error: messages.product.availabilityTypeInvalid };
  }
  if (firstName === undefined || firstName.length < 2) {
    return { error: messages.product.availabilityFirstNameMin };
  }
  if (lastName === undefined || lastName.length < 2) {
    return { error: messages.product.availabilityLastNameMin };
  }
  if (phone === undefined || phone.length < 7) {
    return { error: messages.product.availabilityPhoneInvalid };
  }
  if (productId === undefined || variantId === undefined) {
    return { error: messages.product.availabilityProductNotFound };
  }

  try {
    const result = await submitProductAvailabilityRequestApi({
      type,
      phone,
      productId,
      variantId,
      firstName,
      lastName,
      ...(email === undefined ? {} : { email }),
    });
    return {
      success: true,
      duplicate: result.duplicate === true,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim() !== ""
        ? error.message
        : messages.product.availabilityFailed;
    return { error: message };
  }
}

