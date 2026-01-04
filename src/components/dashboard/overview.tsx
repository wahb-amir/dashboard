import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Briefcase, CheckCircle, Clock, Users } from "lucide-react"

export function Overview() {
    const kpis = [
        {
            title: "Active Projects",
            value: "4",
            icon: <Briefcase className="h-4 w-4 text-muted-foreground" />,
            change: "+2 from last month"
        },
        {
            title: "Tasks Completed",
            value: "125",
            icon: <CheckCircle className="h-4 w-4 text-muted-foreground" />,
            change: "+15 this week"
        },
        {
            title: "Pending Quotes",
            value: "3",
            icon: <Clock className="h-4 w-4 text-muted-foreground" />,
            change: "2 new today"
        },
        {
            title: "Team Members",
            value: "4",
            icon: <Users className="h-4 w-4 text-muted-foreground" />,
            change: "Full capacity"
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi) => (
                <Card key={kpi.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        {kpi.icon}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <p className="text-xs text-muted-foreground">{kpi.change}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
