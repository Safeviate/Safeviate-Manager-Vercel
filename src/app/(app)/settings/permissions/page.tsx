import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function PermissionsPage() {
    return (
        <Card>
            <CardHeader>
            <CardTitle>Permissions Management</CardTitle>
            <CardDescription>Control user access and roles within the application.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <p className="font-medium">Administrator</p>
                    <p className="text-sm text-muted-foreground">Full access to all features.</p>
                </div>
                <Skeleton className="h-8 w-20" />
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                    <p className="font-medium">Instructor</p>
                    <p className="text-sm text-muted-foreground">Access to scheduling and student progress.</p>
                </div>
                <Skeleton className="h-8 w-20" />
            </div>
            </CardContent>
      </Card>>
    )
}
