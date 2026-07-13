'use client';

import { Plane } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { Aircraft } from '@/types/aircraft';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AircraftActions } from './aircraft-actions';
import { ViewActionButton } from '@/components/record-action-buttons';
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
      <div className="divide-y">
        {data.map((ac) => {
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
              <div
                key={ac.id}
                className="grid gap-3 px-4 py-3 transition-colors hover:bg-muted/10 lg:grid-cols-[minmax(180px,1.2fr)_minmax(190px,1fr)_minmax(180px,1fr)_minmax(150px,0.8fr)_auto] lg:items-center"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                      {ac.tailNumber}
                    </p>
                    <span
                      className="shrink-0 rounded-md border bg-background px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em]"
                      style={statusStyle}
                    >
                      {documentStatus.label}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {ac.make} {ac.model}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Document Status</p>
                  <p className="truncate text-xs font-semibold text-foreground">{documentStatus.summary}</p>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Category</p>
                  <p className="truncate text-xs font-semibold text-foreground">{ac.type || 'Single-Engine'}</p>
                </div>

                <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Hobbs</span>
                    <strong className="block text-xs font-semibold text-foreground">{ac.currentHobbs?.toFixed(1) || '0.0'}h</strong>
                  </span>
                  <span>
                    <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Tacho</span>
                    <strong className="block text-xs font-semibold text-foreground">{ac.currentTacho?.toFixed(1) || '0.0'}h</strong>
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  {!archived ? <ViewActionButton href={`/assets/aircraft/${ac.id}`} label="Open" iconOnly /> : null}
                  <AircraftActions tenantId={tenantId} aircraft={ac} canEdit={canEdit} archived={archived} />
                </div>
              </div>
            );
          })}
      </div>
    </ScrollArea>
  );
}
