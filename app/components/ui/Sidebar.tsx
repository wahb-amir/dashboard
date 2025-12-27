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
  { name: "Home", href: "/dashboard", Icon: Home },
  { name: "Projects", href: "/dashboard/projects", Icon: Grid },
  { name: "Messages", href: "/dashboard/messages", Icon: MessageSquare },
  { name: "Quotes", href: "/dashboard/quotes", Icon: FileText },
  { name: "Team", href: "/dashboard/team", Icon: Users },
];

type SidebarProps = {
  open: boolean;
  setOpen: (v: boolean) => void;
};

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const pathname = usePathname();

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  return (
    <>
      {/* --- DESKTOP SIDEBAR (flow-based, pinned) --- */}
      {/* This occupies space in the layout so main content starts after it. */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:sticky md:top-0 md:h-screen md:z-20 bg-white border-r border-2">
        <div className="h-16 flex items-center px-4 border-b">
          <Link href="/" className="text-lg font-bold text-black">
            Projects
          </Link>
        </div>

        <nav className="flex-1 px-2 py-4 overflow-y-auto" aria-label="Primary">
          <ul className="space-y-1">
            {NAV_ITEMS.map((it) => {
              const active =
                pathname === it.href || pathname?.startsWith(it.href + "/");
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 w-full px-3 py-2 rounded-md transition ${
                      active
                        ? "bg-blue-100 font-semibold text-black"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <it.Icon
                      size={18}
                      className={active ? "text-black" : "text-gray-700"}
                    />
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
            className="text-sm text-gray-700 hover:text-black"
          >
            Settings
          </Link>
        </div>
      </aside>

      {/* --- MOBILE OVERLAY --- */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden={!open}
      />

      {/* --- MOBILE DRAWER --- */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal={open}
        aria-hidden={!open}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b">
          <span className="text-lg font-bold text-gray-900">Menu</span>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-md hover:bg-gray-100"
            aria-label="Close menu"
          >
            <X size={20} className="text-gray-900" />
          </button>
        </div>

        <nav className="p-4 space-y-2" aria-label="Mobile navigation">
          {NAV_ITEMS.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100 text-gray-900"
            >
              <it.Icon size={18} className="text-gray-900" />
              <span className="text-sm font-medium">{it.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="text-sm text-gray-900 hover:text-black"
          >
            Settings
          </Link>
        </div>
      </div>
    </>
  );
}
