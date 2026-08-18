import { PageLoading } from "@itmarket/ui";

/** Home-shaped pending UI — hero + rails, not a fake product grid. */
export default function Loading() {
  return <PageLoading variant="home" showTitle={false} />;
}
