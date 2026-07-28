"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "../primitives/button";
import { IconClose } from "./icons";

type ForgotPasswordActionResult = {
  error?: string;
  accepted?: boolean;
  devResetUrl?: string;
};

export type AccountForgotPasswordFormCopy = {
  backAria: string;
  title: string;
  lead: string;
  acceptedHint: string;
  devResetPrefix: string;
  devResetLink: string;
  backToSignIn: string;
  email: string;
  submit: string;
  waiting: string;
};

export const defaultAccountForgotPasswordFormCopy: AccountForgotPasswordFormCopy =
  {
    backAria: "Geri qayıt",
    title: "Şifrəni bərpa et",
    lead: "Hesabınıza bağlı e-poçt ünvanını daxil edin. Şifrəni yeniləmək üçün təlimat göndərəcəyik.",
    acceptedHint:
      "Əgər bu e-poçt ünvanı sistemdə qeydiyyatdadırsa, şifrə bərpası təlimatı göndərildi.",
    devResetPrefix: "İnkişaf mühiti:",
    devResetLink: "bərpa linkinə keç",
    backToSignIn: "Daxil ol səhifəsinə qayıt",
    email: "E-poçt",
    submit: "Bərpa linki göndər",
    waiting: "Gözləyin...",
  };

type AccountForgotPasswordFormProps = {
  onSubmit: (formData: FormData) => Promise<ForgotPasswordActionResult>;
  copy?: Partial<AccountForgotPasswordFormCopy>;
};

export function AccountForgotPasswordForm({
  onSubmit,
  copy: copyProp,
}: AccountForgotPasswordFormProps) {
  const router = useRouter();
  const copy = { ...defaultAccountForgotPasswordFormCopy, ...copyProp };
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleClose() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.error !== undefined) {
        setError(result.error);
        setAccepted(false);
        setDevResetUrl(null);
        return;
      }

      setError(null);
      setAccepted(true);
      setDevResetUrl(result.devResetUrl ?? null);
    });
  }

  return (
    <section className="ui-account-auth">
      <button
        type="button"
        className="ui-account-auth__close ui-icon-btn"
        onClick={handleClose}
        aria-label={copy.backAria}
      >
        <IconClose width={18} height={18} />
      </button>
      <header className="ui-account-auth__header">
        <h2 className="ui-account-auth__title">{copy.title}</h2>
        <p className="ui-account-auth__lead">{copy.lead}</p>
      </header>

      {accepted ? (
        <div className="ui-account-auth__signed-in">
          <p className="ui-account-auth__hint">{copy.acceptedHint}</p>
          {devResetUrl !== null ? (
            <p className="ui-account-auth__hint">
              {copy.devResetPrefix}{" "}
              <Link className="ui-account-auth__back-link" href={devResetUrl}>
                {copy.devResetLink}
              </Link>
            </p>
          ) : null}
          <Link className="ui-account-auth__back-link" href="/account" replace>
            {copy.backToSignIn}
          </Link>
        </div>
      ) : (
        <form className="ui-account-auth__form" onSubmit={handleSubmit}>
          <div className="ui-field">
            <label htmlFor="forgot-password-email">{copy.email}</label>
            <input
              id="forgot-password-email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
          </div>
          {error !== null ? (
            <p className="ui-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            block
            disabled={pending}
            className="ui-btn--cta"
          >
            {pending ? copy.waiting : copy.submit}
          </Button>
          <Link className="ui-account-auth__back-link" href="/account" replace>
            {copy.backToSignIn}
          </Link>
        </form>
      )}
    </section>
  );
}
