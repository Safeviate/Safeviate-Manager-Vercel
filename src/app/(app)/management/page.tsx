import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, User } from 'lucide-react';
import Link from 'next/link';

const managementItems = [
  {
    title: 'Students',
    description: 'Manage student profiles, progress, and flight hours.',
    href: '#',
    icon: <Users className="h-10 w-10 text-primary" />,
  },
  {
    title: 'Instructors',
    description: 'Schedule instructors and manage their availability.',
    href: '#',
    icon: <Calendar className="h-10 w-10 text-primary" />,
  },
  {
    title: 'Personnel',
    description: 'Manage data, roles, and permissions for all staff.',
    href: '#',
    icon: <User className="h-10 w-10 text-primary" />,
  },
];

export default function ManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Management"
        description="Oversee all administrative aspects of the academy."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {managementItems.map((item) => (
          <Link href={item.href} key={item.title}>
            <Card className="h-full hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-2">
                {item.icon}
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
