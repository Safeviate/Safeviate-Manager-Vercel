import PageHeader from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, PlaneTakeoff, Wrench } from 'lucide-react';

const stats = [
  {
    title: 'Active Students',
    icon: <Users className="h-6 w-6 text-muted-foreground" />,
    value: '...',
    description: 'Enrolled in training programs.',
  },
  {
    title: 'Upcoming Flights',
    icon: <PlaneTakeoff className="h-6 w-6 text-muted-foreground" />,
    value: '...',
    description: 'Scheduled for the next 24 hours.',
  },
  {
    title: 'Maintenance Alerts',
    icon: <Wrench className="h-6 w-6 text-muted-foreground" />,
    value: '...',
    description: 'Active maintenance requirements.',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Welcome Back, Manager"
        description="Here's a quick overview of your academy's status."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/4 my-1">
                <div className="text-2xl font-bold invisible">{stat.value}</div>
              </Skeleton>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Fleet Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
