import { NextResponse } from "next/server";

import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";

const ATTEMPT_TOKEN_COOKIE = "itmarket_payment_attempt_token";
const ATTEMPT_TOKEN_MAX_AGE_SECONDS = 60 * 30;

/**
 * Absorbs the payment attempt capability token from the query string into an
 * httpOnly cookie, then redirects to a clean /checkout/pay URL.
 *
 * Rotates the token via API on claim so a leaked handoff URL cannot be reused
 * after the first successful absorb. Display fields are loaded from the API —
 * query params are not trusted.
 */
export async function GET(request: Request) {
  const inbound = new URL(request.url);
  const payUrl = new URL("/checkout/pay", inbound.origin);
  const attemptToken = inbound.searchParams.get("attemptToken");

  if (attemptToken === null || attemptToken.trim() === "") {
    return redirectNoStore(payUrl);
  }

  let claimedToken: string | null = null;
  try {
    const response = await fetch(
      `${resolveApiBaseUrl()}/payments/attempts/${encodeURIComponent(attemptToken)}/claim`,
      {
        method: "POST",
        cache: "no-store",
      },
    );
    if (response.ok) {
      const payload = (await response.json()) as { attemptToken?: string };
      if (
        typeof payload.attemptToken === "string" &&
        payload.attemptToken.trim() !== ""
      ) {
        claimedToken = payload.attemptToken;
      }
    }
  } catch {
    // Fall through: keep any existing cookie and land on /checkout/pay.
  }

  const response = redirectNoStore(payUrl);
  if (claimedToken !== null) {
    response.cookies.set({
      name: ATTEMPT_TOKEN_COOKIE,
      value: claimedToken,
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/checkout/pay",
      maxAge: ATTEMPT_TOKEN_MAX_AGE_SECONDS,
    });
  }
  return response;
}

function redirectNoStore(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
