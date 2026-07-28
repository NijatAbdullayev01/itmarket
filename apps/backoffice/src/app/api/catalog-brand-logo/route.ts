import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import {
  extensionForCatalogImageMime,
  resolveCatalogImageMime,
  type CatalogImageMimeType,
} from "@/lib/catalog-image-content-sniff";
import { resolveCatalogBrandLogoDirectories } from "@/lib/catalog-brand-logo-storage";
import { requireStaffCatalogWrite } from "@/lib/require-staff-catalog-write";
import { scanCatalogImageViaApi } from "@/lib/scan-catalog-image-via-api";

const MAX_BYTES = 5_000_000;

export async function POST(request: Request) {
  const denied = await requireStaffCatalogWrite(request);
  if (denied !== null) {
    return denied;
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Logo faylı tələb olunur" }, { status: 400 });
  }

  if (file.size < 1 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { message: "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur" },
      { status: 400 },
    );
  }

  const scanned = await scanCatalogImageViaApi(request, file);
  if (!scanned.ok) {
    return scanned.response;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let mimeType: CatalogImageMimeType;
  try {
    mimeType = resolveCatalogImageMime({
      body: buffer,
      declaredMimeType: file.type,
    });
  } catch {
    return NextResponse.json(
      { message: "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur" },
      { status: 400 },
    );
  }

  if (mimeType !== scanned.result.mimeType) {
    return NextResponse.json(
      { message: "Fayl təhlükəsizlik yoxlamasından keçmədi" },
      { status: 400 },
    );
  }

  const fileName = `${randomUUID()}.${extensionForCatalogImageMime(mimeType)}`;
  for (const directory of resolveCatalogBrandLogoDirectories()) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), buffer);
  }

  return NextResponse.json({
    objectKey: `/images/brands/${fileName}`,
    mimeType,
    byteSize: file.size,
  });
}
