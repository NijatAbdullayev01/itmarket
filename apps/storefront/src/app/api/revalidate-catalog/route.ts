import { createHash, timingSafeEqual } from "node:crypto";

import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import "@/lib/load-env";
import { catalogRevalidateSecret } from "@/lib/catalog-revalidate-secret";

export const runtime = "nodejs";

function secretsMatch(expected: string, provided: string): boolean {
  const left = createHash("sha256").update(expected).digest();
  const right = createHash("sha256").update(provided).digest();
  return timingSafeEqual(left, right);
}

function isSafePath(path: string): boolean {
  return (
    path.startsWith("/") &&
    !path.startsWith("//") &&
    !path.includes("\\") &&
    !path.includes("..")
  );
}

function isSafeTag(tag: string): boolean {
  return /^[a-zA-Z0-9:_-]{1,120}$/.test(tag);
}

/**
 * On-demand catalog cache bust for storefront ISR / fetch Data Cache.
 * Called by the API after catalog writes. The header is a derived (or
 * dedicated) revalidate secret — never the raw APP_SECRET.
 */
export async function POST(request: Request) {
  const appSecret = process.env.APP_SECRET?.trim() ?? "";
  const expected = catalogRevalidateSecret(appSecret);
  const provided = request.headers.get("x-revalidate-secret")?.trim() ?? "";
  if (appSecret.length === 0 || !secretsMatch(expected, provided)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: { paths?: unknown; tags?: unknown } = {};
  try {
    body = (await request.json()) as { paths?: unknown; tags?: unknown };
  } catch {
    body = {};
  }

  const paths = Array.isArray(body.paths)
    ? body.paths.filter(
        (entry): entry is string =>
          typeof entry === "string" && isSafePath(entry),
      )
    : [];
  const tags = Array.isArray(body.tags)
    ? body.tags.filter(
        (entry): entry is string =>
          typeof entry === "string" && isSafeTag(entry),
      )
    : ["catalog"];

  for (const path of paths) {
    revalidatePath(path);
  }
  for (const tag of tags) {
    revalidateTag(tag, "max");
  }

  // Catalog surfaces that embed product cards / listings.
  revalidatePath("/");
  revalidatePath("/products", "layout");
  revalidatePath("/categories", "layout");
  revalidatePath("/brands", "layout");

  return NextResponse.json({
    ok: true,
    paths,
    tags,
    now: Date.now(),
  });
}
