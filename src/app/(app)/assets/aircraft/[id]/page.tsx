'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { MainPageHeader, HEADER_ACTION_BUTTON_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { BackNavButton } from '@/components/back-nav-button';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { 
  Plane, 
  History, 
  FileText, 
  Settings2, 
  ArrowLeft, 
  PlusCircle, 
  Trash2, 
  Clock, 
  Gauge, 
  AlertCircle,
  CalendarIcon,
  Eye,
  Pencil,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger, 
  DialogFooter, 
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DocumentUploader } from '@/components/document-uploader';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import type { MaintenanceLog } from '@/types/maintenance';
import { Separator } from '@/components/ui/separator';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import type { AircraftInspectionWarningSettings } from '@/types/inspection';
import { getContrastingTextColor, getDocumentExpiryBadgeStyle, getInspectionWarningStyle } from '@/lib/document-expiry';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';

const toNoonUtcIso = (date: Date) =>
  new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString();

const parseLocalDate = (value?: string | null) => {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? undefined : fallback;
  }
  return new Date(year, month - 1, day, 12);
};

type AircraftDocumentUpload = {
  name: string;
  url: string;
  uploadDate: string;
  expirationDate: string | null;
};

const editAircraftSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  type: z.string().min(1),
  initialHobbs: z.coerce.number(),
  currentHobbs: z.coerce.number(),
  initialTacho: z.coerce.number(),
  currentTacho: z.coerce.number(),
  tachoAtNext50Inspection: z.coerce.number(),
  tachoAtNext100Inspection: z.coerce.number(),
});

type EditAircraftValues = z.infer<typeof editAircraftSchema>;

const maintenanceLogSchema = z.object({
  date: z.string(),
  maintenanceType: z.string().min(1),
  details: z.string().min(1),
  reference: z.string().optional(),
  ameNo: z.string().optional(),
  amoNo: z.string().optional(),
});

type MaintenanceLogValues = z.infer<typeof maintenanceLogSchema>;

const componentSchema = z.object({
  name: z.string().min(1),
  serialNumber: z.string().min(1),
  tsn: z.coerce.number(),
  tso: z.coerce.number(),
  totalTime: z.coerce.number(),
  maxHours: z.coerce.number(),
});

type ComponentValues = z.infer<typeof componentSchema>;

interface AircraftDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function AircraftDetailPage({ params }: AircraftDetailPageProps) {
  const resolvedParams = use(params);
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const aircraftId = resolvedParams.id;

  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [inspectionSettings, setInspectionSettings] = useState<AircraftInspectionWarningSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch(`/api/aircraft/${aircraftId}`, { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ aircraft: null }));
        setAircraft((payload.aircraft as Aircraft | null) || null);
        setLogs(((payload.aircraft as Aircraft | null)?.maintenanceLogs as MaintenanceLog[] | undefined || []).slice().sort((a, b) => b.date.localeCompare(a.date)));

        const configResponse = await fetch('/api/tenant-config', { cache: 'no-store' });
        const configPayload = await configResponse.json().catch(() => ({ config: null }));
        setInspectionSettings((configPayload?.config?.['inspection-warning-settings'] as AircraftInspectionWarningSettings | undefined) || null);
    } catch (e) {
        console.error("Failed to load aircraft details", e);
    } finally {
        setIsLoading(false);
    }
  }, [aircraftId]);

  useEffect(() => {
    loadData();
    const events = ['safeviate-aircrafts-updated', 'safeviate-inspection-warning-settings-updated', 'safeviate-tenant-config-updated'];
    events.forEach(e => window.addEventListener(e, loadData));
    return () => events.forEach(e => window.removeEventListener(e, loadData));
  }, [loadData, aircraftId]);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!aircraft) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20 px-1">
        <div className="flex flex-col items-center gap-4 bg-muted/5 p-12 rounded-3xl border-2 border-dashed">
            <Plane className="h-16 w-16 text-muted-foreground opacity-20" />
            <div className="space-y-1">
                <p className="text-xl font-black uppercase tracking-tight">Aircraft Not Found</p>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground italic">The requested asset could not be located in the fleet inventory.</p>
            </div>
            <div className="mt-4">
                <BackNavButton href="/assets/aircraft" text="Back to Fleet" />
            </div>
        </div>
      </div>
    );
  }

  const timeTo50 = (aircraft.tachoAtNext50Inspection || 0) - (aircraft.currentTacho || 0);
  const timeTo100 = (aircraft.tachoAtNext100Inspection || 0) - (aircraft.currentTacho || 0);

  return (
    <div className={cn("max-w-[1400px] mx-auto w-full flex flex-col pt-2 px-1", isMobile ? "min-h-0 overflow-y-auto" : "h-full overflow-hidden")}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full flex-1 flex flex-col", isMobile ? "overflow-visible" : "overflow-hidden")}>
        
        <div className={cn("flex-1 pb-10", isMobile ? "overflow-visible" : "overflow-y-auto no-scrollbar")}>
          <Card className="shadow-none border rounded-xl overflow-hidden flex flex-col">
              <MainPageHeader
                title={aircraft.tailNumber}
                description={`${aircraft.make} ${aircraft.model}`}
                actions={
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <BackNavButton href="/assets/aircraft" text="Back to Fleet" />
                    <EditAircraftDialog aircraft={aircraft} tenantId={tenantId || ''} />
                  </div>
                }
              />

            <div className="border-b bg-muted/5 px-6 py-2 shrink-0 overflow-hidden">
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-md h-10 px-4 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm transition-all shrink-0 shadow-sm"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="maintenance" 
                  className="rounded-md h-10 px-4 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm transition-all shrink-0 shadow-sm"
                >
                  Maintenance
                </TabsTrigger>
                <TabsTrigger 
                  value="components" 
                  className="rounded-md h-10 px-4 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm transition-all shrink-0 shadow-sm"
                >
                  Components
                </TabsTrigger>
                <TabsTrigger 
                  value="documents" 
                  className="rounded-md h-10 px-4 py-2 border data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium text-sm transition-all shrink-0 shadow-sm"
                >
                  Documents
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="overview" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <CardContent className="p-4 sm:p-6 space-y-6">
                  <div className="grid gap-4 lg:grid-cols-3">
                    <Card className="shadow-none border overflow-hidden">
                      <CardHeader className="border-b bg-muted/20 px-4 py-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Info className="h-3.5 w-3.5" />
                          Specifications
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 py-4">
                        <DetailItem label="Manufacturer" value={aircraft.make} />
                        <DetailItem label="Model" value={aircraft.model} />
                        <DetailItem label="Engine Type" value={aircraft.type || 'N/A'} />
                      </CardContent>
                    </Card>

                    <Card className="shadow-none border overflow-hidden">
                      <CardHeader className="border-b bg-muted/20 px-4 py-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          Hobbs Meter
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 py-4">
                        <DetailItem label="Initial Hobbs" value={(aircraft.initialHobbs || 0).toFixed(1)} />
                        <DetailItem label="Current Hobbs" value={(aircraft.currentHobbs || 0).toFixed(1)} />
                      </CardContent>
                    </Card>

                    <Card className="shadow-none border overflow-hidden">
                      <CardHeader className="border-b bg-muted/20 px-4 py-3">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <Gauge className="h-3.5 w-3.5" />
                          Tacho Meter
                        </h3>
                      </CardHeader>
                      <CardContent className="space-y-3 px-4 py-4">
                        <DetailItem label="Initial Tacho" value={(aircraft.initialTacho || 0).toFixed(1)} />
                        <DetailItem label="Current Tacho" value={(aircraft.currentTacho || 0).toFixed(1)} />
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="shadow-none border overflow-hidden">
                    <CardHeader className="border-b bg-muted/20 px-4 py-3">
                      <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                          Inspection Service Targets
                      </h3>
                    </CardHeader>
                    <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                      <DetailItem label="Next 50h Tacho" value={(aircraft.tachoAtNext50Inspection || 0).toFixed(1)} />
                      <DetailItem label="Next 100h Tacho" value={(aircraft.tachoAtNext100Inspection || 0).toFixed(1)} />
                      <div className="rounded-lg border bg-background px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">To 50h Inspection</p>
                        <Badge
                          variant="outline"
                          style={getInspectionWarningStyle(timeTo50, '50', inspectionSettings) || undefined}
                          className="font-mono font-black text-sm h-10 px-6 rounded-lg shadow-sm border-2"
                        >
                          {timeTo50.toFixed(1)}h
                        </Badge>
                      </div>
                      <div className="rounded-lg border bg-background px-3 py-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">To 100h Inspection</p>
                        <Badge
                          variant="outline"
                          style={getInspectionWarningStyle(timeTo100, '100', inspectionSettings) || undefined}
                          className="font-mono font-black text-sm h-10 px-6 rounded-lg shadow-sm border-2"
                        >
                          {timeTo100.toFixed(1)}h
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </TabsContent>

              <TabsContent value="maintenance" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <MaintenanceTab aircraftId={aircraftId} tenantId={tenantId || ''} logs={logs || []} isLoading={isLoading} />
              </TabsContent>

              <TabsContent value="components" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <ComponentsTab aircraft={aircraft} tenantId={tenantId || ''} />
              </TabsContent>

              <TabsContent value="documents" className={cn("mt-0 outline-none", isMobile ? "min-h-0" : "h-full overflow-y-auto no-scrollbar")}>
                <DocumentsTab aircraft={aircraft} tenantId={tenantId || ''} />
              </TabsContent>
            </div>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground opacity-70">{label}</p>
      <p className="text-sm font-black text-foreground uppercase">{value}</p>
    </div>
  );
}

function MaintenanceTab({ aircraftId, tenantId, logs, isLoading }: { aircraftId: string; tenantId: string; logs: MaintenanceLog[]; isLoading: boolean }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 shrink-0">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight">Maintenance History</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-75">All recorded technical maintenance events and major inspections.</p>
        </div>
        <AddMaintenanceLogDialog aircraftId={aircraftId} tenantId={tenantId} />
      </div>
      <div className="flex-1 overflow-auto bg-background">
        <ResponsiveCardGrid
          items={logs}
          isLoading={isLoading}
          className="p-4"
          gridClassName="sm:grid-cols-2 xl:grid-cols-3"
          renderItem={(log) => (
            <Card key={log.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                    {format(parseLocalDate(log.date) || new Date(log.date), 'dd MMM yyyy')}
                  </CardTitle>
                  <CardDescription className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {log.reference || 'No reference recorded'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full text-[10px] font-black uppercase border-slate-300 bg-background">
                  {log.maintenanceType}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4 px-4 py-4">
                <div className="rounded-lg border bg-background px-3 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Details</p>
                  <p className="mt-1 text-sm italic text-foreground">"{log.details}"</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">AME Credentials</p>
                    <p className={cn("mt-1 text-sm font-semibold", log.ameNo ? "text-foreground" : "text-muted-foreground italic")}>
                      {log.ameNo || 'Not recorded'}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">AMO Credentials</p>
                    <p className={cn("mt-1 text-sm font-semibold", log.amoNo ? "text-foreground" : "text-muted-foreground italic")}>
                      {log.amoNo || 'Not recorded'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          emptyState={(
            <div className="flex min-h-[360px] flex-col items-center justify-center border-b bg-muted/5 p-8 text-center text-muted-foreground">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                <History className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">No maintenance history recorded for this asset.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest italic">{isLoading ? 'Decrypting maintenance logs...' : 'Add the first maintenance event to begin the log.'}</p>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function ComponentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 shrink-0">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight">Component Lifecycle</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-75">Track service intervals and remaining hours for critical serialized parts.</p>
        </div>
        <AddComponentDialog aircraftId={aircraft.id} tenantId={tenantId} />
      </div>
      <div className="flex-1 overflow-auto bg-background">
        <ResponsiveCardGrid
          items={aircraft.components || []}
          isLoading={false}
          className="p-4"
          gridClassName="sm:grid-cols-2 xl:grid-cols-3"
          renderItem={(comp) => {
            const remaining = comp.maxHours - comp.totalTime;
            return (
              <Card key={comp.id} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                      {comp.name}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Serial {comp.serialNumber}
                    </CardDescription>
                  </div>
                  <Badge variant={remaining < 50 ? "destructive" : "outline"} className="rounded-full font-mono font-black text-[10px] h-8 px-3 border-2 shadow-sm uppercase">
                    {remaining.toFixed(1)}h left
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">TSN</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{(comp.tsn || 0).toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">TSO</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{(comp.tso || 0).toFixed(1)}h</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Remaining</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{remaining.toFixed(1)}h</p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Limit</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{comp.maxHours.toFixed(1)}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }}
          emptyState={(
            <div className="flex min-h-[360px] flex-col items-center justify-center border-b bg-muted/5 p-8 text-center text-muted-foreground">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                <Settings2 className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">No serialized components tracked for this session.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Add the first part to start tracking lifecycle usage.</p>
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function DocumentsTab({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const { toast } = useToast();
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string } | null>(null);
  
  const [expirySettings, setExpirySettings] = useState<DocumentExpirySettings | null>(null);

  const loadExpirySettings = useCallback(() => {
    void fetch('/api/tenant-config', { cache: 'no-store' })
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        const settings = payload?.config?.['document-expiry-settings'] as DocumentExpirySettings | undefined;
        setExpirySettings(
          settings || {
            id: 'document-expiry',
            defaultColor: '#22c55e',
            expiredColor: '#ef4444',
            warningPeriods: [],
          }
        );
      })
      .catch(() =>
        setExpirySettings({
          id: 'document-expiry',
          defaultColor: '#22c55e',
          expiredColor: '#ef4444',
          warningPeriods: [],
        })
      );
  }, []);

  useEffect(() => {
    loadExpirySettings();
    const events = ['safeviate-document-expiry-settings-updated', 'safeviate-tenant-config-updated'];
    events.forEach((eventName) => window.addEventListener(eventName, loadExpirySettings));
    return () => events.forEach((eventName) => window.removeEventListener(eventName, loadExpirySettings));
  }, [loadExpirySettings]);

  const handleDocUpload = async (newDoc: AircraftDocumentUpload) => {
    try {
        const response = await fetch(`/api/aircraft/${aircraft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...aircraft, documents: [...(aircraft.documents || []), newDoc] } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to update aircraft documents.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        toast({ title: 'Document Added', description: `"${newDoc.name}" has been uploaded.` });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: 'Failed to update aircraft document list.' });
    }
  };

  const handleDeleteDoc = async (docName: string) => {
    try {
        const response = await fetch(`/api/aircraft/${aircraft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...aircraft, documents: (aircraft.documents || []).filter(d => d.name !== docName) } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to remove document.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        toast({ title: 'Document Removed' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to remove document.' });
    }
  };

  const handleExpirationDateChange = async (docName: string, date: Date | undefined) => {
    try {
        const updatedDocuments = (aircraft.documents || []).map((doc) =>
          doc.name === docName
            ? { ...doc, expirationDate: date ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)).toISOString() : null }
            : doc
        );
        const response = await fetch(`/api/aircraft/${aircraft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...aircraft, documents: updatedDocuments } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to update expiry date.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        toast({
          title: 'Expiry Date Updated',
          description: date ? `"${docName}" expiry updated.` : `"${docName}" expiry cleared.`,
        });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Failed to save expiry date.' });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-8 shrink-0">
        <div>
          <h3 className="text-xl font-black uppercase tracking-tight">Technical Library</h3>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-75">Aircraft certifications, insurance, and manufacturer manuals.</p>
        </div>
        <DocumentUploader
          onDocumentUploaded={handleDocUpload}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()} variant="outline" className="gap-2 h-10 px-8 text-[10px] font-black uppercase border-slate-300 shadow-sm bg-background">
              <PlusCircle className="h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </div>
      <div className="flex-1 overflow-auto bg-background">
        <ResponsiveCardGrid
          items={aircraft.documents || []}
          isLoading={false}
          className="p-4"
          gridClassName="sm:grid-cols-2 xl:grid-cols-3"
          renderItem={(doc) => {
            const expiryStyle = getDocumentExpiryBadgeStyle(doc.expirationDate, expirySettings);
            return (
              <Card key={doc.name} className="overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
                <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">
                      {doc.name}
                    </CardTitle>
                    <CardDescription className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      Uploaded {format(new Date(doc.uploadDate), 'dd MMM yyyy')}
                    </CardDescription>
                  </div>
                  <div className="rounded-full border bg-background px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-primary">
                    Document
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Uploaded</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{format(new Date(doc.uploadDate), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="rounded-lg border bg-background px-3 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Expiration</p>
                      <p className={cn("mt-1 text-sm font-semibold", !doc.expirationDate && "text-muted-foreground italic")}>
                        {doc.expirationDate ? format(parseLocalDate(doc.expirationDate) || new Date(doc.expirationDate), 'dd MMM yyyy') : 'No expiry set'}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "h-10 w-full justify-start gap-2 border-2 shadow-sm uppercase text-[10px] font-black",
                            !doc.expirationDate && "text-muted-foreground italic border-dashed"
                          )}
                          style={doc.expirationDate && expiryStyle ? {
                            backgroundColor: expiryStyle.borderColor || '#ffffff',
                            borderColor: expiryStyle.borderColor || '#ffffff',
                            color: getContrastingTextColor(expiryStyle.borderColor || '#ffffff'),
                          } : undefined}
                        >
                          <CalendarIcon className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {doc.expirationDate ? format(parseLocalDate(doc.expirationDate) || new Date(doc.expirationDate), 'dd MMM yyyy') : 'Set Expiry Date'}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl border-2 shadow-2xl overflow-hidden" align="start">
                        <CustomCalendar
                          selectedDate={doc.expirationDate ? parseLocalDate(doc.expirationDate) : undefined}
                          onDateSelect={(date) => handleExpirationDateChange(doc.name, date)}
                        />
                      </PopoverContent>
                    </Popover>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-10 w-10 hover:bg-primary hover:text-primary-foreground border-slate-300 shadow-sm transition-all" onClick={() => setViewingDoc({ name: doc.name, url: doc.url })}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-slate-300 shadow-sm transition-all" onClick={() => handleDeleteDoc(doc.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }}
          emptyState={(
            <div className="flex min-h-[360px] flex-col items-center justify-center border-b bg-muted/5 p-8 text-center text-muted-foreground">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                <FileText className="h-6 w-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-sm font-bold uppercase tracking-wider text-foreground">No technical certifications uploaded.</p>
                <p className="text-[10px] font-bold uppercase tracking-widest italic">Add the first document to start the aircraft library.</p>
              </div>
            </div>
          )}
        />
      </div>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">{viewingDoc?.name}</DialogTitle>
            <DialogDescription className="text-xs uppercase tracking-widest">Document Preview</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border bg-muted/20">
            {viewingDoc && <img src={viewingDoc.url} alt={viewingDoc.name} className="h-full w-full object-contain" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Modals ---

function EditAircraftDialog({ aircraft, tenantId }: { aircraft: Aircraft; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<EditAircraftValues>({
    resolver: zodResolver(editAircraftSchema),
    defaultValues: {
      make: aircraft.make || '',
      model: aircraft.model || '',
      type: aircraft.type || 'Single-Engine',
      initialHobbs: aircraft.initialHobbs || 0,
      currentHobbs: aircraft.currentHobbs || 0,
      initialTacho: aircraft.initialTacho || 0,
      currentTacho: aircraft.currentTacho || 0,
      tachoAtNext50Inspection: aircraft.tachoAtNext50Inspection || 0,
      tachoAtNext100Inspection: aircraft.tachoAtNext100Inspection || 0,
    }
  });

  const onSubmit = async (values: EditAircraftValues) => {
    try {
        const response = await fetch(`/api/aircraft/${aircraft.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...aircraft, ...values } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save aircraft configuration.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        
        toast({ title: 'Asset Updated', description: `Configuration for ${aircraft.tailNumber} has been synchronized.` });
        setIsOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Failed to save asset configuration.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-10 px-8 text-[10px] font-black uppercase border-slate-300 shadow-sm bg-background">
          <Pencil className="h-3.5 w-3.5" /> Edit Specs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Physical Specifications</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Update the technical offsets and meter readings for {aircraft.tailNumber}.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField control={form.control} name="make" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Manufacturer</FormLabel><FormControl><Input className="h-11 font-bold" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="model" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Model</FormLabel><FormControl><Input className="h-11 font-bold" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="type" render={({ field }) => ( 
                <FormItem className="col-span-2">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest">Engine Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="Single-Engine">Single-Engine</SelectItem>
                      <SelectItem value="Multi-Engine">Multi-Engine</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem> 
              )}/>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <FormField control={form.control} name="initialHobbs" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Initial Hobbs</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="currentHobbs" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Current Hobbs</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="initialTacho" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-60">Initial Tacho</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-bold" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="currentTacho" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Current Tacho</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl></FormItem> )}/>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-12 bg-primary/5 p-6 rounded-2xl border border-primary/20">
              <FormField control={form.control} name="tachoAtNext50Inspection" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Next 50h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black text-primary border-primary/30" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="tachoAtNext100Inspection" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Next 100h Tacho Target</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black text-primary border-primary/30" {...field} /></FormControl></FormItem> )}/>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline" className="h-11 px-10 text-[10px] font-black uppercase border-slate-300 shadow-sm">Cancel</Button></DialogClose>
              <Button type="submit" className="h-11 px-10 text-[10px] font-black uppercase shadow-lg">Save Configuration</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddMaintenanceLogDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<MaintenanceLogValues>({
    resolver: zodResolver(maintenanceLogSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      maintenanceType: 'Scheduled Inspection',
      details: '',
      reference: '',
      ameNo: '',
      amoNo: '',
    }
  });

  const onSubmit = async (values: MaintenanceLogValues) => {
    try {
        const currentResponse = await fetch(`/api/aircraft/${aircraftId}`, { cache: 'no-store' });
        const currentPayload = await currentResponse.json().catch(() => ({ aircraft: null }));
        const logs = ((currentPayload.aircraft?.maintenanceLogs as MaintenanceLog[]) || []).slice();

        const newLog: MaintenanceLog = {
            ...values,
            id: crypto.randomUUID(),
            aircraftId,
        };

        const nextLogs = [newLog, ...logs];
        const response = await fetch(`/api/aircraft/${aircraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...currentPayload.aircraft, maintenanceLogs: nextLogs } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save maintenance log.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));

        toast({ title: 'Log Registered', description: 'Maintenance event has been documented in the permanent record.' });
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to record maintenance event.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-10 px-8 text-[10px] font-black uppercase shadow-lg">
          <PlusCircle className="h-4 w-4" /> Register Service Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Technical Record Entry</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Document the details of the technical intervention or inspection.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="date" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Entry Date</FormLabel><FormControl><Input type="date" className="h-11 font-bold" {...field} /></FormControl></FormItem> )}/>
                <FormField control={form.control} name="maintenanceType" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Event Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Scheduled Inspection">Scheduled Inspection</SelectItem><SelectItem value="Defect Rectification">Defect Rectification</SelectItem><SelectItem value="Component Change">Component Change</SelectItem><SelectItem value="Service Bulletin">Service Bulletin</SelectItem></SelectContent></Select></FormItem> )}/>
            </div>
            <FormField control={form.control} name="reference" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Reference / Release #</FormLabel><FormControl><Input placeholder="Internal Release # or AMO Reference..." className="h-11 font-mono font-bold" {...field} /></FormControl></FormItem> )}/>
            <FormField control={form.control} name="details" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Technical Intervention Details</FormLabel><FormControl><Textarea className="min-h-[120px] font-medium p-4 bg-muted/5 border-2" placeholder="Describe the work performed, defects cleared, or components replaced..." {...field} /></FormControl></FormItem> )}/>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="ameNo" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">AME License Number</FormLabel><FormControl><Input className="h-11 font-black text-sm text-primary" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="amoNo" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">AMO Certification #</FormLabel><FormControl><Input className="h-11 font-black text-sm" {...field} /></FormControl></FormItem> )}/>
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline" className="h-11 px-8 text-[10px] font-black uppercase border-slate-300">Cancel</Button></DialogClose>
              <Button type="submit" className="h-11 px-8 text-[10px] font-black uppercase shadow-lg">Commit To Record</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddComponentDialog({ aircraftId, tenantId }: { aircraftId: string; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<ComponentValues>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      serialNumber: '',
      tsn: 0,
      tso: 0,
      totalTime: 0,
      maxHours: 2000,
    }
  });

  const onSubmit = async (values: ComponentValues) => {
    try {
        const currentResponse = await fetch(`/api/aircraft/${aircraftId}`, { cache: 'no-store' });
        const currentPayload = await currentResponse.json().catch(() => ({ aircraft: null }));
        const currentAircraft = currentPayload.aircraft as Aircraft | null;
        const newComponent = { ...values, id: crypto.randomUUID(), installDate: toNoonUtcIso(new Date()) };
        const response = await fetch(`/api/aircraft/${aircraftId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ aircraft: { ...currentAircraft, components: [...(currentAircraft?.components || []), newComponent] } }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to add component.');
        window.dispatchEvent(new Event('safeviate-aircrafts-updated'));
        
        toast({ title: 'Component Tracked', description: `Lifecycle monitoring enabled for ${values.name}.` });
        setIsOpen(false);
        form.reset();
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add component to tracking list.' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2 h-10 px-8 text-[10px] font-black uppercase shadow-lg bg-background text-foreground border-2 hover:bg-muted">
          <PlusCircle className="h-4 w-4" /> Monitor Serialized Part
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-3xl p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight">Serialized Component Lifecycle</DialogTitle>
          <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Register a new life-limited component for automatic time tracking.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Component Name</FormLabel><FormControl><Input placeholder="e.g., Engine, Propeller" className="h-11 font-bold" {...field} /></FormControl></FormItem> )}/>
                <FormField control={form.control} name="serialNumber" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Serial Number</FormLabel><FormControl><Input className="h-11 font-mono font-black uppercase" {...field} /></FormControl></FormItem> )}/>
            </div>
            <div className="grid grid-cols-2 gap-6 bg-muted/10 p-6 rounded-2xl border-2 shadow-inner">
              <FormField control={form.control} name="tsn" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">TSN (Time Since New)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="tso" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest opacity-70">TSO (Time Since OH)</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="totalTime" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Current Total Hours</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black text-primary" {...field} /></FormControl></FormItem> )}/>
              <FormField control={form.control} name="maxHours" render={({ field }) => ( <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest">Service Life Limit</FormLabel><FormControl><Input type="number" step="0.1" className="h-11 font-mono font-black text-destructive" {...field} /></FormControl></FormItem> )}/>
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild><Button variant="outline" className="h-11 px-10 text-[10px] font-black uppercase border-slate-300 shadow-sm">Cancel</Button></DialogClose>
              <Button type="submit" className="h-11 px-10 text-[10px] font-black uppercase shadow-lg">Enable Tracking</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
