import { NextResponse } from "next/server";

import { resolveApiBaseUrl } from "./resolve-api-base-url";

const CATALOG_WRITE = "catalog.write";

type StaffMeResponse = {
  permissions?: string[];
};

/**
 * Guards backoffice Next.js upload routes. Staff cookies are host-scoped on the
 * backoffice origin via the `/api/v1` rewrite proxy, so we forward them to Nest
 * `/staff/auth/me` and require `catalog.write`.
 */
export async function requireStaffCatalogWrite(
  request: Request,
): Promise<NextResponse | null> {
  const cookie = request.headers.get("cookie");
  if (cookie === null || cookie.trim() === "") {
    return NextResponse.json({ message: "Giriş tələb olunur" }, { status: 401 });
  }

  const apiBase = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  let response: Response;
  try {
    response = await fetch(`${apiBase}/staff/auth/me`, {
      method: "GET",
      headers: { cookie },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Autentifikasiya yoxlanılmadı" },
      { status: 503 },
    );
  }

  if (!response.ok) {
    return NextResponse.json({ message: "Giriş tələb olunur" }, { status: 401 });
  }

  const principal = (await response.json()) as StaffMeResponse;
  if (!(principal.permissions ?? []).includes(CATALOG_WRITE)) {
    return NextResponse.json(
      { message: "Kataloq yazma icazəsi yoxdur" },
      { status: 403 },
    );
  }

  return null;
}
