"use client";

import { formatAzDateTime } from "../../lib/format-az-date";

export type AuditLogEntryView = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorType: string;
  actorId: string | null;
  createdAt: string;
};

export type ReconciliationView = {
  healthy: boolean;
  mismatches: {
    variant_id: string;
    location_id: string;
    balance_on_hand: number;
    ledger_on_hand: string;
  }[];
};

export type LowStockRow = {
  variantId: string;
  locationId: string;
  sku: string;
  productName: string;
  locationName: string;
  available: number;
  onHand: number;
  reserved: number;
  threshold: number;
};

export type ReportExportRow = {
  id: string;
  reportType: string;
  status: string;
  fileName: string;
  rowCount: number | null;
  createdAt: string;
  completedAt: string | null;
};

type ReportsOpsPanelProps = {
  canAudit: boolean;
  canReconciliation: boolean;
  canReportsExport: boolean;
  auditEntries: AuditLogEntryView[];
  reconciliation: ReconciliationView | null;
  lowStock: LowStockRow[];
  exports: ReportExportRow[];
  onRequestSalesExport: () => Promise<void>;
  onRefreshExports: () => Promise<void>;
  onDownloadExport: (id: string) => void;
};

export function ReportsOpsPanel({
  canAudit,
  canReconciliation,
  canReportsExport,
  auditEntries,
  reconciliation,
  lowStock,
  exports,
  onRequestSalesExport,
  onRefreshExports,
  onDownloadExport,
}: ReportsOpsPanelProps) {
  return (
    <div className="reports-ops-stack">
      {canReconciliation ? (
        <article className="operation-card">
          <h2>Stok reconciliation</h2>
          {reconciliation === null ? (
            <p className="pos-empty">Reconciliation məlumatı yüklənmədi.</p>
          ) : reconciliation.healthy ? (
            <p className="pos-meta">
              Ledger və balance uyğundur — uyğunsuzluq tapılmayıb.
            </p>
          ) : (
            <div className="report-table-wrap">
              <div className="report-table-scroll">
                <table className="report-sales-table">
                  <thead>
                    <tr>
                      <th scope="col">Variant</th>
                      <th scope="col">Məntəqə</th>
                      <th scope="col">Balance</th>
                      <th scope="col">Ledger</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.mismatches.map((row) => (
                      <tr key={`${row.variant_id}-${row.location_id}`}>
                        <td>{row.variant_id.slice(0, 8)}…</td>
                        <td>{row.location_id.slice(0, 8)}…</td>
                        <td>{row.balance_on_hand}</td>
                        <td>{row.ledger_on_hand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </article>
      ) : null}

      <article className="operation-card">
        <h2>Aşağı stok</h2>
        {lowStock.length === 0 ? (
          <p className="pos-empty">Aşağı stok sətiri yoxdur.</p>
        ) : (
          <div className="report-table-wrap">
            <div className="report-table-scroll">
              <table className="report-sales-table">
                <thead>
                  <tr>
                    <th scope="col">Məhsul</th>
                    <th scope="col">SKU</th>
                    <th scope="col">Məntəqə</th>
                    <th scope="col">Mövcud</th>
                    <th scope="col">Hədd</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((row) => (
                    <tr key={`${row.variantId}-${row.locationId}`}>
                      <td>{row.productName}</td>
                      <td>{row.sku}</td>
                      <td>{row.locationName}</td>
                      <td>{row.available}</td>
                      <td>{row.threshold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </article>

      {canReportsExport ? (
        <article className="operation-card">
          <div className="report-period-head">
            <h2>CSV export</h2>
            <div className="report-period-tabs">
              <button
                type="button"
                className="is-active"
                onClick={() => void onRequestSalesExport()}
              >
                Satış CSV yarat
              </button>
              <button type="button" onClick={() => void onRefreshExports()}>
                Yenilə
              </button>
            </div>
          </div>
          {exports.length === 0 ? (
            <p className="pos-empty">Hələ export yoxdur.</p>
          ) : (
            <div className="report-table-wrap">
              <div className="report-table-scroll">
                <table className="report-sales-table">
                  <thead>
                    <tr>
                      <th scope="col">Fayl</th>
                      <th scope="col">Tip</th>
                      <th scope="col">Status</th>
                      <th scope="col">Sətir</th>
                      <th scope="col">Tarix</th>
                      <th scope="col">Yüklə</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exports.map((row) => (
                      <tr key={row.id}>
                        <td>{row.fileName}</td>
                        <td>{row.reportType}</td>
                        <td>{row.status}</td>
                        <td>{row.rowCount ?? "—"}</td>
                        <td>
                          {formatAzDateTime(row.createdAt, row.createdAt)}
                        </td>
                        <td>
                          {row.status === "COMPLETED" ? (
                            <button
                              type="button"
                              onClick={() => onDownloadExport(row.id)}
                            >
                              Endir
                            </button>
                          ) : (
                            "—"
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
      ) : null}

      {canAudit ? (
        <article className="operation-card">
          <h2>Son audit qeydləri</h2>
          {auditEntries.length === 0 ? (
            <p className="pos-empty">Audit qeydi yoxdur.</p>
          ) : (
            <ul className="audit-entry-list">
              {auditEntries.map((entry) => (
                <li key={entry.id} className="audit-entry">
                  <strong>{entry.action}</strong>
                  <span className="pos-meta">
                    {entry.entityType}:{entry.entityId.slice(0, 8)}… ·{" "}
                    {entry.actorType}
                    {entry.actorId ? `:${entry.actorId.slice(0, 8)}…` : ""} ·{" "}
                    {formatAzDateTime(entry.createdAt, entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      ) : null}
    </div>
  );
}
