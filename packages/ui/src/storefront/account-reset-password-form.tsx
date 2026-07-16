"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "../primitives/button";

type ResetPasswordActionResult = {
  error?: string;
  reset?: boolean;
};

type AccountResetPasswordFormProps = {
  token: string;
  onSubmit: (formData: FormData) => Promise<ResetPasswordActionResult>;
};

export function AccountResetPasswordForm({
  token,
  onSubmit,
}: AccountResetPasswordFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("token", token);

    startTransition(async () => {
      const result = await onSubmit(formData);
      if (result.error !== undefined) {
        setError(result.error);
        setReset(false);
        return;
      }

      setError(null);
      setReset(true);
    });
  }

  return (
    <section className="ui-account-auth">
      <header className="ui-account-auth__header">
        <h2 className="ui-account-auth__title">Yeni şifrə təyin et</h2>
        <p className="ui-account-auth__lead">
          Hesabınız üçün yeni şifrə seçin. Ən azı 12 simvol istifadə edin.
        </p>
      </header>

      {reset ? (
        <div className="ui-account-auth__signed-in">
          <p className="ui-account-auth__hint">
            Şifrəniz uğurla yeniləndi. İndi yeni şifrə ilə daxil ola bilərsiniz.
          </p>
          <Link className="ui-account-auth__back-link" href="/account">
            Daxil ol
          </Link>
        </div>
      ) : (
        <form className="ui-account-auth__form" onSubmit={handleSubmit}>
          <div className="ui-field">
            <label htmlFor="reset-password">Yeni şifrə</label>
            <input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
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
            {pending ? "Gözləyin..." : "Şifrəni yenilə"}
          </Button>
          <Link className="ui-account-auth__back-link" href="/account">
            Daxil ol səhifəsinə qayıt
          </Link>
        </form>
      )}
    </section>
  );
}
