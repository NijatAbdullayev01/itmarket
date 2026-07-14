"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  removeCartItem,
  completeMockPayment,
  createCart,
  createCashOrder,
  createOnlineOrder,
  upsertCartItem,
} from "@/lib/api";
import {
  clearGuestCartId,
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

export async function addToCart(formData: FormData) {
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
  redirect("/cart");
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
  const order = await createCashOrder({
    cartId,
    fulfillmentType,
    ...(fulfillmentType === "DELIVERY" ? { deliveryZoneId } : {}),
    ...(fulfillmentType === "PICKUP" ? { pickupLocationId } : {}),
    recipientName: text(formData, "recipientName") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email"),
    administrativeArea: text(formData, "administrativeArea"),
    addressLine: text(formData, "addressLine") ?? "",
    notes: text(formData, "notes"),
    idempotencyKey: randomUUID(),
  });
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
  const order = await createOnlineOrder({
    cartId,
    fulfillmentType,
    ...(fulfillmentType === "DELIVERY" ? { deliveryZoneId } : {}),
    ...(fulfillmentType === "PICKUP" ? { pickupLocationId } : {}),
    recipientName: text(formData, "recipientName") ?? "",
    phone: text(formData, "phone") ?? "",
    email: text(formData, "email"),
    administrativeArea: text(formData, "administrativeArea"),
    addressLine: text(formData, "addressLine") ?? "",
    notes: text(formData, "notes"),
    paymentMethod,
    ...(paymentMethod === "INSTALLMENT" && installmentMonths !== undefined
      ? { installmentMonths }
      : {}),
    idempotencyKey: randomUUID(),
  });
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
