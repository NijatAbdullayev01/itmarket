"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

import type { SupportChatMessageContract } from "@itmarket/contracts";

import { formatAzDate } from "../utils/format-az-date";
import { IconChat, IconClose } from "./icons";

export type SupportChatSession = {
  threadId: string;
  guestToken: string;
};

export type SupportChatThreadSnapshot = {
  id: string;
  status: "PENDING" | "OPEN" | "CLOSED";
  messages: SupportChatMessageContract[];
  guestToken?: string;
};

export type ChatBubbleCopy = {
  openLabel: string;
  closeLabel: string;
  chatTitle: string;
  teamTitle: string;
  teamWelcome: string;
  statusRecent: string;
  statusClosed: string;
  statusOnline: string;
  statusWaiting: string;
  welcomeMessage: string;
  contactLead: string;
  namePlaceholder: string;
  nameAria: string;
  phonePlaceholder: string;
  phoneAria: string;
  closedNotice: string;
  newChat: string;
  composerPlaceholder: string;
  composerAria: string;
  send: string;
  loading: string;
  contactRequiredError: string;
  closedError: string;
  sendError: string;
  emailInvalidError: string;
  startError: string;
  loadError: string;
};

export const defaultChatBubbleCopy: ChatBubbleCopy = {
  openLabel: "Dəstək çatını aç",
  closeLabel: "Dəstək çatını bağla",
  chatTitle: "Canlı dəstək",
  teamTitle: "Dəstək komandası",
  teamWelcome: "Bizdən nəsə soruşun və ya fikrinizi bölüşün.",
  statusRecent: "Bir qədər əvvəl aktiv",
  statusClosed: "Söhbət bağlanıb",
  statusOnline: "İndi aktiv",
  statusWaiting: "Cavab gözlənilir",
  welcomeMessage:
    "Salam. Hansı məhsulu əldə etmək istəyirsiniz? Axtardığınızı tapmaqda Sizə kömək edə bilərəm.",
  contactLead: "Operator cavabı üçün əlaqə məlumatlarınız",
  namePlaceholder: "Ad, soyad",
  nameAria: "Ad, soyad",
  phonePlaceholder: "Telefon",
  phoneAria: "Telefon",
  closedNotice: "Söhbət bağlanıb.",
  newChat: "Yeni söhbət",
  composerPlaceholder: "Mesajınızı daxil edin",
  composerAria: "Mesajınızı daxil edin",
  send: "Göndər",
  loading: "Söhbət yüklənir…",
  contactRequiredError: "Əlaqə məlumatları tələb olunur",
  closedError: "Bu söhbət bağlanıb. Yeni söhbət açın.",
  sendError: "Mesaj göndərilə bilmədi",
  emailInvalidError: "E-poçt ünvanı düzgün deyil",
  startError: "Söhbət başladılmadı",
  loadError: "Söhbət yüklənə bilmədi",
};

export type ChatBubbleProps = {
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  loadSession: () => SupportChatSession | null;
  /** Optional async restore (e.g. httpOnly cookie → sessionStorage). */
  hydrateSession?: () => Promise<SupportChatSession | null>;
  saveSession: (session: SupportChatSession) => void;
  clearSession: () => void;
  onStart: (input: {
    name: string;
    phone: string;
    email?: string;
    body: string;
    pagePath: string;
  }) => Promise<SupportChatThreadSnapshot>;
  onLoadThread: (
    session: SupportChatSession,
  ) => Promise<SupportChatThreadSnapshot>;
  onSendMessage: (
    session: SupportChatSession,
    body: string,
  ) => Promise<SupportChatMessageContract>;
  onSubscribe: (
    session: SupportChatSession,
    handlers: {
      onMessage: (message: SupportChatMessageContract) => void;
      onStatus: (status: SupportChatThreadSnapshot["status"]) => void;
    },
  ) => () => void;
  copy?: Partial<ChatBubbleCopy>;
  /** Optional `window` custom-event name that opens the chat bubble. */
  autoOpenEvent?: string;
};

const WELCOME_MESSAGE =
  "Salam. Hansı məhsulu əldə etmək istəyirsiniz? Axtardığınızı tapmaqda Sizə kömək edə bilərəm.";

function formatChatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
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

function SupportAvatar({ size = 40 }: { size?: number }) {
  return (
    <span
      className="ui-support-chat__avatar"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img src="/images/logo.png" alt="" width={size} height={size} />
    </span>
  );
}

function IconSend(props: { width?: number; height?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={props.width ?? 20}
      height={props.height ?? 20}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22 11 13 2 9l20-7Z" />
    </svg>
  );
}

function statusLabel(
  status: SupportChatThreadSnapshot["status"] | null,
  hasSession: boolean,
  copy: ChatBubbleCopy,
): string {
  if (!hasSession) {
    return copy.statusRecent;
  }
  if (status === "CLOSED") {
    return copy.statusClosed;
  }
  if (status === "OPEN") {
    return copy.statusOnline;
  }
  return copy.statusWaiting;
}

export function ChatBubble({
  initialName = "",
  initialPhone = "",
  initialEmail = "",
  loadSession,
  hydrateSession,
  saveSession,
  clearSession,
  onStart,
  onLoadThread,
  onSendMessage,
  onSubscribe,
  copy,
  autoOpenEvent,
}: ChatBubbleProps) {
  const resolvedCopy: ChatBubbleCopy = {
    ...defaultChatBubbleCopy,
    ...copy,
  };
  const titleId = useId();
  const descriptionId = useId();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SupportChatSession | null>(null);
  const [status, setStatus] = useState<
    SupportChatThreadSnapshot["status"] | null
  >(null);
  const [messages, setMessages] = useState<SupportChatMessageContract[]>([]);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [booting, setBooting] = useState(false);
  const [needContact, setNeedContact] = useState(false);
  const [pending, startTransition] = useTransition();

  const todayLabel = formatAzDate(new Date().toISOString());
  const showWelcome = !booting && messages.length === 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setError(null);
    setNeedContact(false);

    const boot = async () => {
      let existing = loadSession();
      if (existing === null && hydrateSession !== undefined) {
        existing = await hydrateSession();
      }
      if (cancelled) {
        return;
      }
      if (existing === null) {
        setSession(null);
        setMessages([]);
        setStatus(null);
        setName(initialName);
        setPhone(initialPhone);
        setEmail(initialEmail);
        setDraft("");
        window.requestAnimationFrame(() => {
          composerRef.current?.focus({ preventScroll: true });
        });
        return;
      }

      setSession(existing);
      setBooting(true);
      try {
        const thread = await onLoadThread(existing);
        if (cancelled) {
          return;
        }
        setMessages(thread.messages);
        setStatus(thread.status);
      } catch (loadError: unknown) {
        if (cancelled) {
          return;
        }
        clearSession();
        setSession(null);
        setMessages([]);
        setStatus(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : resolvedCopy.loadError,
        );
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [
    open,
    initialName,
    initialPhone,
    initialEmail,
    loadSession,
    hydrateSession,
    onLoadThread,
    clearSession,
    resolvedCopy.loadError,
  ]);

  useEffect(() => {
    if (!open || session === null) {
      return;
    }
    return onSubscribe(session, {
      onMessage: (message) => {
        setMessages((current) => mergeMessages(current, [message]));
      },
      onStatus: (nextStatus) => {
        setStatus(nextStatus);
      },
    });
  }, [open, session, onSubscribe]);

  useEffect(() => {
    if (!open) {
      return;
    }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, showWelcome]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, pending]);

  useEffect(() => {
    if (autoOpenEvent === undefined) {
      return;
    }
    const open = () => setOpen(true);
    window.addEventListener(autoOpenEvent, open);
    return () => window.removeEventListener(autoOpenEvent, open);
  }, [autoOpenEvent]);

  function ensureContactReady(): boolean {
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    if (normalizedName.length >= 2 && normalizedPhone.length >= 7) {
      return true;
    }
    setNeedContact(true);
    setError(resolvedCopy.contactRequiredError);
    window.requestAnimationFrame(() => {
      nameInputRef.current?.focus({ preventScroll: true });
    });
    return false;
  }

  function submitDraft() {
    const normalizedBody = draft.trim();
    if (normalizedBody.length < 1 || pending) {
      return;
    }
    if (status === "CLOSED") {
      setError(resolvedCopy.closedError);
      return;
    }

    if (session !== null) {
      startTransition(async () => {
        try {
          const message = await onSendMessage(session, normalizedBody);
          setMessages((current) => mergeMessages(current, [message]));
          setDraft("");
          setError(null);
        } catch (sendError: unknown) {
          setError(
            sendError instanceof Error
              ? sendError.message
              : resolvedCopy.sendError,
          );
        }
      });
      return;
    }

    if (!ensureContactReady()) {
      return;
    }

    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail !== "" &&
      (!normalizedEmail.includes("@") || normalizedEmail.length < 5)
    ) {
      setNeedContact(true);
      setError(resolvedCopy.emailInvalidError);
      return;
    }

    startTransition(async () => {
      try {
        const thread = await onStart({
          name: normalizedName,
          phone: normalizedPhone,
          body: normalizedBody,
          pagePath: pathname,
          ...(normalizedEmail === "" ? {} : { email: normalizedEmail }),
        });
        if (
          thread.guestToken === undefined ||
          thread.guestToken.trim() === ""
        ) {
          throw new Error(resolvedCopy.startError);
        }
        const nextSession = {
          threadId: thread.id,
          guestToken: thread.guestToken,
        };
        saveSession(nextSession);
        setSession(nextSession);
        setMessages(thread.messages);
        setStatus(thread.status);
        setDraft("");
        setError(null);
        setNeedContact(false);
      } catch (startError: unknown) {
        setError(
          startError instanceof Error
            ? startError.message
            : resolvedCopy.startError,
        );
      }
    });
  }

  function handleComposerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitDraft();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitDraft();
    }
  }

  return (
    <>
      <button
        type="button"
        className={
          open ? "ui-chat-bubble ui-chat-bubble--open" : "ui-chat-bubble"
        }
        aria-label={open ? resolvedCopy.closeLabel : resolvedCopy.chatTitle}
        title={resolvedCopy.chatTitle}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <IconClose width={22} height={22} />
        ) : (
          <IconChat width={24} height={24} />
        )}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="ui-support-chat"
              role="dialog"
              aria-modal="false"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
            >
              <header className="ui-support-chat__header">
                <div className="ui-support-chat__brand">
                  <SupportAvatar size={42} />
                  <div className="ui-support-chat__brand-text">
                    <h2 className="ui-support-chat__title" id={titleId}>
                      {resolvedCopy.teamTitle}
                    </h2>
                    <p
                      className="ui-support-chat__status"
                      id={descriptionId}
                      data-online={status === "OPEN" || session === null}
                    >
                      <span className="ui-support-chat__status-dot" />
                      {statusLabel(status, session !== null, resolvedCopy)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-support-chat__icon-btn"
                  aria-label={resolvedCopy.closeLabel}
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  <IconClose width={18} height={18} />
                </button>
              </header>

              <div className="ui-support-chat__body">
                {booting ? (
                  <p className="ui-support-chat__loading">{resolvedCopy.loading}</p>
                ) : (
                  <>
                    {showWelcome ? (
                      <div className="ui-support-chat__welcome">
                        <SupportAvatar size={72} />
                        <strong>{resolvedCopy.teamTitle}</strong>
                        <p>{resolvedCopy.teamWelcome}</p>
                      </div>
                    ) : null}

                    <div
                      className="ui-support-chat__messages"
                      aria-live="polite"
                    >
                      <div className="ui-support-chat__date" aria-hidden="true">
                        {todayLabel}
                      </div>

                      <div className="ui-support-chat__row ui-support-chat__row--staff">
                        <SupportAvatar size={28} />
                        <div className="ui-support-chat__bubble ui-support-chat__bubble--staff">
                          <p className="ui-support-chat__bubble-body">
                            {resolvedCopy.welcomeMessage}
                          </p>
                        </div>
                      </div>

                      {messages.map((message) => {
                        const mine = message.senderType === "CUSTOMER";
                        return (
                          <div
                            key={message.id}
                            className={
                              mine
                                ? "ui-support-chat__row ui-support-chat__row--mine"
                                : "ui-support-chat__row ui-support-chat__row--staff"
                            }
                          >
                            {!mine ? <SupportAvatar size={28} /> : null}
                            <div
                              className={
                                mine
                                  ? "ui-support-chat__bubble ui-support-chat__bubble--mine"
                                  : "ui-support-chat__bubble ui-support-chat__bubble--staff"
                              }
                            >
                              <p className="ui-support-chat__bubble-body">
                                {message.body}
                              </p>
                              <time
                                className="ui-support-chat__bubble-time"
                                dateTime={message.createdAt}
                              >
                                {formatChatTime(message.createdAt)}
                              </time>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </>
                )}
              </div>

              {needContact && session === null ? (
                <div className="ui-support-chat__contact">
                  <p className="ui-support-chat__contact-lead">
                    {resolvedCopy.contactLead}
                  </p>
                  <div className="ui-support-chat__contact-fields">
                    <input
                      ref={nameInputRef}
                      value={name}
                      onChange={(event) => setName(event.currentTarget.value)}
                      placeholder={resolvedCopy.namePlaceholder}
                      autoComplete="name"
                      aria-label={resolvedCopy.nameAria}
                    />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.currentTarget.value)}
                      placeholder={resolvedCopy.phonePlaceholder}
                      autoComplete="tel"
                      inputMode="tel"
                      aria-label={resolvedCopy.phoneAria}
                    />
                  </div>
                </div>
              ) : null}

              {error ? (
                <p className="ui-support-chat__error" role="alert">
                  {error}
                </p>
              ) : null}

              {status === "CLOSED" ? (
                <div className="ui-support-chat__closed-bar">
                  <span>{resolvedCopy.closedNotice}</span>
                  <button
                    type="button"
                    className="ui-support-chat__restart"
                    onClick={() => {
                      clearSession();
                      setSession(null);
                      setMessages([]);
                      setStatus(null);
                      setDraft("");
                      setError(null);
                      setNeedContact(false);
                      composerRef.current?.focus({ preventScroll: true });
                    }}
                  >
                    {resolvedCopy.newChat}
                  </button>
                </div>
              ) : (
                <form
                  className="ui-support-chat__composer"
                  onSubmit={handleComposerSubmit}
                >
                  <div className="ui-support-chat__composer-shell">
                    <textarea
                      ref={composerRef}
                      value={draft}
                      onChange={(event) => setDraft(event.currentTarget.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder={resolvedCopy.composerPlaceholder}
                      rows={1}
                      maxLength={2000}
                      disabled={pending}
                      aria-label={resolvedCopy.composerAria}
                    />
                    <button
                      type="submit"
                      className="ui-support-chat__send"
                      disabled={pending || draft.trim().length === 0}
                      aria-label={resolvedCopy.send}
                    >
                      <IconSend />
                    </button>
                  </div>
                </form>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
