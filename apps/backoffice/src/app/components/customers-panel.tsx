"use client";

import { useMemo, useState } from "react";

import type { StaffCustomerSummaryContract } from "@itmarket/contracts";

type CustomersPanelProps = {
  customers: StaffCustomerSummaryContract[];
  registeredCount: number | null;
  canCustomersRead: boolean;
};

function formatCustomerName(customer: StaffCustomerSummaryContract) {
  const parts = [customer.firstName, customer.lastName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" ") : "—";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("az-AZ", {
    timeZone: "Asia/Baku",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function CustomersPanel({
  customers,
  registeredCount,
  canCustomersRead,
}: CustomersPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");
    if (query === "") {
      return customers;
    }

    return customers.filter((customer) => {
      const haystack = [
        customer.firstName,
        customer.lastName,
        customer.email,
        customer.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [customers, searchQuery]);

  const activeCount = useMemo(
    () => customers.filter((customer) => customer.active).length,
    [customers],
  );

  if (!canCustomersRead) {
    return (
      <section className="catalog-section" aria-label="Müştərilər">
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
    <section className="catalog-section" aria-label="Müştərilər">
      <div className="catalog-metrics" aria-label="Müştəri statistikası">
        <article className="catalog-metric">
          <span className="catalog-metric__label">Qeydiyyatlı</span>
          <strong className="catalog-metric__value">
            {registeredCount ?? customers.length}
          </strong>
        </article>
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Aktiv</span>
          <strong className="catalog-metric__value">{activeCount}</strong>
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
              ? "Hələ qeydiyyatlı müştəri yoxdur."
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
                    <th scope="col">Status</th>
                    <th scope="col">Qeydiyyat</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td data-label="Ad">{formatCustomerName(customer)}</td>
                      <td data-label="E-poçt">{customer.email ?? "—"}</td>
                      <td data-label="Telefon">{customer.phone ?? "—"}</td>
                      <td data-label="Status">
                        {customer.active ? "Aktiv" : "Deaktiv"}
                      </td>
                      <td data-label="Qeydiyyat">
                        {formatDate(customer.createdAt)}
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
