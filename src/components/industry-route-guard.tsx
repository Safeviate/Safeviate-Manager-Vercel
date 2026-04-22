'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenantConfig } from '@/hooks/use-tenant-config';
import { isHrefEnabledForIndustry, shouldBypassIndustryRestrictions } from '@/lib/industry-access';

type IndustryRouteGuardProps = {
  children: ReactNode;
  sectionLabel: string;
  description: string;
  backHref?: string;
};

export function IndustryRouteGuard({
  children,
  sectionLabel,
  description,
  backHref = '/dashboard',
}: IndustryRouteGuardProps) {
  const pathname = usePathname();
  const { tenant, isLoading } = useTenantConfig();
  const currentPathname = pathname ?? '';
  const isExplicitlyEnabled = tenant?.enabledMenus?.includes(currentPathname) ?? false;
  const bypassIndustryRestrictions = shouldBypassIndustryRestrictions(tenant?.id);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-background px-6 py-12 text-center">
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-500" />
          <p className="text-sm font-black uppercase tracking-widest">Loading {sectionLabel}</p>
        </div>
      </div>
    );
  }

  if (!bypassIndustryRestrictions && !isHrefEnabledForIndustry(currentPathname, tenant?.industry) && !isExplicitlyEnabled) {
    return (
      <Card className="mx-auto w-full max-w-3xl border shadow-none">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-tight">{sectionLabel} Unavailable</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline" className="font-black uppercase">
            <Link href={backHref}>Back</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
