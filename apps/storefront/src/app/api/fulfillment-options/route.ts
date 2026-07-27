import { NextRequest, NextResponse } from "next/server";

import { getFulfillmentOptions } from "@/lib/api";
import { getGuestCartSession } from "@/lib/cart-session";

export async function GET(request: NextRequest) {
  const cartId = request.nextUrl.searchParams.get("cartId");
  const administrativeArea =
    request.nextUrl.searchParams.get("administrativeArea") ?? undefined;

  if (!cartId) {
    return NextResponse.json(
      { message: "cartId query param is required" },
      { status: 400 },
    );
  }

  const session = await getGuestCartSession();
  if (session.guestToken === undefined) {
    return NextResponse.json(
      { message: "Cart guest session is required" },
      { status: 400 },
    );
  }

  try {
    const fulfillment = await getFulfillmentOptions(
      cartId,
      session.guestToken,
      administrativeArea,
    );
    return NextResponse.json(fulfillment);
  } catch {
    return NextResponse.json(
      { message: "Fulfillment options could not be loaded" },
      { status: 502 },
    );
  }
}
