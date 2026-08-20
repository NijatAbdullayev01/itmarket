import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

function resolveMonorepoRoot(): string | null {
  const MAX_DEPTH = 8;
  let current = process.cwd();
  for (let i = 0; i < MAX_DEPTH; i += 1) {
    if (
      existsSync(path.join(current, "pnpm-workspace.yaml")) ||
      existsSync(path.join(current, "turbo.json"))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

function resolveCandidateImageBases(): string[] {
  const bases = new Set<string>();
  bases.add(path.join(process.cwd(), "public", "images"));

  const envRoot =
    process.env.ITMARKET_REPO_ROOT?.trim() ||
    process.env.ITMARKET_MONOREPO_ROOT?.trim() ||
    "";
  const root = envRoot !== "" ? envRoot : resolveMonorepoRoot();
  if (root) {
    bases.add(path.join(root, "apps", "backoffice", "public", "images"));
    bases.add(path.join(root, "apps", "storefront", "public", "images"));
  }

  return [...bases];
}

const CANDIDATE_BASES = resolveCandidateImageBases();

export async function GET(
  _request: Request,
  props: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await props.params;
  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return new Response("Not found", { status: 404 });
  }

  // Prevent directory traversal attacks
  for (const segment of slug) {
    if (
      segment === ".." ||
      segment === "." ||
      segment.includes("/") ||
      segment.includes("\\") ||
      segment.includes("\0")
    ) {
      return new Response("Invalid path", { status: 400 });
    }
  }

  const relativePath = path.join(...slug);
  const ext = path.extname(relativePath).toLowerCase();
  const contentType = MIME_MAP[ext] || "application/octet-stream";

  for (const baseDir of CANDIDATE_BASES) {
    const fullPath = path.resolve(baseDir, relativePath);
    if (!fullPath.startsWith(path.resolve(baseDir))) {
      continue;
    }

    try {
      const fileStat = await stat(fullPath);
      if (!fileStat.isFile()) {
        continue;
      }
      const nodeStream = createReadStream(fullPath);
      const webStream = Readable.toWeb(nodeStream) as ReadableStream;
      return new Response(webStream, {
        headers: {
          "Content-Type": contentType,
          "Content-Length": fileStat.size.toString(),
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // Continue to next base directory
    }
  }

  return new Response("Not found", { status: 404 });
}
