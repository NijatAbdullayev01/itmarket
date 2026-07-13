import Link from "next/link";
import { listProducts } from "@/lib/api";
import { formatAzn } from "@/lib/format-azn";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const products = await listProducts(q);

  return (
    <>
      <a className="skip-link" href="#esas-mezmun">
        Əsas məzmuna keç
      </a>
      <header className="site-header">
        <div className="shell header-inner">
          <Link className="brand" href="/" aria-label="IT Market ana səhifə">
            <span className="brand-mark" aria-hidden="true">
              it
            </span>
            <span>IT Market</span>
          </Link>
          <nav aria-label="Əsas naviqasiya">
            <a href="#kataloq">Kataloq</a>
            <a href="#checkout">Checkout</a>
          </nav>
        </div>
      </header>

      <main id="esas-mezmun">
        <section className="hero shell" aria-labelledby="hero-title">
          <div className="eyebrow">
            <span aria-hidden="true" />
            Azərbaycan dilində texnologiya vitrini
          </div>
          <h1 id="hero-title">
            Texnologiya seçiminiz üçün <em>aydın başlanğıc.</em>
          </h1>
          <p className="hero-copy">
            IT Market məhsulları müqayisə etmək və qiymətləri manatla anlamaq
            üçün əlçatan alış təcrübəsinin əsasını qurur.
          </p>
          <dl className="signal-list" aria-label="Vitrinin əsas prinsipləri">
            <div>
              <dt>Valyuta</dt>
              <dd>{formatAzn(0)}</dd>
            </div>
            <div>
              <dt>Dil</dt>
              <dd>Azərbaycan dili</dd>
            </div>
            <div>
              <dt>Mərhələ</dt>
              <dd>Faza 4</dd>
            </div>
          </dl>
        </section>

        <section
          className="directions"
          id="checkout"
          aria-labelledby="directions-title"
        >
          <div className="shell">
            <p className="section-kicker">Alış təcrübəsinin əsası</p>
            <h2 id="directions-title">Sadə, müqayisə edilə bilən, anlaşılan</h2>
            <div className="card-grid">
              <article>
                <span className="card-number" aria-hidden="true">
                  01
                </span>
                <h3>Aydın kataloq</h3>
                <p>
                  Məhsul məlumatının ardıcıl və rahat oxunan təqdimatı üçün
                  struktur.
                </p>
              </article>
              <article>
                <span className="card-number" aria-hidden="true">
                  02
                </span>
                <h3>Şəffaf qiymət</h3>
                <p>
                  Qiymətlərin Azərbaycan manatı ilə vahid formatda göstərilməsi.
                </p>
              </article>
              <article>
                <span className="card-number" aria-hidden="true">
                  03
                </span>
                <h3>Hər ekrana uyğun</h3>
                <p>Mobil cihazdan böyük ekrana qədər əlçatan və çevik təməl.</p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="catalog-section shell"
          id="kataloq"
          aria-labelledby="catalog-title"
        >
          <div>
            <p className="section-kicker">Aktiv kataloq</p>
            <h2 id="catalog-title">Məhsullar</h2>
          </div>
          <form className="search-form" action="/">
            <label htmlFor="q">Axtarış</label>
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="SKU, məhsul adı..."
            />
            <button type="submit">Axtar</button>
          </form>
          {products.items.length === 0 ? (
            <p className="empty-state">
              Aktiv məhsul tapılmadı. Backoffice-dən məhsul və stok əlavə edin.
            </p>
          ) : (
            <div className="product-grid">
              {products.items.map((product) => (
                <article className="product-card" key={product.id}>
                  <p className="product-meta">
                    {product.category.name}
                    {product.brand ? ` · ${product.brand.name}` : ""}
                  </p>
                  <h3>{product.name}</h3>
                  <p>
                    {product.description ?? "Məhsul təsviri əlavə edilməyib."}
                  </p>
                  <div className="product-card-footer">
                    <strong>
                      {product.price === null
                        ? "Qiymət yoxdur"
                        : formatAzn(Number(product.price))}
                    </strong>
                    <span>
                      {product.available > 0
                        ? `${product.available} ədəd stokda`
                        : "Stokda yoxdur"}
                    </span>
                  </div>
                  <Link
                    className="button-link"
                    href={`/products/${product.slug}`}
                  >
                    Məhsula bax
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <div className="shell footer-inner">
          <span>IT Market</span>
          <span>Texnologiya vitrini · Faza 4</span>
        </div>
      </footer>
    </>
  );
}
