"use client";

import Link from "next/link";
import Logo from "@/app/components/ui/Logo";
import type { AuthTokenPayload } from "@/app/utils/token";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import React, { useEffect, useState } from "react";

type CheckAuthResult = any;

type NavbarProps = {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (v: boolean) => void;
};

export default function Navbar({
  isMobileMenuOpen = false,
  setIsMobileMenuOpen = () => {},
}: NavbarProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const showSidebar = pathname.startsWith("/dashboard");

  useEffect(() => {
    try {
      setIsMobileMenuOpen(false);
    } catch (e) {}
  }, [pathname, setIsMobileMenuOpen]);

  const [userAuth, setUserAuth] = useState<AuthTokenPayload | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [messageCount, setMessageCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function runCheck() {
      setLoadingAuth(true);
      try {
        const server = await fetch("/api/auth/checkauth", { credentials: "include" });
        const res: CheckAuthResult = await server.json();
        if (!mounted) return;
        if (res?.auth) {
          setIsAuthed(true);
          setUserAuth(res);
        } else {
          setIsAuthed(false);
        }
      } catch (err) {
        if (!mounted) return;
        setIsAuthed(false);
      } finally {
        if (mounted) setLoadingAuth(false);
      }
    }
    runCheck();
    return () => { mounted = false; };
  }, []);

  const profileLetter = userAuth?.user?.name?.charAt(0).toUpperCase() || userAuth?.user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200 bg-[#FAFAFA]/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
            <Logo className="h-6 w-6 text-stone-900" />
            <span className="hidden font-mono text-[11px] uppercase tracking-[0.15em] text-stone-900 sm:block">
              wahb.space/portal
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {!showSidebar && (
              <Link href="/about" className="text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-900">
                About
              </Link>
            )}

            {loadingAuth ? (
              <div className="font-mono text-[12px] text-stone-400 animate-pulse">Checking state...</div>
            ) : !isAuthed ? (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-[13px] font-medium text-stone-500 transition-colors hover:text-stone-900">
                  Log in
                </Link>
                <Link href="/register" className="rounded-full bg-stone-900 px-5 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-teal-900">
                  Get started
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button onClick={() => router.push("/dashboard/messages")} className="relative text-stone-400 hover:text-stone-900 transition-colors">
                  <Bell size={18} strokeWidth={1.5} />
                  {messageCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-teal-600 font-mono text-[8px] text-white">
                      {messageCount}
                    </span>
                  )}
                </button>
                <button onClick={() => router.push("/profile")} className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 font-mono text-[11px] font-medium text-stone-700 transition hover:bg-stone-300">
                  {profileLetter}
                </button>
                <Link href="/dashboard" className="rounded-full bg-stone-900 px-5 py-2 text-[12.5px] font-medium text-white transition-colors hover:bg-teal-900">
                  Dashboard
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile Toggle would remain here, simplified for brevity */}
          <div className="md:hidden flex items-center">
            {showSidebar && (
              <button onClick={() => setIsMobileMenuOpen(true)} className="text-stone-600">
                <Menu size={20} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}