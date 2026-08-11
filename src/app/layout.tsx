import type { Metadata } from "next";
import Script from "next/script";
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
        <Script id="ms-clarity" strategy="afterInteractive">{`
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "y0hc7ktb8c");
        `}</Script>
      </body>
    </html>
  );
}
