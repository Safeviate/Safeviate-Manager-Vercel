'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, Clock3, RotateCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MainPageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type RecoveryArchive = {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  archivedByEmail: string;
  archivedAt: string;
  restoredAt: string | null;
  status: 'archived' | 'restored';
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEntityType(value: string) {
  return value.replaceAll('-', ' ');
}

export default function RecoveryVaultPage() {
  const { toast } = useToast();
  const [archives, setArchives] = useState<RecoveryArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isForbidden, setIsForbidden] = useState(false);

  const loadArchives = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/recovery-vault', { cache: 'no-store' });
      if (response.status === 403) {
        setIsForbidden(true);
        return;
      }
      const payload = await response.json().catch(() => ({}));
      setArchives(Array.isArray(payload.archives) ? payload.archives : []);
    } catch {
      setArchives([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArchives();
  }, []);

  const filteredArchives = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return archives;
    return archives.filter((archive) =>
      [archive.tenantId, archive.entityType, archive.entityLabel, archive.archivedByEmail]
        .some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [archives, query]);

  const restoreArchive = async (archiveId: string) => {
    setIsRestoring(archiveId);
    try {
      const response = await fetch('/api/admin/recovery-vault', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archiveId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Failed to restore the archived record.');
      toast({ title: 'Record restored', description: 'The record has been restored to its original tenant.' });
      await loadArchives();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Restore failed',
        description: error instanceof Error ? error.message : 'The archived record could not be restored.',
      });
    } finally {
      setIsRestoring(null);
    }
  };

  if (isLoading) {
    return <div className="mx-auto w-full max-w-[1200px] space-y-4 px-1"><Skeleton className="h-14 w-full" /><Skeleton className="h-[520px] w-full" /></div>;
  }

  if (isForbidden) {
    return (
      <div className="mx-auto flex min-h-[320px] w-full max-w-[900px] items-center justify-center px-1">
        <Card className="w-full border shadow-none"><CardContent className="p-8 text-center text-sm text-muted-foreground">Recovery Vault access is restricted to the Safeviate master administrator.</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-1">
      <MainPageHeader title="Recovery Vault" description="Archived sensitive records retained for controlled restoration across tenants." />
      <Card className="overflow-hidden border shadow-none">
        <CardHeader className="flex-row items-center justify-between gap-4 border-b py-3">
          <div className="min-w-0">
            <CardTitle className="text-[13px] font-bold">Archived Records</CardTitle>
          </div>
          <Badge variant="outline" className="shrink-0">{archives.filter((archive) => archive.status === 'archived').length} available</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-b p-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search tenant, record, type, or user" />
            </div>
          </div>
          <div className="max-h-[620px] overflow-auto">
            {filteredArchives.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                <ArchiveRestore className="h-9 w-9 opacity-60" />
                <p className="text-sm font-medium">No archived records found.</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredArchives.map((archive) => (
                  <div key={archive.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_160px_190px_auto] md:items-center">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">{archive.entityLabel}</p>
                        <Badge variant="secondary" className="capitalize">{formatEntityType(archive.entityType)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Tenant: {archive.tenantId} | Archived by {archive.archivedByEmail}</p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{formatDate(archive.archivedAt)}</div>
                    </div>
                    <Badge variant={archive.status === 'archived' ? 'outline' : 'secondary'} className="w-fit capitalize">{archive.status}</Badge>
                    {archive.status === 'archived' ? (
                      <Button size="sm" onClick={() => void restoreArchive(archive.id)} disabled={isRestoring === archive.id}>
                        <RotateCcw className="mr-2 h-3.5 w-3.5" />
                        {isRestoring === archive.id ? 'Restoring' : 'Restore'}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
