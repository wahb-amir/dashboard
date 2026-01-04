"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { taskData } from "@/lib/data"

const chartConfig = {
  tasksCompleted: {
    label: "Completed",
    color: "hsl(var(--primary))",
  },
  tasksCreated: {
    label: "Created",
    color: "hsl(var(--accent))",
  },
}

export function TasksChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks Overview</CardTitle>
        <CardDescription>January - July 2024</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart accessibilityLayer data={taskData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="tasksCompleted" fill="var(--color-tasksCompleted)" radius={4} />
            <Bar dataKey="tasksCreated" fill="var(--color-tasksCreated)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
