import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { notifications } from "@/lib/mock-data";

export default function NotificationsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>All Notifications</CardTitle>
                <CardDescription>A complete history of your notifications.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {notifications.map(n => (
                        <div key={n.id} className="p-2 border-b">
                            <p className="text-sm">{n.text}</p>
                            <p className="text-xs text-muted-foreground">{n.time}</p>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
