// app/components/dashboard/DashboardServer.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation"; // Import native redirect
import DashboardPageClient from "./DashboardPageClient";
import type { AuthTokenPayload } from "@/app/utils/token";
import type { ProjectFromDB } from "@/app/components/Projects/ProjectCard";

interface Props {
  user: AuthTokenPayload | null;
  needsRefresh: boolean;
}

// Ensure this matches the Client component exactly
const PAGE_SIZE = 6;

export default async function DashboardServer({ user, needsRefresh }: Props) {
  let initialProjects: ProjectFromDB[] = [];
  let initialHasMore = true;

  try {
    const cookieStore = await cookies();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/project?limit=${PAGE_SIZE}&offset=0`,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieStore.toString(),
        },
      }
    );

    const data = await res.json();

    if (res.ok) {
      initialProjects = Array.isArray(data) ? data : data.projects ?? [];
      initialHasMore =
        !Array.isArray(data) && typeof data.total === "number"
          ? data.total > PAGE_SIZE
          : initialProjects.length === PAGE_SIZE;
    } else {
      // HANDLE REDIRECT HERE: Prevents flash of content on client
      if (data.redirectTo) {
        redirect(data.redirectTo);
      }
    }
  } catch (error) {
    // If the error was the redirect() thrown above, let it pass
    if ((error as any)?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Fetch error in DashboardServer:", error);
  }

  return (
    <DashboardPageClient
      initialUser={user}
      needsRefresh={needsRefresh}
      initialProjects={initialProjects}
      initialPage={0}
      initialHasMore={initialHasMore}
      initialQuery=""
      // redirectTo prop removed as it is handled server-side
    />
  );
}
