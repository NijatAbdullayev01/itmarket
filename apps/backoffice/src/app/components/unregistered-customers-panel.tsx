"use client";

import { useMemo, useState } from "react";

import type { StaffUnregisteredCustomerSummaryContract } from "@itmarket/contracts";

import { formatAzDateTime } from "../../lib/format-az-date";
import { formatAznValue } from "../../lib/format-azn";

type UnregisteredCustomersPanelProps = {
  customers: StaffUnregisteredCustomerSummaryContract[];
  unregisteredCount: number | null;
  canCustomersRead: boolean;
};

export function UnregisteredCustomersPanel({
  customers,
  unregisteredCount,
  canCustomersRead,
}: UnregisteredCustomersPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");
    if (query === "") {
      return customers;
    }

    return customers.filter((customer) => {
      const haystack = [customer.displayName, customer.email, customer.phone]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [customers, searchQuery]);

  const totalOrders = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.orderCount, 0),
    [customers],
  );

  if (!canCustomersRead) {
    return (
      <section className="catalog-section" aria-label="Qeydiyyatsız müştərilər">
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
    <section className="catalog-section" aria-label="Qeydiyyatsız müştərilər">
      <div
        className="catalog-metrics"
        aria-label="Qeydiyyatsız müştəri statistikası"
      >
        <article className="catalog-metric">
          <span className="catalog-metric__label">Qeydiyyatsız</span>
          <strong className="catalog-metric__value">
            {unregisteredCount ?? customers.length}
          </strong>
        </article>
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Sifarişlər</span>
          <strong className="catalog-metric__value">{totalOrders}</strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Siyahıda</span>
          <strong className="catalog-metric__value">
            {filteredCustomers.length}
          </strong>
        </article>
      </div>

      <article className="operation-card operation-card--no-hover">
        <header className="catalog-subcategories-toolbar">
          <div className="catalog-subcategories-toolbar__filters">
            <label className="catalog-subcategories-filter">
              <span className="catalog-subcategories-filter__label">Axtarış</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Ad, e-poçt və ya telefon"
                autoComplete="off"
              />
            </label>
          </div>
        </header>

        {filteredCustomers.length === 0 ? (
          <p className="card-note">
            {customers.length === 0
              ? "Hələ qeydiyyatsız sifariş verən müştəri yoxdur."
              : "Axtarışa uyğun müştəri tapılmadı."}
          </p>
        ) : (
          <div className="inventory-balance-table-wrap">
            <div className="inventory-balance-table-scroll">
              <table className="inventory-balance-table">
                <thead>
                  <tr>
                    <th scope="col">Ad</th>
                    <th scope="col">E-poçt</th>
                    <th scope="col">Telefon</th>
                    <th scope="col">Sifariş</th>
                    <th scope="col">Cəmi</th>
                    <th scope="col">Son sifariş</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.identityKey}>
                      <td data-label="Ad">{customer.displayName ?? "—"}</td>
                      <td data-label="E-poçt">{customer.email ?? "—"}</td>
                      <td data-label="Telefon">{customer.phone ?? "—"}</td>
                      <td data-label="Sifariş">{customer.orderCount}</td>
                      <td data-label="Cəmi">
                        {formatAznValue(customer.totalSpent) ??
                          customer.totalSpent}
                      </td>
                      <td data-label="Son sifariş">
                        {formatAzDateTime(customer.lastOrderAt, customer.lastOrderAt)}
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
