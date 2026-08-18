"use client";

import { useConfirmDialog } from "@itmarket/ui";
import { useCallback, useEffect, useState } from "react";

import { formatAzDateTime } from "../../lib/format-az-date";

export type StorefrontPaymentsGate = {
  closed: boolean;
  updatedAt: string | null;
  updatedByStaffId: string | null;
  updatedByDisplayName: string | null;
};

type RunFn = <T>(
  action: () => Promise<T>,
  success: string,
  options?: { refresh?: boolean; onSuccess?: (result: T) => void },
) => Promise<T | null>;

type StorefrontPaymentsPanelProps = {
  canManageStaff: boolean;
  run: RunFn;
  onLoad: () => Promise<StorefrontPaymentsGate>;
  onSetClosed: (closed: boolean) => Promise<StorefrontPaymentsGate>;
};

export function StorefrontPaymentsPanel({
  canManageStaff,
  run,
  onLoad,
  onSetClosed,
}: StorefrontPaymentsPanelProps) {
  const { requestConfirm, confirmDialog } = useConfirmDialog();
  const [gate, setGate] = useState<StorefrontPaymentsGate | null>(null);
  const [loading, setLoading] = useState(canManageStaff);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    if (!canManageStaff) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    try {
      setGate(await onLoad());
    } catch (caught) {
      setLoadError(
        caught instanceof Error
          ? caught.message
          : "Ödəniş statusu yüklənmədi",
      );
    } finally {
      setLoading(false);
    }
  }, [canManageStaff, onLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  if (!canManageStaff) {
    return (
      <section className="admin-section" aria-label="Ödənişləri bağla">
        <article className="operation-card admin-access-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Sayt ödənişlərini yalnız <code>staff.manage</code> icazəsi olan
            administratorlar bağlaya və aça bilər.
          </p>
        </article>
      </section>
    );
  }

  const closed = gate?.closed === true;
  const updatedLabel =
    gate?.updatedAt !== null && gate?.updatedAt !== undefined
      ? formatAzDateTime(gate.updatedAt)
      : null;

  return (
    <section className="admin-section" aria-label="Ödənişləri bağla">
      {confirmDialog}
      <article className="operation-card operation-card--no-hover payments-gate-card">
        <div className="payments-gate-card__head">
          <p className="ui-section-kicker">Sayt ödənişləri</p>
          <h2>Ödənişləri hələlik bağla</h2>
          <p className="admin-builder__lead">
            Müştəri saytında yeni sifariş ödənişlərini (kart, taksit və
            mağazadan nağd) müvəqqəti bağlayır. Kassa (POS) satışları işləməyə
            davam edir. Artıq başlanmış ödəniş cəhdləri tamamlana bilər.
          </p>
        </div>

        {loading ? (
          <p className="card-note">Status yüklənir…</p>
        ) : loadError ? (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        ) : (
          <>
            <div
              className={`payments-gate-status${
                closed ? " is-closed" : " is-open"
              }`}
              role="status"
            >
              <span className="payments-gate-status__label">
                {closed ? "Saytda ödənişlər bağlıdır" : "Saytda ödənişlər açıqdır"}
              </span>
              {updatedLabel ? (
                <span className="payments-gate-status__meta">
                  Son dəyişiklik: {updatedLabel}
                  {gate?.updatedByDisplayName
                    ? ` · ${gate.updatedByDisplayName}`
                    : ""}
                </span>
              ) : null}
            </div>

            <div className="payments-gate-card__actions">
              {closed ? (
                <button
                  type="button"
                  onClick={() =>
                    requestConfirm({
                      title: "Ödənişləri aç",
                      message:
                        "Müştərilər yenidən saytda sifariş rəsmiləşdirə biləcək. Davam edilsin?",
                      confirmLabel: "Ödənişləri aç",
                      onConfirm: async () => {
                        await run(
                          () => onSetClosed(false),
                          "Sayt ödənişləri açıldı",
                          {
                            refresh: false,
                            onSuccess: setGate,
                          },
                        );
                      },
                    })
                  }
                >
                  Ödənişləri aç
                </button>
              ) : (
                <button
                  type="button"
                  className="bo-btn-reset payments-gate-card__close-btn"
                  onClick={() =>
                    requestConfirm({
                      title: "Ödənişləri hələlik bağla",
                      message:
                        "Saytda yeni sifariş ödənişləri dayandırılacaq. Kassa satışları açıq qalacaq. Davam edilsin?",
                      confirmLabel: "Bağla",
                      onConfirm: async () => {
                        await run(
                          () => onSetClosed(true),
                          "Sayt ödənişləri bağlandı",
                          {
                            refresh: false,
                            onSuccess: setGate,
                          },
                        );
                      },
                    })
                  }
                >
                  Ödənişləri hələlik bağla
                </button>
              )}
            </div>
          </>
        )}
      </article>
    </section>
  );
}
