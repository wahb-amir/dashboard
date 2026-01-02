// app/components/dashboard/DashboardServer.tsx
import DashboardPageClient from "./DashboardPageClient";
import type { AuthTokenPayload } from "@/app/utils/token";
import type { ProjectFromDB } from "@/app/components/Projects/ProjectCard";

interface Props {
  user: AuthTokenPayload | null;
  needsRefresh: boolean;
}

const PAGE_SIZE = 6;

export default async function DashboardServer({ user, needsRefresh }: Props) {
  let initialProjects: ProjectFromDB[] = [];
  let initialHasMore = true;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/project?limit=${PAGE_SIZE}&offset=0`,
      {
        cache: "no-store", // dashboard must always be fresh
        credentials: "include",
      }
    );

    if (res.ok) {
      const data = await res.json();

      initialProjects = Array.isArray(data) ? data : data.projects ?? [];

      if (!Array.isArray(data) && typeof data.total === "number") {
        initialHasMore = data.total > PAGE_SIZE;
      } else {
        initialHasMore = initialProjects.length === PAGE_SIZE;
      }
    }
  } catch {
    // silently fail — client can refetch if needed
  }

  return (
    <DashboardPageClient
      initialUser={user}
      needsRefresh={needsRefresh}
      initialProjects={initialProjects}
      initialPage={0}
      initialHasMore={initialHasMore}
      initialQuery=""
    />
  );
}
