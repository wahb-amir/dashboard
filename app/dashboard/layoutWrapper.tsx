"use client";

import { useState } from "react";
import Sidebar from "@/app/components/ui/Sidebar";
import Navbar from "@/app/components/Navbar/Navbar";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Navbar
        isMobileMenuOpen={mobileOpen}
        setIsMobileMenuOpen={setMobileOpen}
      />

      <main className="relative z-0 pt-16 p-4 bp-main">{children}</main>

      
      <div className="relative z-50">
        <Sidebar open={mobileOpen} setOpen={setMobileOpen} />
      </div>

      <style jsx>{`
        /* at >=880px, reserve space for the fixed sidebar (16rem = 256px) */
        @media (min-width: 880px) {
          .bp-main {
            margin-left: 16rem; /* same as sidebar width (md:w-64) */
          }
        }
        /* default: no left margin on small screens */
        @media (max-width: 879px) {
          .bp-main {
            margin-left: 0;
          }
        }

       
        :global(button),
        :global([role="button"]) {
          cursor: pointer;
        }
      `}</style>
    </>
  );
}
