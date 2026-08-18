import Link from "next/link";

import { parseBlogInlineParts } from "@/lib/i18n/blog/blog";

export function BlogInlineText({ text }: { text: string }) {
  return (
    <>
      {parseBlogInlineParts(text).map((part, index) =>
        part.type === "link" ? (
          <Link key={`${part.href}-${index}`} href={part.href}>
            {part.label}
          </Link>
        ) : (
          <span key={`t-${index}`}>{part.text}</span>
        ),
      )}
    </>
  );
}
