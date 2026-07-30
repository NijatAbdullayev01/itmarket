import { NextResponse } from "next/server";

import { requireStaffCatalogWrite } from "@/lib/require-staff-catalog-write";
import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";
import { staffApiProxyHeaders } from "@/lib/staff-api-proxy-headers";

export async function POST(request: Request) {
  const denied = await requireStaffCatalogWrite(request);
  if (denied !== null) {
    return denied;
  }

  const headers = staffApiProxyHeaders(request);
  if (headers.cookie === undefined) {
    return NextResponse.json({ message: "Giriş tələb olunur" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Şəkil faylı tələb olunur" }, { status: 400 });
  }

  const body = new FormData();
  body.set("file", file);

  const apiBase = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  let response: Response;
  try {
    response = await fetch(`${apiBase}/catalog/media/upload`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { message: "Şəkil yüklənmədi" },
      { status: 503 },
    );
  }

  const payload = (await response.json()) as {
    message?: string;
    objectKey?: string;
    mimeType?: string;
    byteSize?: number;
  };

  if (!response.ok) {
    return NextResponse.json(
      { message: payload.message ?? "Şəkil yüklənmədi" },
      { status: response.status },
    );
  }

  if (
    payload.objectKey === undefined ||
    payload.mimeType === undefined ||
    payload.byteSize === undefined
  ) {
    return NextResponse.json(
      { message: "Şəkil yükləmə cavabı natamamdır" },
      { status: 502 },
    );
  }

  return NextResponse.json({
    objectKey: payload.objectKey,
    mimeType: payload.mimeType,
    byteSize: payload.byteSize,
  });
}
