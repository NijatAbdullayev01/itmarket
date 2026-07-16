"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition, type FormEvent } from "react";

import { Button } from "../primitives/button";
import { PasswordInput } from "../primitives/password-input";
import { IconClose } from "./icons";

export type CustomerProfile = {
  id: string;
  email: string;
};

type AuthMode = "login" | "register";

type AuthActionResult = {
  error?: string;
  customer?: CustomerProfile;
};

type AccountAuthFormProps = {
  customer: CustomerProfile | null;
  onLogin: (formData: FormData) => Promise<AuthActionResult>;
  onRegister: (formData: FormData) => Promise<AuthActionResult>;
  onLogout: () => Promise<AuthActionResult>;
};

export function AccountAuthForm({
  customer: initialCustomer,
  onLogin,
  onRegister,
  onLogout,
}: AccountAuthFormProps) {
  const router = useRouter();
  const formId = useId();
  const [mode, setMode] = useState<AuthMode>("login");
  const [customer, setCustomer] = useState(initialCustomer);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setCustomer(initialCustomer);
  }, [initialCustomer]);

  function handleAuthSubmit(
    event: FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<AuthActionResult>,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    if (mode === "register") {
      const password = formData.get("password");
      const passwordConfirm = formData.get("passwordConfirm");
      if (
        typeof password === "string" &&
        typeof passwordConfirm === "string" &&
        password !== passwordConfirm
      ) {
        setError("Şifrələr uyğun gəlmir");
        return;
      }
    }

    startTransition(async () => {
      const result = await action(formData);
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }

      if (result.customer !== undefined) {
        setCustomer(result.customer);
      }
      setError(null);
    });
  }

  function handleLogout() {
    startTransition(async () => {
      const result = await onLogout();
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }
      setCustomer(null);
      setMode("login");
      setError(null);
    });
  }

  function handleClose() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  }

  return (
    <section className="ui-account-auth">
      <button
        type="button"
        className="ui-account-auth__close ui-icon-btn"
        onClick={handleClose}
        aria-label="Geri qayıt"
      >
        <IconClose width={18} height={18} />
      </button>
      <header className="ui-account-auth__header">
        <h2 className="ui-account-auth__title">
          {customer === null
            ? mode === "login"
              ? "Daxil olun"
              : "Qeydiyyat"
            : "Hesabınız"}
        </h2>
        <p className="ui-account-auth__lead">
          {customer === null
            ? mode === "login"
              ? "Sifarişlərinizi izləmək və şəxsi təkliflərdən yararlanmaq üçün hesabınıza daxil olun."
              : "Yeni hesab yaradaraq sifarişlərinizi izləyin və şəxsi təkliflərdən yararlanın."
            : "Hesabınıza uğurla daxil oldunuz."}
        </p>
      </header>

      {customer === null ? (
        <>
          <div
            className="ui-account-auth__tabs"
            role="tablist"
            aria-label="Hesab rejimi"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={
                mode === "login"
                  ? "ui-account-auth__tab ui-account-auth__tab--active"
                  : "ui-account-auth__tab"
              }
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              Daxil ol
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={
                mode === "register"
                  ? "ui-account-auth__tab ui-account-auth__tab--active"
                  : "ui-account-auth__tab"
              }
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              Qeydiyyat
            </button>
          </div>

          <form
            className="ui-account-auth__form"
            onSubmit={(event) =>
              handleAuthSubmit(event, mode === "login" ? onLogin : onRegister)
            }
          >
            {mode === "register" ? (
              <div className="ui-account-auth__name-row">
                <div className="ui-field">
                  <label htmlFor={`${formId}-first-name`}>Ad</label>
                  <input
                    id={`${formId}-first-name`}
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    minLength={2}
                    maxLength={60}
                    required
                  />
                </div>
                <div className="ui-field">
                  <label htmlFor={`${formId}-last-name`}>Soyad</label>
                  <input
                    id={`${formId}-last-name`}
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    minLength={2}
                    maxLength={60}
                    required
                  />
                </div>
              </div>
            ) : null}
            <div className="ui-field">
              <label htmlFor={`${formId}-email`}>E-poçt</label>
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </div>
            <div className="ui-field">
              <label htmlFor={`${formId}-password`}>Şifrə</label>
              <PasswordInput
                id={`${formId}-password`}
                name="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={12}
                required
              />
              {mode === "login" ? (
                <Link
                  className="ui-account-auth__forgot-link"
                  href="/account/forgot-password"
                >
                  Şifrəni unutmusan?
                </Link>
              ) : null}
            </div>
            {mode === "register" ? (
              <div className="ui-field">
                <label htmlFor={`${formId}-password-confirm`}>
                  Şifrənin təkrarı
                </label>
                <PasswordInput
                  id={`${formId}-password-confirm`}
                  name="passwordConfirm"
                  autoComplete="new-password"
                  minLength={12}
                  required
                />
              </div>
            ) : null}
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
              {pending
                ? "Gözləyin..."
                : mode === "login"
                  ? "Daxil ol"
                  : "Qeydiyyatdan keç"}
            </Button>
          </form>
        </>
      ) : (
        <div className="ui-account-auth__signed-in">
          <p className="ui-account-auth__email">{customer.email}</p>
          <p className="ui-account-auth__hint">
            Sifariş tarixçəsi və şəxsi təkliflər tezliklə burada görünəcək.
          </p>
          {error !== null ? (
            <p className="ui-field__error" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            block
            disabled={pending}
            onClick={handleLogout}
          >
            {pending ? "Gözləyin..." : "Çıxış"}
          </Button>
          <Link className="ui-account-auth__back-link" href="/">
            Kataloqa keç
          </Link>
        </div>
      )}
    </section>
  );
}
