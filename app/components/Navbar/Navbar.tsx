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
    } catch (e) {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const [userAuth, setUserAuth] = useState<AuthTokenPayload | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [messageCount, setMessageCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    async function runCheck() {
      setLoadingAuth(true);
      try {
        const server = await fetch("/api/auth/checkauth", {
          credentials: "include",
        });
        const res: CheckAuthResult = await server.json();
        if (!mounted) return;

        if (!res) {
          setUserAuth(null);
          setIsAuthed(false);
          setMessageCount(0);
        } else if (res.auth) {
          setIsAuthed(true);
          setUserAuth(res);
        } else {
          setIsAuthed(false);
        }
      } catch (err) {
        console.error("checkAuth error:", err);
        if (!mounted) return;
        setUserAuth(null);
        setIsAuthed(false);
        setMessageCount(0);
      } finally {
        if (!mounted) return;
        setLoadingAuth(false);
      }
    }
    runCheck();
    return () => {
      mounted = false;
    };
  }, []);

  const profileLetter = (() => {
    if (!userAuth) return "U";
    const source =
      (userAuth.user as any)?.name || (userAuth.user as any)?.email;
    if (!source || typeof source !== "string") return "U";
    return source.charAt(0).toUpperCase();
  })();

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white backdrop-blur-md border-b border-gray-200 shadow-sm ">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-14 md:h-16">
            <div className="mr-3 md:mr-4 flex items-center">
              <Link href="/" className="flex items-center" aria-label="Home">
                <Logo className="w-8 h-8 md:w-10 md:h-10" />
              </Link>
            </div>

            <div className="flex-1" />

            {/* Mobile actions */}
            <nav
              className="flex items-center space-x-2 md:hidden"
              aria-label="Primary"
            >
              {showSidebar && (
                <button
                  aria-label="Open menu"
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 rounded-md hover:bg-gray-100 transition"
                >
                  <Menu size={20} className="text-black" />
                </button>
              )}

              {!showSidebar && (
                <Link
                  href="/about"
                  className="text-base inline-flex items-center px-3 py-1 rounded-md bg-transparent text-black hover:bg-gray-100 transition"
                >
                  About
                </Link>
              )}

              {!loadingAuth && isAuthed ? (
                <Link
                  href="/dashboard"
                  className="text-xs inline-flex items-center px-2 py-1 rounded-md font-semibold bg-blue-600 text-white"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-3 py-1 text-sm rounded-md font-medium text-black hover:text-gray-900 transition"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center px-3 py-1 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </nav>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center space-x-3"
              aria-label="Primary"
            >
              {!showSidebar && (
                <Link
                  href="/about"
                  className="text-lg inline-flex items-center px-3 py-1 rounded-md bg-transparent text-black hover:bg-gray-100 transition"
                >
                  About
                </Link>
              )}

              {!loadingAuth && !isAuthed ? (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center px-3 py-1.5 text-sm rounded-md font-medium text-black hover:text-gray-900 transition"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center px-4 py-2 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
                  >
                    Get Started
                  </Link>
                </>
              ) : loadingAuth ? (
                <div className="inline-flex items-center px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-500">
                  Checking…
                </div>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/dashboard/messages")}
                    aria-label="Unread messages"
                    className="relative inline-flex items-center p-1 rounded-md hover:bg-gray-100 transition"
                  >
                    <Bell size={18} className="text-black" />
                    {messageCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold leading-none text-white bg-red-600 rounded-full">
                        {messageCount > 99 ? "99+" : messageCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => router.push("/profile")}
                    aria-label="Your profile"
                    className="ml-2 inline-flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 text-black font-medium hover:bg-gray-200 transition"
                  >
                    {profileLetter}
                  </button>

                  <Link
                    href="/dashboard"
                    className="inline-flex items-center px-4 py-2 text-sm rounded-md font-semibold bg-blue-600 text-white hover:brightness-90 transition"
                  >
                    Dashboard
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
