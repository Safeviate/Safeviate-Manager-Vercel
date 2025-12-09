import PageHeader from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Shield } from 'lucide-react';
import Link from 'next/link';

const operationsItems = [
  {
    title: 'Maintenance',
    description: 'Record and track aircraft maintenance procedures.',
    href: '#',
    icon: <Wrench className="h-10 w-10 text-primary" />,
  },
  {
    title: 'Safety & Quality',
    description: 'Manage safety protocols, quality assurance, and compliance.',
    href: '#',
    icon: <Shield className="h-10 w-10 text-primary" />,
  },
];

export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operations"
        description="Manage the operational aspects of the aviation academy."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {operationsItems.map((item) => (
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
