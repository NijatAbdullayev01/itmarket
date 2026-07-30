import { NextResponse } from "next/server";

import { resolveApiBaseUrl } from "@/lib/resolve-api-base-url";
import { staffApiProxyHeaders } from "@/lib/staff-api-proxy-headers";

export type CatalogMediaScanResult = {
  mimeType: string;
  byteSize: number;
};

/**
 * Runs the Nest catalog media malware gate (local polyglot + optional ClamAV)
 * before banner/logo files are written to public image dirs.
 */
export async function scanCatalogImageViaApi(
  request: Request,
  file: File,
): Promise<
  | { ok: true; result: CatalogMediaScanResult }
  | { ok: false; response: NextResponse }
> {
  const headers = staffApiProxyHeaders(request);
  if (headers.cookie === undefined) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Giriş tələb olunur" },
        { status: 401 },
      ),
    };
  }

  const body = new FormData();
  body.set("file", file);

  const apiBase = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  let response: Response;
  try {
    response = await fetch(`${apiBase}/catalog/media/scan`, {
      method: "POST",
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Media təhlükəsizlik yoxlaması hazır deyil" },
        { status: 503 },
      ),
    };
  }

  const payload = (await response.json()) as {
    message?: string;
    mimeType?: string;
    byteSize?: number;
  };

  if (!response.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            payload.message ?? "Fayl təhlükəsizlik yoxlamasından keçmədi",
        },
        { status: response.status },
      ),
    };
  }

  if (payload.mimeType === undefined || payload.byteSize === undefined) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Media yoxlama cavabı natamamdır" },
        { status: 502 },
      ),
    };
  }

  return {
    ok: true,
    result: {
      mimeType: payload.mimeType,
      byteSize: payload.byteSize,
    },
  };
}
