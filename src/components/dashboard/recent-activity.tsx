import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Github, GitPullRequest, MessageCircle } from "lucide-react"
import { recentActivity, users } from "@/lib/data"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Link from "next/link"

const getAvatar = (id: string) => {
  return PlaceHolderImages.find(img => img.id === id);
}

const getActivityIcon = (action: string) => {
  if (action.includes('commit')) return <Github className="h-4 w-4" />
  if (action.includes('pull request')) return <GitPullRequest className="h-4 w-4" />
  if (action.includes('commented')) return <MessageCircle className="h-4 w-4" />
  return <Github className="h-4 w-4" />
}

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Updates from your team's development activity.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {recentActivity.map(activity => {
          const user = users[activity.userId as keyof typeof users];
          const avatar = getAvatar(user.avatar);
          return (
            <div key={activity.id} className="flex items-start gap-4">
              <Avatar className="h-9 w-9">
                {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{user.name}</span> {activity.action}{" "}
                  <Link href="#" className="font-medium text-foreground hover:underline">{activity.project}</Link>
                </p>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {getActivityIcon(activity.action)}
                  <Link href="#" className="truncate font-mono text-xs text-foreground hover:underline">{activity.details}</Link>
                </div>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          )
        })}
        <Button variant="outline" className="mt-4 w-full">View all activity</Button>
      </CardContent>
    </Card>
  )
}
