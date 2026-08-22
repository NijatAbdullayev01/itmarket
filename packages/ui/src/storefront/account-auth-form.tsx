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

export type AccountAuthFormCopy = {
  backAria: string;
  loginTitle: string;
  registerTitle: string;
  loginLead: string;
  registerLead: string;
  accountModeAria: string;
  loginTab: string;
  registerTab: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  forgotPassword: string;
  passwordConfirm: string;
  submitLogin: string;
  submitRegister: string;
  waiting: string;
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordMinLength: string;
  passwordComplexity: string;
  firstNameRequired: string;
  firstNameMinLength: string;
  lastNameRequired: string;
  lastNameMinLength: string;
  passwordConfirmRequired: string;
  passwordMismatch: string;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

export const defaultAccountAuthFormCopy: AccountAuthFormCopy = {
  backAria: "Geri qayıt",
  loginTitle: "Daxil olun",
  registerTitle: "Qeydiyyat",
  loginLead: "Sifarişlərinizi izləmək və şəxsi təkliflərdən yararlanmaq üçün hesabınıza daxil olun.",
  registerLead: "Yeni hesab yaradaraq sifarişlərinizi izləyin və şəxsi təkliflərdən yararlanın.",
  accountModeAria: "Hesab rejimi",
  loginTab: "Daxil ol",
  registerTab: "Qeydiyyat",
  firstName: "Ad",
  lastName: "Soyad",
  email: "E-poçt",
  password: "Şifrə",
  forgotPassword: "Şifrəni unutmusan?",
  passwordConfirm: "Şifrənin təkrarı",
  submitLogin: "Daxil ol",
  submitRegister: "Qeydiyyatdan keç",
  waiting: "Gözləyin...",
  emailRequired: "E-poçt tələb olunur",
  emailInvalid: "Düzgün e-poçt daxil edin",
  passwordRequired: "Şifrə tələb olunur",
  passwordMinLength: "Şifrə ən azı 12 simvol olmalıdır",
  passwordComplexity:
    "Şifrədə ən azı 3 növ simvol olsun: kiçik hərf, böyük hərf, rəqəm, simvol",
  firstNameRequired: "Ad tələb olunur",
  firstNameMinLength: "Ad ən azı 2 simvol olmalıdır",
  lastNameRequired: "Soyad tələb olunur",
  lastNameMinLength: "Soyad ən azı 2 simvol olmalıdır",
  passwordConfirmRequired: "Şifrənin təkrarı tələb olunur",
  passwordMismatch: "Şifrələr uyğun gəlmir",
  showPasswordLabel: "Şifrəni göstər",
  hidePasswordLabel: "Şifrəni gizlət",
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
  copy?: Partial<AccountAuthFormCopy>;
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

function isStrongAccountPassword(password: string): boolean {
  if (password.length < 12 || password.length > 128) {
    return false;
  }
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  return classes >= 3;
}

function validateAuthForm(mode: AuthMode, formData: FormData, copy: AccountAuthFormCopy): FieldErrors {
  const errors: FieldErrors = {};
  const email = readField(formData, "email");
  const password = readField(formData, "password");

  if (email === "") {
    errors.email = copy.emailRequired;
  } else if (!isCompleteEmail(email)) {
    errors.email = copy.emailInvalid;
  }

  if (password === "") {
    errors.password = copy.passwordRequired;
  } else if (mode === "register" && password.length < 12) {
    errors.password = copy.passwordMinLength;
  } else if (mode === "register" && !isStrongAccountPassword(password)) {
    errors.password = copy.passwordComplexity;
  } else if (mode === "login" && password.length < 8) {
    errors.password = copy.passwordMinLength;
  }

  if (mode === "register") {
    const firstName = readField(formData, "firstName");
    const lastName = readField(formData, "lastName");
    const passwordConfirm = readField(formData, "passwordConfirm");

    if (firstName === "") {
      errors.firstName = copy.firstNameRequired;
    } else if (firstName.length < 2) {
      errors.firstName = copy.firstNameMinLength;
    }

    if (lastName === "") {
      errors.lastName = copy.lastNameRequired;
    } else if (lastName.length < 2) {
      errors.lastName = copy.lastNameMinLength;
    }

    if (passwordConfirm === "") {
      errors.passwordConfirm = copy.passwordConfirmRequired;
    } else if (password !== passwordConfirm) {
      errors.passwordConfirm = copy.passwordMismatch;
    }
  }

  return errors;
}

export function AccountAuthForm({
  customer: _initialCustomer,
  onLogin,
  onRegister,
  copy,
}: AccountAuthFormProps) {
  const router = useRouter();
  const formId = useId();
  const c = { ...defaultAccountAuthFormCopy, ...copy };
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
    const nextFieldErrors = validateAuthForm(mode, formData, c);

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
        aria-label={c.backAria}
      >
        <IconClose width={18} height={18} />
      </button>
      <header className="ui-account-auth__header">
        <h2 className="ui-account-auth__title">
          {mode === "login" ? c.loginTitle : c.registerTitle}
        </h2>
        <p className="ui-account-auth__lead">
          {mode === "login" ? c.loginLead : c.registerLead}
        </p>
      </header>

      <div
        className="ui-account-auth__tabs"
        role="tablist"
        aria-label={c.accountModeAria}
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
          {c.loginTab}
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
          {c.registerTab}
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
                {c.firstName}{" "}
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
                {c.lastName}{" "}
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
            {c.email}{" "}
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
            {c.password}{" "}
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          </label>
          <PasswordInput
            id={`${formId}-password`}
            name="password"
            showPasswordLabel={c.showPasswordLabel}
            hidePasswordLabel={c.hidePasswordLabel}
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
                  replace
                >
                  {c.forgotPassword}
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
              {c.passwordConfirm}{" "}
              <span className="ui-field__required" aria-hidden="true">
                *
              </span>
            </label>
            <PasswordInput
              id={`${formId}-password-confirm`}
              name="passwordConfirm"
              showPasswordLabel={c.showPasswordLabel}
              hidePasswordLabel={c.hidePasswordLabel}
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
            ? c.waiting
            : mode === "login"
              ? c.submitLogin
              : c.submitRegister}
        </Button>
      </form>
    </section>
  );
}
