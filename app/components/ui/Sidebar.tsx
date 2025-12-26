"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { Home, Grid, MessageSquare, FileText, Users, X } from "lucide-react";

type NavItem = {
  name: string;
  href: string;
  Icon: LucideIcon;
};

const NAV_ITEMS: NavItem[] = [
  { name: "Home", href: "/dashboard/home", Icon: Home },
  { name: "Projects", href: "/dashboard/projects", Icon: Grid },
  { name: "Messages", href: "/dashboard/messages", Icon: MessageSquare },
  { name: "Quotes", href: "/dashboard/quotes", Icon: FileText },
  { name: "Team", href: "/dashboard/team", Icon: Users },
];

type SidebarProps = {
  // mobile control props - when omitted (desktop import usage) default to closed/no-op
  open?: boolean;
  setOpen?: (v: boolean) => void;
};

export default function Sidebar({
  open = false,
  setOpen = () => {},
}: SidebarProps) {
  const pathname = usePathname() ?? "/";

  // lock body scroll when mobile menu is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [open]);

  // close on Escape key (mobile)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r">
        <div className="h-16 flex items-center px-4">
          <Link href="/" className="text-lg font-bold text-black">
            Projects
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Primary">
          <ul className="space-y-1">
            {NAV_ITEMS.map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition ${
                      active
                        ? "bg-blue-50 font-semibold text-black"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <it.Icon className="text-black" size={18} />
                    <span className="text-sm">{it.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <Link
            href="/settings"
            className="text-sm text-black hover:text-black"
          >
            Settings
          </Link>
        </div>
      </aside>

      {/* ---------- Mobile overlay & drawer (controlled by props) ---------- */}
      <div
        className={`fixed inset-0 z-40 md:hidden transition-opacity ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        onTouchStart={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div
        className={`fixed z-50 top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white border-r md:hidden transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
      >
        <div className="h-16 flex items-center px-4 border-b">
          <Link
            href="/"
            className="text-lg font-bold text-black"
            onClick={() => setOpen(false)}
          >
            Projects
          </Link>

          <button
            aria-label="Close menu"
            className="ml-auto p-2 rounded-md hover:bg-gray-100"
            onClick={() => setOpen(false)}
          >
            <X size={18} className="text-black" />
          </button>
        </div>

        <nav
          className="px-2 py-4 overflow-y-auto"
          aria-label="Mobile navigation"
        >
          <ul className="space-y-1">
            {NAV_ITEMS.map((it) => {
              const active =
                pathname === it.href || pathname.startsWith(it.href + "/");
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition ${
                      active
                        ? "bg-blue-50 font-semibold text-black"
                        : "text-black hover:bg-gray-100"
                    }`}
                  >
                    <it.Icon className="text-black" size={18} />
                    <span className="text-sm">{it.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <Link
            href="/settings"
            className="text-sm text-black hover:text-black"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
        </div>
      </div>
    </>
  );
}
