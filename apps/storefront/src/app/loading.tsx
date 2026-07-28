import { PageLoading } from "@itmarket/ui";

/** Calm neutral placeholder — not a fake product grid on every route. */
export default function Loading() {
  return <PageLoading variant="soft" showTitle={false} />;
}
