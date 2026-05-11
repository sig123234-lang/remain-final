"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/admin/home",
    label: "운영 홈",
  },
  {
    href: "/admin/live",
    label: "실시간 세션",
  },
  {
    href: "/admin/elderly",
    label: "어르신 관리",
  },
  {
    href: "/admin/memories",
    label: "기억 아카이브",
  },
  {
    href: "/admin/reports",
    label: "리포트",
  },
  {
    href: "/admin/settings",
    label: "운영 설정",
  },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-[#eadfce] bg-[#f5f1ea]/95 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-[1540px] flex-wrap items-center gap-2">
        <Link
          href="/admin/home"
          className="mr-3 text-xl font-black tracking-tight text-[#2d2a26]"
        >
          rem
          <span className="text-[#6f9075]">
            AI
          </span>
          n
        </Link>

        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-[#6f9075] text-white"
                  : "bg-white text-[#6f5d50] shadow-sm hover:bg-[#f8f3ea]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
