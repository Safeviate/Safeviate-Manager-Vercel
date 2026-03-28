'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';
import { usePermissions } from '@/hooks/use-permissions';

export default function BookingsPage() {
  const { canAccessMenuItem } = usePermissions();
  const bookingsMenu = menuConfig.find(item => item.href === '/bookings');

  if (!bookingsMenu || !bookingsMenu.subItems) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Bookings section not configured.</p>
      </div>
    );
  }

  const visibleSubItems = bookingsMenu.subItems.filter(
    item => canAccessMenuItem(item, bookingsMenu)
  );

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {visibleSubItems.map((item) => (
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
