// app/dashboard/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { checkAuth } from "@/app/utils/checkAuth";
import DashboardPage from "@/app/components/dashboard/DashboardServer";
import type { AuthTokenPayload } from "@/app/utils/token";

export default async function Page() {
  const auth = await checkAuth();

  // completely unauthenticated → redirect to login
  if (auth === false) {
    redirect("/login?reason=auth");
  }

  const user: AuthTokenPayload | null = auth.payload;
  const needsRefresh: boolean = auth.needsRefresh;

  // Render client component — server handles SEO + redirect.
  return (
    <>
      <DashboardPage user={user} needsRefresh={needsRefresh} />{" "}
    </>
  );
}
