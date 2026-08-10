import type { Metadata } from "next";
import "./globals.css";
import NeedHelp from "@/components/NeedHelp";

export const metadata: Metadata = {
  title: "Sergio Lite — Cleaning Ops Portal",
  description: "Cleaner performance, review chasing, and job photos — one login.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <NeedHelp />
      </body>
    </html>
  );
}
