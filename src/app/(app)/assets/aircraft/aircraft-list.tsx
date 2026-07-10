'use client';

import { Plane } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Aircraft } from '@/types/aircraft';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AircraftActions } from './aircraft-actions';
import { ViewActionButton } from '@/components/record-action-buttons';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';
import {
  getContrastingTextColor,
  getDocumentExpiryColor,
  type DocumentExpirySettingsLike,
} from '@/lib/document-expiry';

interface AircraftListProps {
  data: Aircraft[];
  tenantId: string;
  canEdit: boolean;
  archived?: boolean;
}

function getAircraftDocumentStatus(
  aircraft: Aircraft,
  settings: DocumentExpirySettingsLike | null
) {
  const documents = Array.isArray(aircraft.documents) ? aircraft.documents : [];
  const expiredColor = settings?.expiredColor || '#ef4444';

  let expiredCount = 0;
  let warningCount = 0;

  for (const document of documents) {
    const color = getDocumentExpiryColor(document.expirationDate, settings);
    if (!color) continue;

    if (color === expiredColor) {
      expiredCount += 1;
    } else {
      warningCount += 1;
    }
  }

  if (expiredCount > 0) {
    return {
      label: 'Documents Expired',
      summary: `${expiredCount} expired${warningCount > 0 ? ` | ${warningCount} due soon` : ''}`,
      color: expiredColor,
    };
  }

  if (warningCount > 0) {
    const firstWarningColor =
      documents
        .map((document) => getDocumentExpiryColor(document.expirationDate, settings))
        .find((color) => color && color !== expiredColor) ||
      settings?.defaultColor ||
      '#f59e0b';

    return {
      label: 'Documents Due Soon',
      summary: `${warningCount} due soon`,
      color: firstWarningColor,
    };
  }

  return {
    label: 'Airworthy',
    summary: documents.length > 0 ? `${documents.length} docs on file` : 'No expiry alerts',
    color: null as string | null,
  };
}

export function AircraftList({ data, tenantId, canEdit, archived = false }: AircraftListProps) {
  const [expirySettings, setExpirySettings] = useState<DocumentExpirySettingsLike | null>(null);

  useEffect(() => {
    void fetch('/api/tenant-config', { cache: 'no-store' })
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        const settings = payload?.config?.['document-expiry-settings'] as
          | DocumentExpirySettingsLike
          | undefined;
        setExpirySettings(settings || null);
      })
      .catch((error) => {
        console.error('Failed to load document expiry settings', error);
      });
  }, []);

  const aircraftStatusMap = useMemo(
    () =>
      new Map(
        data.map((aircraft) => [
          aircraft.id,
          getAircraftDocumentStatus(aircraft, expirySettings),
        ])
      ),
    [data, expirySettings]
  );

  if (data.length === 0) {
    return (
      <div className="flex min-h-[360px] flex-col items-center justify-center border-b bg-muted/5 p-8 text-center text-muted-foreground">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border bg-background">
          <Plane className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-foreground">Hangar Empty</p>
          <p className="text-[10px] font-bold uppercase tracking-widest italic">
            No aviation assets have been registered yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-0">
        <ResponsiveCardGrid
          items={data}
          isLoading={false}
          className="p-4"
          gridClassName="sm:grid-cols-2 xl:grid-cols-3"
          renderItem={(ac) => {
            const documentStatus =
              aircraftStatusMap.get(ac.id) ?? getAircraftDocumentStatus(ac, expirySettings);

            const statusStyle = documentStatus.color
              ? {
                  borderColor: documentStatus.color,
                  backgroundColor: documentStatus.color,
                  color: getContrastingTextColor(documentStatus.color),
                }
              : undefined;

            return (
              <Card key={ac.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                      {ac.tailNumber}
                    </p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {ac.make} {ac.model}
                    </p>
                  </div>
                  <div
                    className="rounded-lg border bg-background px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]"
                    style={statusStyle}
                  >
                    {documentStatus.label}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="rounded-lg border bg-muted/10 px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                      Document Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {documentStatus.summary}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Category
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ac.type || 'Single-Engine'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Configuration
                      </p>
                      <p className="mt-1 text-sm font-semibold uppercase text-foreground">
                        OEM Specification
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Hobbs
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ac.currentHobbs?.toFixed(1) || '0.0'}h
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
                        Tacho
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {ac.currentTacho?.toFixed(1) || '0.0'}h
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {!archived ? <ViewActionButton href={`/assets/aircraft/${ac.id}`} label="Open" /> : null}
                    <AircraftActions tenantId={tenantId} aircraft={ac} canEdit={canEdit} archived={archived} />
                  </div>
                </CardContent>
              </Card>
            );
          }}
          emptyState={(
            <div className="flex min-h-[360px] flex-col items-center justify-center border-b bg-muted/5 p-8 text-center text-muted-foreground">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                <Plane className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">Hangar Empty</p>
                <p className="text-[10px] font-bold uppercase tracking-widest italic">
                  No aviation assets have been registered yet.
                </p>
              </div>
            </div>
          )}
        />
      </div>
    </ScrollArea>
  );
}
