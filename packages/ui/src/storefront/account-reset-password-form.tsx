"use client";

import Link from "next/link";
import { useState, useTransition, type FormEvent } from "react";

import { Button } from "../primitives/button";

type ResetPasswordActionResult = {
  error?: string;
  reset?: boolean;
};

export type AccountResetPasswordFormCopy = {
  title: string;
  lead: string;
  successHint: string;
  signIn: string;
  password: string;
  submit: string;
  waiting: string;
  backToSignIn: string;
};

export const defaultAccountResetPasswordFormCopy: AccountResetPasswordFormCopy =
  {
    title: "Yeni şifrə təyin et",
    lead: "Hesabınız üçün yeni şifrə seçin. Ən azı 8 simvol istifadə edin.",
    successHint:
      "Şifrəniz uğurla yeniləndi. İndi yeni şifrə ilə daxil ola bilərsiniz.",
    signIn: "Daxil ol",
    password: "Yeni şifrə",
    submit: "Şifrəni yenilə",
    waiting: "Gözləyin...",
    backToSignIn: "Daxil ol səhifəsinə qayıt",
  };

type AccountResetPasswordFormProps = {
  token: string;
  onSubmit: (formData: FormData) => Promise<ResetPasswordActionResult>;
  copy?: Partial<AccountResetPasswordFormCopy>;
};

export function AccountResetPasswordForm({
  token,
  onSubmit,
  copy: copyProp,
}: AccountResetPasswordFormProps) {
  const copy = { ...defaultAccountResetPasswordFormCopy, ...copyProp };
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
        <h2 className="ui-account-auth__title">{copy.title}</h2>
        <p className="ui-account-auth__lead">{copy.lead}</p>
      </header>

      {reset ? (
        <div className="ui-account-auth__signed-in">
          <p className="ui-account-auth__hint">{copy.successHint}</p>
          <Link className="ui-account-auth__back-link" href="/account">
            {copy.signIn}
          </Link>
        </div>
      ) : (
        <form className="ui-account-auth__form" onSubmit={handleSubmit}>
          <div className="ui-field">
            <label htmlFor="reset-password">{copy.password}</label>
            <input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
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
          <Link className="ui-account-auth__back-link" href="/account">
            {copy.backToSignIn}
          </Link>
        </form>
      )}
    </section>
  );
}
