import { NextRequest, NextResponse } from "next/server";

import {
  clearGuestCartId,
  getGuestCartSession,
} from "@/lib/cart-session";

export async function GET(request: NextRequest) {
  const staleCartId = request.nextUrl.searchParams.get("cartId");
  const session = await getGuestCartSession();

  if (staleCartId !== null && session.cartId === staleCartId) {
    await clearGuestCartId();
  }

  return NextResponse.redirect(new URL("/cart", request.url));
}
