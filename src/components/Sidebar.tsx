"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BetaTools from "@/components/BetaTools";

const NAV = [
  { href: "/dashboard", label: "Cleaner Dashboard", icon: "📊" },
  { href: "/reviews", label: "Review Chaser", icon: "⭐" },
  { href: "/photos", label: "Photo Management", icon: "📷" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="side">
      <Link href="/dashboard" className="sidebrand">
        <div className="logo">S</div>
        <div>
          <b>Sergio Lite</b>
          <small>serviche.com</small>
        </div>
      </Link>
      <nav className="sidenav" style={{ flex: "none" }}>
        {NAV.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "navlink active" : "navlink"}
            >
              <span className="navic">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidescroll">
        <BetaTools />
      </div>
      <div className="sidefoot">
        <form action="/auth/signout" method="post">
          <button className="navlink signout" type="submit">
            ↩ Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
