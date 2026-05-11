"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/family/home", label: "오늘", icon: "🌿" },
  { href: "/family/records", label: "기록", icon: "📖" },
  { href: "/family/insights", label: "마음", icon: "💛" },
  { href: "/family/settings", label: "설정", icon: "⚙️" },
];

export default function FamilyBottomTab() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/70 bg-[#fffaf2]/92 px-3 pb-6 pt-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            pathname.startsWith(
              `${tab.href}/`
            );

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-[72px] flex-col items-center justify-center rounded-2xl px-3 py-2 ${
                active ? "bg-[#edf4ec] text-[#6f9075]" : "text-[#9a8776]"
              }`}
            >
              <span className="text-[22px]">{tab.icon}</span>
              <span className="mt-1 text-xs font-bold">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
