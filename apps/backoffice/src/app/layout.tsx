import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Əməliyyat mərkəzi | IT Market",
  description: "IT Market əməkdaşları üçün daxili əməliyyat səthinin statusu.",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nocache: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  );
}
