"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "👥 Users & Activity" },
  { href: "/admin/sms-queue", label: "📱 SMS Queue" },
];

export default function AdminTabs() {
  const pathname = usePathname();
  const onSms = pathname.startsWith("/admin/sms-queue");
  return (
    <div className="tabs">
      {TABS.map((t) => {
        const active = t.href === "/admin/sms-queue" ? onSms : !onSms;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={active ? "tab active" : "tab"}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
