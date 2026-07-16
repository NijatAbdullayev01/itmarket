"use client";

import { useState, type InputHTMLAttributes } from "react";

import { IconEye, IconEyeOff } from "../storefront/icons";

type PasswordInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

export function PasswordInput({ id, ...props }: PasswordInputProps) {
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
        aria-label={visible ? "Şifrəni gizlət" : "Şifrəni göstər"}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <IconEyeOff /> : <IconEye />}
      </button>
    </div>
  );
}
