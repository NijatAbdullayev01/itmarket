import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { resolveCatalogBannerImageDirectories } from "@/lib/catalog-banner-image-storage";

const MAX_BYTES = 5_000_000;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "jpg";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { message: "Banner şəkli tələb olunur" },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME.has(file.type) || file.size < 1 || file.size > MAX_BYTES) {
    return NextResponse.json(
      { message: "Yalnız JPEG, PNG və ya WebP (maks. 5 MB) qəbul olunur" },
      { status: 400 },
    );
  }

  const fileName = `${randomUUID()}.${extensionForMime(file.type)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  for (const directory of resolveCatalogBannerImageDirectories()) {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), buffer);
  }

  return NextResponse.json({
    objectKey: `/images/hero/${fileName}`,
    mimeType: file.type,
    byteSize: file.size,
  });
}
