
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';
import { usePermissions } from '@/hooks/use-permissions';

export default function DevelopmentPage() {
  const { canAccessMenuItem } = usePermissions();
  const developmentMenu = menuConfig.find(item => item.href === '/development');

  if (!developmentMenu || !developmentMenu.subItems) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Development section not configured.</p>
      </div>
    );
  }

  // We filter out the database page since we moved it
  const devSubItems = developmentMenu.subItems.filter(
    (item) => item.href !== '/development/database' && canAccessMenuItem(item, developmentMenu)
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {devSubItems.map((item) => (
        <Link href={item.href} key={item.href}>
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader>
              <CardTitle>{item.label}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
