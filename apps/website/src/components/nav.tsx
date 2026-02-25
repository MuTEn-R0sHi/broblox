"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [
  { href: "/games", label: "Games" },
  { href: "/rankings", label: "Rankings" },
  { href: "/news", label: "News" },
];

export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 font-black text-lg tracking-tight"
          onClick={() => setOpen(false)}
        >
          <Image src="/logo.png" alt="BroBlox" width={32} height={32} className="rounded-md" />
          <span className="shimmer-text">BroBlox</span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden items-center gap-1 sm:flex">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-cyan-faint text-cyan"
                      : "text-subtle hover:bg-white-faint hover:text-foreground"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Desktop CTA */}
        <a
          href="/games"
          className="hidden rounded-xl border border-cyan-glow bg-cyan-bg px-4 py-1.5 text-sm font-bold text-cyan transition-all hover:border-cyan-border hover:bg-cyan-hover sm:inline-flex"
        >
          Play Now ↗
        </a>

        {/* Mobile hamburger */}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-subtle transition-colors hover:border-cyan-glow hover:text-cyan sm:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border bg-background px-4 pb-4 pt-2 sm:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`flex rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-cyan-faint text-cyan"
                        : "text-subtle hover:bg-white-faint hover:text-foreground"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <a
            href="/games"
            onClick={() => setOpen(false)}
            className="mt-3 flex items-center justify-center rounded-xl border border-cyan-glow bg-cyan-bg px-4 py-2.5 text-sm font-bold text-cyan"
          >
            Play Now ↗
          </a>
        </div>
      )}
    </header>
  );
}
