"use client";

import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function NavbarWrapper() {
  const pathname = usePathname();

  // don't render Navbar for /dashboard and its subpaths
  if (pathname.startsWith("/dashboard")) return null;

  return <Navbar />;
}
