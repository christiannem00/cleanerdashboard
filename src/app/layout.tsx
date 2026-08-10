import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cleaner Performance Dashboard — Sergio",
  description: "Upload your BookingKoala export and see who on your team is slacking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
