"use client";

import { useMemo, useState } from "react";

import type { StaffActiveCartShopperContract } from "@itmarket/contracts";

import { formatAzDateTime } from "../../lib/format-az-date";
import { formatAznValue } from "../../lib/format-azn";

type CartShoppersPanelProps = {
  shoppers: StaffActiveCartShopperContract[];
  cartShopperCount: number | null;
  canCustomersRead: boolean;
};

function shopperKindLabel(kind: StaffActiveCartShopperContract["kind"]) {
  return kind === "registered" ? "Qeydiyyatlı" : "Qonaq";
}

function formatCartContents(shopper: StaffActiveCartShopperContract) {
  const items =
    shopper.itemCount === 1 ? "1 məhsul" : `${shopper.itemCount} məhsul`;
  const quantity =
    shopper.quantityTotal === 1 ? "1 ədəd" : `${shopper.quantityTotal} ədəd`;
  return `${items} · ${quantity}`;
}

export function CartShoppersPanel({
  shoppers,
  cartShopperCount,
  canCustomersRead,
}: CartShoppersPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredShoppers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");
    if (query === "") {
      return shoppers;
    }

    return shoppers.filter((shopper) => {
      const haystack = [
        shopper.displayName,
        shopper.email,
        shopper.phone,
        shopper.productPreview,
        shopperKindLabel(shopper.kind),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [shoppers, searchQuery]);

  const registeredInList = useMemo(
    () => shoppers.filter((shopper) => shopper.kind === "registered").length,
    [shoppers],
  );
  const guestInList = shoppers.length - registeredInList;

  if (!canCustomersRead) {
    return (
      <section className="catalog-section" aria-label="Səbətdə olanlar">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>customers.read</code> icazəsi olan
            əməkdaşlar daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Səbətdə olanlar">
      <div className="catalog-metrics" aria-label="Səbət statistikası">
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Səbətdə</span>
          <strong className="catalog-metric__value">
            {cartShopperCount ?? shoppers.length}
          </strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Qeydiyyatlı</span>
          <strong className="catalog-metric__value">{registeredInList}</strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Qonaq</span>
          <strong className="catalog-metric__value">{guestInList}</strong>
        </article>
      </div>

      <article className="operation-card operation-card--no-hover">
        <header className="catalog-subcategories-toolbar">
          <div className="catalog-subcategories-toolbar__filters">
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">
                Axtarış
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ad, e-poçt, telefon və ya məhsul"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        {filteredShoppers.length === 0 ? (
          <p className="card-note">
            {shoppers.length === 0
              ? "Hazırda səbətdə məhsul olan müştəri yoxdur."
              : "Axtarışa uyğun müştəri tapılmadı."}
          </p>
        ) : (
          <div className="inventory-balance-table-wrap">
            <div className="inventory-balance-table-scroll">
              <table className="inventory-balance-table">
                <thead>
                  <tr>
                    <th scope="col">Müştəri</th>
                    <th scope="col">Növ</th>
                    <th scope="col">E-poçt</th>
                    <th scope="col">Telefon</th>
                    <th scope="col">Məhsul</th>
                    <th scope="col">Səbət</th>
                    <th scope="col">Cəmi</th>
                    <th scope="col">Son fəaliyyət</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShoppers.map((shopper) => (
                    <tr key={shopper.shopperKey}>
                      <td data-label="Müştəri">
                        {shopper.displayName ??
                          (shopper.kind === "guest" ? "Qonaq" : "—")}
                      </td>
                      <td data-label="Növ">{shopperKindLabel(shopper.kind)}</td>
                      <td data-label="E-poçt">{shopper.email ?? "—"}</td>
                      <td data-label="Telefon">{shopper.phone ?? "—"}</td>
                      <td data-label="Məhsul">
                        {shopper.productPreview ?? "—"}
                      </td>
                      <td data-label="Səbət">{formatCartContents(shopper)}</td>
                      <td data-label="Cəmi">
                        {formatAznValue(shopper.subtotal) ?? shopper.subtotal}
                      </td>
                      <td data-label="Son fəaliyyət">
                        {formatAzDateTime(
                          shopper.lastActivityAt,
                          shopper.lastActivityAt,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
