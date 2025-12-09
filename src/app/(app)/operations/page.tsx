import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';

export default function OperationsPage() {
  const operationsMenu = menuConfig.find(item => item.href === '/operations');

  if (!operationsMenu || !operationsMenu.subItems) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Operations section not configured.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {operationsMenu.subItems.map((item) => (
        <Link href={item.href} key={item.href}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
