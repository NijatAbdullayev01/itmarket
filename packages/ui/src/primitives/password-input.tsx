"use client";

import { useState, type InputHTMLAttributes } from "react";

import { IconEye, IconEyeOff } from "../storefront/icons";

type PasswordInputBaseProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export type PasswordInputProps = PasswordInputBaseProps & {
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
};

export function PasswordInput({
  id,
  showPasswordLabel = "Şifrəni göstər",
  hidePasswordLabel = "Şifrəni gizlət",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="ui-password-input">
      <input
        id={id}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        type="button"
        className="ui-password-input__toggle"
        aria-label={visible ? hidePasswordLabel : showPasswordLabel}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
