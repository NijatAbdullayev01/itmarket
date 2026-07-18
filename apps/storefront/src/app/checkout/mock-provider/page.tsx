import { redirect } from "next/navigation";

export default async function MockProviderAliasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const url = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.length > 0) {
      url.set(key, value);
    }
  }
  const query = url.toString();
  redirect(query.length > 0 ? `/checkout/pay?${query}` : "/checkout/pay");
}
