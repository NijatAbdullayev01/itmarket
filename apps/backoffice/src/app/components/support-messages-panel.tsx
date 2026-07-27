"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type {
  StaffSupportMessageStatus,
  StaffSupportMessageSummaryContract,
  StaffSupportThreadDetailContract,
  SupportChatMessageContract,
  SupportChatRealtimeEvent,
} from "@itmarket/contracts";

import { formatAzDateTime } from "../../lib/format-az-date";

type StatusFilter = StaffSupportMessageStatus | "ALL";

type SupportMessagesPanelProps = {
  messages: StaffSupportMessageSummaryContract[];
  canManage: boolean;
  onUpdateStatus: (
    id: string,
    status: StaffSupportMessageStatus,
  ) => Promise<void>;
  onLoadThread: (id: string) => Promise<StaffSupportThreadDetailContract>;
  onReply: (id: string, body: string) => Promise<SupportChatMessageContract>;
  onSubscribeInbox: (
    handler: (event: SupportChatRealtimeEvent) => void,
  ) => () => void;
  onSubscribeThread: (
    id: string,
    handler: (event: SupportChatRealtimeEvent) => void,
  ) => () => void;
};

const STATUS_LABELS: Record<StaffSupportMessageStatus, string> = {
  PENDING: "Gözləyir",
  OPEN: "Açıq",
  CLOSED: "Bağlanıb",
};

function nextActions(
  status: StaffSupportMessageStatus,
): StaffSupportMessageStatus[] {
  if (status === "PENDING") {
    return ["OPEN", "CLOSED"];
  }
  if (status === "OPEN") {
    return ["CLOSED"];
  }
  return [];
}

function mergeMessages(
  current: SupportChatMessageContract[],
  incoming: SupportChatMessageContract[],
): SupportChatMessageContract[] {
  const byId = new Map(current.map((row) => [row.id, row]));
  for (const row of incoming) {
    byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function SupportMessagesPanel({
  messages: initialThreads,
  canManage,
  onUpdateStatus,
  onLoadThread,
  onReply,
  onSubscribeInbox,
  onSubscribeThread,
}: SupportMessagesPanelProps) {
  const [threads, setThreads] =
    useState<StaffSupportMessageSummaryContract[]>(initialThreads);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("PENDING");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<SupportChatMessageContract[]>(
    [],
  );
  const [selectedStatus, setSelectedStatus] =
    useState<StaffSupportMessageStatus | null>(null);
  const [draft, setDraft] = useState("");
  const [replyPending, setReplyPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setThreads(initialThreads);
  }, [initialThreads]);

  useEffect(() => {
    return onSubscribeInbox((event) => {
      if (event.type === "thread") {
        setThreads((current) => {
          const without = current.filter((row) => row.id !== event.threadId);
          return [event.thread, ...without].sort((a, b) =>
            b.lastMessageAt.localeCompare(a.lastMessageAt),
          );
        });
        return;
      }
      if (event.type === "message") {
        setThreads((current) =>
          current
            .map((row) =>
              row.id === event.threadId
                ? {
                    ...row,
                    lastMessagePreview: event.message.body,
                    lastMessageAt: event.message.createdAt,
                    body: event.message.body,
                    status:
                      event.message.senderType === "CUSTOMER" &&
                      row.status === "OPEN"
                        ? "PENDING"
                        : row.status,
                  }
                : row,
            )
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
        );
        if (selectedId === event.threadId) {
          setChatMessages((current) =>
            mergeMessages(current, [event.message]),
          );
        }
        return;
      }
      if (event.type === "status") {
        setThreads((current) =>
          current.map((row) =>
            row.id === event.threadId ? { ...row, status: event.status } : row,
          ),
        );
        if (selectedId === event.threadId) {
          setSelectedStatus(event.status);
        }
      }
    });
  }, [onSubscribeInbox, selectedId]);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    let cancelled = false;
    setLoadError(null);
    void onLoadThread(selectedId)
      .then((thread) => {
        if (cancelled) {
          return;
        }
        setChatMessages(thread.messages);
        setSelectedStatus(thread.status);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setLoadError(
          error instanceof Error ? error.message : "Söhbət yüklənə bilmədi",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, onLoadThread]);

  useEffect(() => {
    if (selectedId === null) {
      return;
    }
    return onSubscribeThread(selectedId, (event) => {
      if (event.type === "message" && event.threadId === selectedId) {
        setChatMessages((current) => mergeMessages(current, [event.message]));
      }
      if (event.type === "status" && event.threadId === selectedId) {
        setSelectedStatus(event.status);
      }
    });
  }, [selectedId, onSubscribeThread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, selectedId]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("az");
    return threads.filter((row) => {
      if (statusFilter !== "ALL" && row.status !== statusFilter) {
        return false;
      }
      if (query === "") {
        return true;
      }
      const haystack = [
        row.name,
        row.phone,
        row.email,
        row.body,
        row.lastMessagePreview,
        row.pagePath,
        row.customerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("az");
      return haystack.includes(query);
    });
  }, [threads, searchQuery, statusFilter]);

  const pendingCount = useMemo(
    () => threads.filter((row) => row.status === "PENDING").length,
    [threads],
  );

  const selectedThread =
    selectedId === null
      ? null
      : (threads.find((row) => row.id === selectedId) ?? null);

  async function handleStatusUpdate(
    id: string,
    status: StaffSupportMessageStatus,
  ) {
    setPendingId(id);
    try {
      await onUpdateStatus(id, status);
      setThreads((current) =>
        current.map((row) => (row.id === id ? { ...row, status } : row)),
      );
      if (selectedId === id) {
        setSelectedStatus(status);
      }
    } finally {
      setPendingId(null);
    }
  }

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    if (selectedId === null || selectedStatus === "CLOSED") {
      return;
    }
    const body = draft.trim();
    if (body.length < 1) {
      return;
    }
    setReplyPending(true);
    try {
      const message = await onReply(selectedId, body);
      setChatMessages((current) => mergeMessages(current, [message]));
      setDraft("");
      setSelectedStatus((current) =>
        current === "PENDING" ? "OPEN" : current,
      );
      setThreads((current) =>
        current
          .map((row) =>
            row.id === selectedId
              ? {
                  ...row,
                  status: row.status === "PENDING" ? "OPEN" : row.status,
                  lastMessagePreview: message.body,
                  lastMessageAt: message.createdAt,
                  body: message.body,
                }
              : row,
          )
          .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
      );
    } finally {
      setReplyPending(false);
    }
  }

  if (!canManage) {
    return (
      <section className="catalog-section" aria-label="Mesajlar">
        <article className="operation-card">
          <h2>Giriş icazəsi yoxdur</h2>
          <p className="card-note">
            Bu səhifəyə yalnız <code>support-messages.manage</code> icazəsi olan
            əməkdaşlar daxil ola bilər.
          </p>
        </article>
      </section>
    );
  }

  return (
    <section className="catalog-section" aria-label="Mesajlar">
      <div className="catalog-metrics" aria-label="Mesaj statistikası">
        <article className="catalog-metric catalog-metric--accent">
          <span className="catalog-metric__label">Gözləyən</span>
          <strong className="catalog-metric__value">{pendingCount}</strong>
        </article>
        <article className="catalog-metric">
          <span className="catalog-metric__label">Siyahıda</span>
          <strong className="catalog-metric__value">{filtered.length}</strong>
        </article>
      </div>

      <div className="support-chat-layout">
        <article className="operation-card operation-card--no-hover support-chat-layout__list">
          <header className="catalog-subcategories-toolbar">
            <div className="catalog-subcategories-toolbar__filters">
              <label className="catalog-subcategories-filter">
                <span className="catalog-subcategories-filter__label">
                  Status
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as StatusFilter)
                  }
                >
                  <option value="PENDING">Gözləyir</option>
                  <option value="OPEN">Açıq</option>
                  <option value="CLOSED">Bağlanıb</option>
                  <option value="ALL">Hamısı</option>
                </select>
              </label>
              <label className="catalog-subcategories-filter">
                <span className="catalog-subcategories-filter__label">
                  Axtarış
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Ad, telefon və ya mesaj"
                  autoComplete="off"
                />
              </label>
            </div>
          </header>

          {filtered.length === 0 ? (
            <p className="card-note">
              {threads.length === 0
                ? "Hələ heç bir mesaj yoxdur."
                : "Filterə uyğun mesaj tapılmadı."}
            </p>
          ) : (
            <ul className="support-chat-thread-list">
              {filtered.map((row) => {
                const active = row.id === selectedId;
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      className={
                        active
                          ? "bo-btn-reset support-chat-thread support-chat-thread--active"
                          : "bo-btn-reset support-chat-thread"
                      }
                      onClick={() => setSelectedId(row.id)}
                    >
                      <span className="support-chat-thread__top">
                        <strong>{row.name}</strong>
                        <span>{STATUS_LABELS[row.status]}</span>
                      </span>
                      <span className="support-chat-thread__preview">
                        {row.lastMessagePreview}
                      </span>
                      <span className="support-chat-thread__meta">
                        {row.phone} ·{" "}
                        {formatAzDateTime(row.lastMessageAt, row.lastMessageAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </article>

        <article className="operation-card operation-card--no-hover support-chat-layout__room">
          {selectedThread === null ? (
            <p className="card-note">
              Canlı cavab vermək üçün soldan bir söhbət seçin.
            </p>
          ) : (
            <>
              <header className="support-chat-room__head">
                <div>
                  <h2>{selectedThread.name}</h2>
                  <p className="card-note">
                    <a href={`tel:${selectedThread.phone}`}>
                      {selectedThread.phone}
                    </a>
                    {selectedThread.email
                      ? ` · ${selectedThread.email}`
                      : ""}
                    {selectedThread.pagePath
                      ? ` · ${selectedThread.pagePath}`
                      : ""}
                  </p>
                </div>
                <div className="inquiries-actions">
                  {nextActions(selectedStatus ?? selectedThread.status).map(
                    (status) => (
                      <button
                        key={status}
                        type="button"
                        className={
                          status === "CLOSED"
                            ? "catalog-subcategories-form__cancel"
                            : "catalog-subcategories-form__submit"
                        }
                        disabled={pendingId === selectedThread.id}
                        onClick={() =>
                          void handleStatusUpdate(selectedThread.id, status)
                        }
                      >
                        {pendingId === selectedThread.id
                          ? "…"
                          : STATUS_LABELS[status]}
                      </button>
                    ),
                  )}
                </div>
              </header>

              {loadError ? (
                <p className="card-note">{loadError}</p>
              ) : (
                <div className="support-chat-room__messages" aria-live="polite">
                  {chatMessages.map((message) => {
                    const staff = message.senderType === "STAFF";
                    return (
                      <div
                        key={message.id}
                        className={
                          staff
                            ? "support-chat-bubble support-chat-bubble--staff"
                            : "support-chat-bubble support-chat-bubble--customer"
                        }
                      >
                        <span className="support-chat-bubble__meta">
                          {staff
                            ? (message.staffDisplayName ?? "Dəstək")
                            : selectedThread.name}
                        </span>
                        <p>{message.body}</p>
                        <time dateTime={message.createdAt}>
                          {formatChatTime(message.createdAt)}
                        </time>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}

              {(selectedStatus ?? selectedThread.status) === "CLOSED" ? (
                <p className="card-note">Bu söhbət bağlanıb.</p>
              ) : (
                <form className="support-chat-room__composer" onSubmit={handleReply}>
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.currentTarget.value)}
                    placeholder="Canlı cavab yazın..."
                    rows={3}
                    maxLength={2000}
                    required
                  />
                  <button
                    type="submit"
                    className="catalog-subcategories-form__submit"
                    disabled={replyPending}
                  >
                    {replyPending ? "Göndərilir…" : "Göndər"}
                  </button>
                </form>
              )}
            </>
          )}
        </article>
      </div>
    </section>
  );
}
