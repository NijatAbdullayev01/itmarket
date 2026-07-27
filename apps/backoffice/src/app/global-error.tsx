"use client";

import { Montserrat } from "next/font/google";

import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export default function BackofficeGlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="az" data-theme="backoffice" className={montserrat.variable}>
      <body className={montserrat.className}>
        <div className="ui-container">
          <div className="ui-empty-state">
            <h1 className="ui-empty-state__title">Kritik xəta</h1>
            <p className="ui-empty-state__body">
              Tətbiqdə gözlənilməz xəta baş verdi. Yenidən cəhd edin.
            </p>
            <button
              type="button"
              className="ui-btn ui-empty-state__action"
              onClick={() => reset()}
            >
              Yenidən cəhd et
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
