import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';

export default function AdminPage() {
  const adminMenu = menuConfig.find(item => item.href === '/admin');

  if (!adminMenu) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Admin section not configured.</p>
      </div>
    );
  }
  
  if (!adminMenu.subItems) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">No admin sections available.</p>
        </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {adminMenu.subItems.map((item) => (
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
