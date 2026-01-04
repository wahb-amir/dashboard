import { Overview } from "@/components/dashboard/overview"
import { ProjectProgress } from "@/components/dashboard/project-progress"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { TasksChart } from "@/components/dashboard/tasks-chart"

export default function DashboardPage() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <Overview />
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
          <ProjectProgress />
        </div>
        <div className="grid auto-rows-max items-start gap-4 md:gap-8 xl:col-span-1">
          <TasksChart />
          <RecentActivity />
        </div>
      </div>
    </div>
  )
}
