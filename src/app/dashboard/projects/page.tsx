import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { projects, users } from "@/lib/data"
import { Badge } from "@/components/ui/badge"

const getAvatar = (id: string) => {
  return PlaceHolderImages.find(img => img.id === id);
}

export default function ProjectsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Projects</CardTitle>
        <CardDescription>A list of all projects, including completed ones.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Team</TableHead>
              <TableHead className="text-right">Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map(project => (
              <TableRow key={project.id}>
                <TableCell>
                  <div className="font-medium">{project.name}</div>
                  <div className="hidden text-sm text-muted-foreground md:inline">
                    {project.client}
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge 
                    variant={project.status === 'Completed' ? 'default' : (project.status === 'Near Completion' ? 'outline' : 'secondary')} 
                    className="capitalize"
                  >
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex -space-x-2">
                    {project.team.map(userId => {
                      const user = users[userId as keyof typeof users];
                      const avatar = getAvatar(user.avatar);
                      return (
                        <Avatar key={userId} className="border-2 border-card">
                          {avatar && <AvatarImage src={avatar.imageUrl} alt={user.name} />}
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm font-medium">{project.progress}%</span>
                    <Progress value={project.progress} className="w-24" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
