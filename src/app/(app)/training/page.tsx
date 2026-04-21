'use client';

import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { menuConfig } from '@/lib/menu-config';
import { usePermissions } from '@/hooks/use-permissions';

export default function TrainingPage() {
  const { canAccessMenuItem } = usePermissions();
  const trainingMenu = menuConfig.find(item => item.href === '/training');

  if (!trainingMenu || !trainingMenu.subItems) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Training section not configured.</p>
      </div>
    );
  }

  const visibleSubItems = trainingMenu.subItems.filter(
    item => canAccessMenuItem(item, trainingMenu)
  );

  if (visibleSubItems.length === 0) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">You do not have access to any training sections.</p>
        </div>
    )
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full grid gap-6 px-1 pt-4 md:grid-cols-2 lg:grid-cols-3">
      {visibleSubItems.map((item) => (
        <Link href={item.href} key={item.href}>
          <Card className="hover:bg-muted/50 transition-colors shadow-none border h-full">
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
