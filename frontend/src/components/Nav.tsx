"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Briefing" },
  { href: "/articles", label: "All articles" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          AI Media Analyst
        </Link>
        <div className="flex gap-4 text-sm">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  active
                    ? "text-zinc-100 border-b-2 border-emerald-500 pb-3 -mb-3"
                    : "text-zinc-400 hover:text-zinc-200"
                }
              >
                {l.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
