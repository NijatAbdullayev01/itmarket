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

export type ChatBubbleProps = {
  initialName?: string;
  initialPhone?: string;
  initialEmail?: string;
  loadSession: () => SupportChatSession | null;
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
): string {
  if (!hasSession) {
    return "Bir qədər əvvəl aktiv";
  }
  if (status === "CLOSED") {
    return "Söhbət bağlanıb";
  }
  if (status === "OPEN") {
    return "İndi aktiv";
  }
  return "Cavab gözlənilir";
}

export function ChatBubble({
  initialName = "",
  initialPhone = "",
  initialEmail = "",
  loadSession,
  saveSession,
  clearSession,
  onStart,
  onLoadThread,
  onSendMessage,
  onSubscribe,
}: ChatBubbleProps) {
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

    setError(null);
    setNeedContact(false);
    const existing = loadSession();
    if (existing === null) {
      setSession(null);
      setMessages([]);
      setStatus(null);
      setName(initialName);
      setPhone(initialPhone);
      setEmail(initialEmail);
      setDraft("");
      const frame = window.requestAnimationFrame(() => {
        composerRef.current?.focus({ preventScroll: true });
      });
      return () => window.cancelAnimationFrame(frame);
    }

    setSession(existing);
    setBooting(true);
    void onLoadThread(existing)
      .then((thread) => {
        setMessages(thread.messages);
        setStatus(thread.status);
      })
      .catch((loadError: unknown) => {
        clearSession();
        setSession(null);
        setMessages([]);
        setStatus(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Söhbət yüklənə bilmədi",
        );
      })
      .finally(() => setBooting(false));
  }, [
    open,
    initialName,
    initialPhone,
    initialEmail,
    loadSession,
    onLoadThread,
    clearSession,
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

  function ensureContactReady(): boolean {
    const normalizedName = name.trim();
    const normalizedPhone = phone.trim();
    if (normalizedName.length >= 2 && normalizedPhone.length >= 7) {
      return true;
    }
    setNeedContact(true);
    setError("Cavab üçün ad və telefon nömrənizi daxil edin");
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
      setError("Bu söhbət bağlanıb. Yeni söhbət açın.");
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
              : "Mesaj göndərilə bilmədi",
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
      setError("E-poçt ünvanı düzgün deyil");
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
        if (thread.guestToken === undefined) {
          throw new Error("Söhbət tokeni alınmadı");
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
            : "Söhbət başladılmadı",
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
        aria-label={open ? "Dəstəyi bağla" : "Canlı dəstək"}
        title="Canlı dəstək"
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
                      Dəstək komandası
                    </h2>
                    <p
                      className="ui-support-chat__status"
                      id={descriptionId}
                      data-online={status === "OPEN" || session === null}
                    >
                      <span className="ui-support-chat__status-dot" />
                      {statusLabel(status, session !== null)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="ui-support-chat__icon-btn"
                  aria-label="Bağla"
                  onClick={() => setOpen(false)}
                  disabled={pending}
                >
                  <IconClose width={18} height={18} />
                </button>
              </header>

              <div className="ui-support-chat__body">
                {booting ? (
                  <p className="ui-support-chat__loading">Söhbət yüklənir…</p>
                ) : (
                  <>
                    {showWelcome ? (
                      <div className="ui-support-chat__welcome">
                        <SupportAvatar size={72} />
                        <strong>Dəstək komandası</strong>
                        <p>Bizdən nəsə soruşun və ya fikrinizi bölüşün.</p>
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
                            {WELCOME_MESSAGE}
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
                    Operator cavabı üçün əlaqə məlumatlarınız
                  </p>
                  <div className="ui-support-chat__contact-fields">
                    <input
                      ref={nameInputRef}
                      value={name}
                      onChange={(event) => setName(event.currentTarget.value)}
                      placeholder="Ad, soyad"
                      autoComplete="name"
                      aria-label="Ad, soyad"
                    />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.currentTarget.value)}
                      placeholder="Telefon"
                      autoComplete="tel"
                      inputMode="tel"
                      aria-label="Telefon"
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
                  <span>Söhbət bağlanıb.</span>
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
                    Yeni söhbət
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
                      placeholder="Mesajınızı daxil edin"
                      rows={1}
                      maxLength={2000}
                      disabled={pending}
                      aria-label="Mesajınızı daxil edin"
                    />
                    <button
                      type="submit"
                      className="ui-support-chat__send"
                      disabled={pending || draft.trim().length === 0}
                      aria-label="Göndər"
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
