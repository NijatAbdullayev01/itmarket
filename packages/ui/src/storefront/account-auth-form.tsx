"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useId,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { Button } from "../primitives/button";
import { PasswordInput } from "../primitives/password-input";
import { isCompleteEmail } from "../utils/is-complete-email";
import { IconClose } from "./icons";

export type CustomerProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
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
};

type FieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "passwordConfirm";

type FieldErrors = Partial<Record<FieldKey, string>>;

function readField(formData: FormData, key: FieldKey) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateAuthForm(mode: AuthMode, formData: FormData): FieldErrors {
  const errors: FieldErrors = {};
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  if (email === "") {
    errors.email = "E-poçt tələb olunur";
  } else if (!isCompleteEmail(email)) {
    errors.email = "Düzgün e-poçt daxil edin";
  }

  if (password === "") {
    errors.password = "Şifrə tələb olunur";
  } else if (password.length < 8) {
    errors.password = "Şifrə ən azı 8 simvol olmalıdır";
  }

  if (mode === "register") {
    const firstName = readField(formData, "firstName");
    const lastName = readField(formData, "lastName");
    const passwordConfirm = readField(formData, "passwordConfirm");

    if (firstName === "") {
      errors.firstName = "Ad tələb olunur";
    } else if (firstName.length < 2) {
      errors.firstName = "Ad ən azı 2 simvol olmalıdır";
    }

    if (lastName === "") {
      errors.lastName = "Soyad tələb olunur";
    } else if (lastName.length < 2) {
      errors.lastName = "Soyad ən azı 2 simvol olmalıdır";
    }

    if (passwordConfirm === "") {
      errors.passwordConfirm = "Şifrənin təkrarı tələb olunur";
    } else if (password !== passwordConfirm) {
      errors.passwordConfirm = "Şifrələr uyğun gəlmir";
    }
  }

  return errors;
}

export function AccountAuthForm({
  customer: _initialCustomer,
  onLogin,
  onRegister,
}: AccountAuthFormProps) {
  const router = useRouter();
  const formId = useId();
  const [mode, setMode] = useState<AuthMode>("login");
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function clearFieldError(field: FieldKey) {
    setFieldErrors((current) => {
      if (current[field] === undefined) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (error !== null && (field === "email" || field === "password")) {
      setError(null);
    }
  }

  function switchMode(nextMode: AuthMode) {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    setFormKey((current) => current + 1);
    setError(null);
    setFieldErrors({});
  }

  function enterAccount() {
    router.replace("/account");
    router.refresh();
  }

  function handleAuthSubmit(
    event: FormEvent<HTMLFormElement>,
    action: (formData: FormData) => Promise<AuthActionResult>,
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextFieldErrors = validateAuthForm(mode, formData);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError(null);
      return;
    }

    setFieldErrors({});

    startTransition(async () => {
      const result = await action(formData);
      if (result.error !== undefined) {
        setError(result.error);
        return;
      }

      setError(null);
      enterAccount();
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
          {mode === "login" ? "Daxil olun" : "Qeydiyyat"}
        </h2>
        <p className="ui-account-auth__lead">
          {mode === "login"
            ? "Sifarişlərinizi izləmək və şəxsi təkliflərdən yararlanmaq üçün hesabınıza daxil olun."
            : "Yeni hesab yaradaraq sifarişlərinizi izləyin və şəxsi təkliflərdən yararlanın."}
        </p>
      </header>

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
          onClick={() => switchMode("login")}
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
          onClick={() => switchMode("register")}
        >
          Qeydiyyat
        </button>
      </div>

      <form
        key={formKey}
        className="ui-account-auth__form"
        noValidate
        onSubmit={(event) =>
          handleAuthSubmit(event, mode === "login" ? onLogin : onRegister)
        }
      >
        {mode === "register" ? (
          <div className="ui-account-auth__name-row">
            <div
              className={
                fieldErrors.firstName !== undefined
                  ? "ui-field ui-field--error"
                  : "ui-field"
              }
            >
              <label htmlFor={`${formId}-first-name`}>
                Ad{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id={`${formId}-first-name`}
                name="firstName"
                type="text"
                autoComplete="given-name"
                minLength={2}
                maxLength={60}
                required
                aria-invalid={fieldErrors.firstName !== undefined}
                aria-describedby={
                  fieldErrors.firstName !== undefined
                    ? `${formId}-first-name-error`
                    : undefined
                }
                onChange={() => clearFieldError("firstName")}
              />
              {fieldErrors.firstName !== undefined ? (
                <p
                  id={`${formId}-first-name-error`}
                  className="ui-field__error"
                  role="alert"
                >
                  {fieldErrors.firstName}
                </p>
              ) : null}
            </div>
            <div
              className={
                fieldErrors.lastName !== undefined
                  ? "ui-field ui-field--error"
                  : "ui-field"
              }
            >
              <label htmlFor={`${formId}-last-name`}>
                Soyad{" "}
                <span className="ui-field__required" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id={`${formId}-last-name`}
                name="lastName"
                type="text"
                autoComplete="family-name"
                minLength={2}
                maxLength={60}
                required
                aria-invalid={fieldErrors.lastName !== undefined}
                aria-describedby={
                  fieldErrors.lastName !== undefined
                    ? `${formId}-last-name-error`
                    : undefined
                }
                onChange={() => clearFieldError("lastName")}
              />
              {fieldErrors.lastName !== undefined ? (
                <p
                  id={`${formId}-last-name-error`}
                  className="ui-field__error"
                  role="alert"
                >
                  {fieldErrors.lastName}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
        <div
          className={
            fieldErrors.email !== undefined
              ? "ui-field ui-field--error"
              : "ui-field"
          }
        >
          <label htmlFor={`${formId}-email`}>
            E-poçt{" "}
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="username"
            required
            aria-invalid={fieldErrors.email !== undefined}
            aria-describedby={
              fieldErrors.email !== undefined
                ? `${formId}-email-error`
                : undefined
            }
            onChange={() => clearFieldError("email")}
          />
          {fieldErrors.email !== undefined ? (
            <p
              id={`${formId}-email-error`}
              className="ui-field__error"
              role="alert"
            >
              {fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div
          className={
            fieldErrors.password !== undefined || error !== null
              ? "ui-field ui-field--error"
              : "ui-field"
          }
        >
          <label htmlFor={`${formId}-password`}>
            Şifrə{" "}
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          </label>
          <PasswordInput
            id={`${formId}-password`}
            name="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            minLength={8}
            required
            aria-invalid={
              fieldErrors.password !== undefined || error !== null
            }
            aria-describedby={
              fieldErrors.password !== undefined || error !== null
                ? `${formId}-password-error`
                : undefined
            }
            onChange={() => clearFieldError("password")}
          />
          {fieldErrors.password !== undefined ||
          error !== null ||
          mode === "login" ? (
            <div className="ui-account-auth__password-meta">
              {fieldErrors.password !== undefined ? (
                <p
                  id={`${formId}-password-error`}
                  className="ui-field__error"
                  role="alert"
                >
                  {fieldErrors.password}
                </p>
              ) : error !== null ? (
                <p
                  id={`${formId}-password-error`}
                  className="ui-field__error"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}
              {mode === "login" ? (
                <Link
                  className="ui-account-auth__forgot-link"
                  href="/account/forgot-password"
                >
                  Şifrəni unutmusan?
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
        {mode === "register" ? (
          <div
            className={
              fieldErrors.passwordConfirm !== undefined
                ? "ui-field ui-field--error"
                : "ui-field"
            }
          >
            <label htmlFor={`${formId}-password-confirm`}>
              Şifrənin təkrarı{" "}
              <span className="ui-field__required" aria-hidden="true">
                *
              </span>
            </label>
            <PasswordInput
              id={`${formId}-password-confirm`}
              name="passwordConfirm"
              autoComplete="new-password"
              minLength={8}
              required
              aria-invalid={fieldErrors.passwordConfirm !== undefined}
              aria-describedby={
                fieldErrors.passwordConfirm !== undefined
                  ? `${formId}-password-confirm-error`
                  : undefined
              }
              onChange={() => clearFieldError("passwordConfirm")}
            />
            {fieldErrors.passwordConfirm !== undefined ? (
              <p
                id={`${formId}-password-confirm-error`}
                className="ui-field__error"
                role="alert"
              >
                {fieldErrors.passwordConfirm}
              </p>
            ) : null}
          </div>
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
    </section>
  );
}
