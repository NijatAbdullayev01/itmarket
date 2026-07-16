"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "../primitives/button";

type ForgotPasswordActionResult = {
  error?: string;
  accepted?: boolean;
  devResetUrl?: string;
};

type AccountForgotPasswordFormProps = {
  onSubmit: (formData: FormData) => Promise<ForgotPasswordActionResult>;
};

export function AccountForgotPasswordForm({
  onSubmit,
}: AccountForgotPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      <header className="ui-account-auth__header">
        <h2 className="ui-account-auth__title">Şifrəni bərpa et</h2>
        <p className="ui-account-auth__lead">
          Hesabınıza bağlı e-poçt ünvanını daxil edin. Şifrəni yeniləmək üçün
          təlimat göndərəcəyik.
        </p>
      </header>

      {accepted ? (
        <div className="ui-account-auth__signed-in">
          <p className="ui-account-auth__hint">
            Əgər bu e-poçt ünvanı sistemdə qeydiyyatdadırsa, şifrə bərpası
            təlimatı göndərildi.
          </p>
          {devResetUrl !== null ? (
            <p className="ui-account-auth__hint">
              İnkişaf mühiti:{" "}
              <Link className="ui-account-auth__back-link" href={devResetUrl}>
                bərpa linkinə keç
              </Link>
            </p>
          ) : null}
          <Link className="ui-account-auth__back-link" href="/account">
            Daxil ol səhifəsinə qayıt
          </Link>
        </div>
      ) : (
        <form className="ui-account-auth__form" onSubmit={handleSubmit}>
          <div className="ui-field">
            <label htmlFor="forgot-password-email">E-poçt</label>
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
            {pending ? "Gözləyin..." : "Bərpa linki göndər"}
          </Button>
          <Link className="ui-account-auth__back-link" href="/account">
            Daxil ol səhifəsinə qayıt
          </Link>
        </form>
      )}
    </section>
  );
}
