import { NextRequest, NextResponse } from "next/server";

import { getFulfillmentOptions } from "@/lib/api";

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

  try {
    const fulfillment = await getFulfillmentOptions(cartId, administrativeArea);
    return NextResponse.json(fulfillment);
  } catch {
    return NextResponse.json(
      { message: "Fulfillment options could not be loaded" },
      { status: 502 },
    );
  }
}
