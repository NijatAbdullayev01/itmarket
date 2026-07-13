import Link from "next/link";

export const metadata = {
  title: "Sifariş yaradıldı",
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNumber?: string }>;
}) {
  const { orderNumber } = await searchParams;
  return (
    <main className="shell detail-page success-page">
      <p className="section-kicker">Sifariş qəbul edildi</p>
      <h1>Nağd ödənişli sifariş yaradıldı</h1>
      <p className="hero-copy">
        Stok rezerv olundu. Sifariş nömrəsi:{" "}
        <strong>{orderNumber ?? "naməlum"}</strong>
      </p>
      <p>
        Online kart və taksit axınları üçün ayrıca status səhifəsi istifadə
        olunur.
      </p>
      <Link className="button-link" href="/">
        Kataloqa qayıt
      </Link>
    </main>
  );
}
