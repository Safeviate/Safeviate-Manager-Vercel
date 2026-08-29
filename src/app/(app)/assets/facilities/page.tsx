'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Building2, ClipboardPlus, FileText, ImageIcon, MapPinned, Plus, Trash2, Wrench } from 'lucide-react';
import { MainPageHeader, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { usePermissions } from '@/hooks/use-permissions';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { useToast } from '@/hooks/use-toast';

type FacilityZone = { id: string; name: string; category?: string; notes?: string };
type FacilityAsset = { id: string; name: string; category?: string; zoneId?: string; status?: string; toolId?: string; companyNumber?: string };
type FacilityDocument = { id: string; documentId: string; kind: 'SOP' | 'Manual' | 'Diagram'; title?: string; zoneId?: string };
type Facility = { id: string; name: string; type: string; code?: string; location?: string; status: string; notes?: string; zones: FacilityZone[]; assets: FacilityAsset[]; documents: FacilityDocument[]; createdAt: string; updatedAt: string };
type CompanyDocument = { id: string; name: string; url: string; type: 'file' | 'image' };
type RegisteredTool = { id: string; name: string; serialNumber: string; assetTag?: string; equipmentCategory?: string; status: string };
type FacilityMaintenanceReport = { id: string; facilityId: string; zoneId?: string; assetId?: string; title: string; category: string; description?: string; priority: 'Low' | 'Medium' | 'High' | 'Critical'; operationalImpact: 'Serviceable' | 'Restricted' | 'Out of service'; status: 'Open' | 'Assigned' | 'In progress' | 'Closed'; assignedTo?: string; dueDate?: string; verificationNotes?: string; createdAt: string; updatedAt: string; closedAt?: string };

const blankFacility = (): Facility => ({ id: crypto.randomUUID(), name: '', type: 'Airport', code: '', location: '', status: 'Operational', notes: '', zones: [], assets: [], documents: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

export default function FacilitiesPage() {
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/assets/facilities' });
  const { hasPermission } = usePermissions();
  const searchParams = useSearchParams();
  const requestedFacilityId = searchParams?.get('facilityId')?.trim() || '';
  const { toast } = useToast();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [tools, setTools] = useState<RegisteredTool[]>([]);
  const [maintenanceReports, setMaintenanceReports] = useState<FacilityMaintenanceReport[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [zoneDialog, setZoneDialog] = useState(false);
  const [assetDialog, setAssetDialog] = useState(false);
  const [documentKind, setDocumentKind] = useState<FacilityDocument['kind'] | null>(null);
  const [reportDialog, setReportDialog] = useState<FacilityMaintenanceReport | null>(null);
  const [saving, setSaving] = useState(false);

  const canManage = hasPermission('assets-create') || hasPermission('assets-edit');
  const canReport = hasPermission('operations-view') || canManage;
  const selected = facilities.find((facility) => facility.id === selectedId) || facilities[0] || null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [facilitiesResponse, documentsResponse, toolsResponse, reportsResponse] = await Promise.all([
        fetch('/api/facilities', { cache: 'no-store' }),
        fetch('/api/company-documents', { cache: 'no-store' }),
        fetch('/api/tools', { cache: 'no-store' }),
        fetch('/api/facilities/maintenance-reports', { cache: 'no-store' }),
      ]);
      const [facilitiesPayload, documentsPayload, toolsPayload, reportsPayload] = await Promise.all([facilitiesResponse.json(), documentsResponse.json(), toolsResponse.json(), reportsResponse.json()]);
      const rows = Array.isArray(facilitiesPayload.facilities) ? facilitiesPayload.facilities : [];
      setFacilities(rows);
      setSelectedId((current) => requestedFacilityId && rows.some((facility: Facility) => facility.id === requestedFacilityId) ? requestedFacilityId : current && rows.some((facility: Facility) => facility.id === current) ? current : rows[0]?.id || null);
      setDocuments(Array.isArray(documentsPayload.documents) ? documentsPayload.documents : []);
      setTools(Array.isArray(toolsPayload.tools) ? toolsPayload.tools : []);
      setMaintenanceReports(Array.isArray(reportsPayload.reports) ? reportsPayload.reports : []);
    } catch {
      toast({ variant: 'destructive', title: 'Load failed', description: 'Could not load facilities.' });
    } finally { setLoading(false); }
  }, [requestedFacilityId, toast]);

  useEffect(() => { void load(); }, [load]);

  const save = async (facility: Facility) => {
    setSaving(true);
    try {
      const response = await fetch('/api/facilities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ facility }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Save failed');
      const saved = payload.facility as Facility;
      setFacilities((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved]);
      setSelectedId(saved.id);
      setEditing(null);
      toast({ title: 'Facility saved', description: `${saved.name} is available to this tenant.` });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error instanceof Error ? error.message : 'Could not save facility.' });
    } finally { setSaving(false); }
  };

  const remove = async (facility: Facility) => {
    if (!window.confirm(`Remove ${facility.name}? This will not delete its controlled documents.`)) return;
    try {
      const response = await fetch(`/api/facilities?id=${encodeURIComponent(facility.id)}`, { method: 'DELETE' });
      if (!response.ok) throw new Error();
      setFacilities((current) => current.filter((item) => item.id !== facility.id));
      setSelectedId(null);
      toast({ title: 'Facility removed' });
    } catch { toast({ variant: 'destructive', title: 'Remove failed', description: 'Could not remove facility.' }); }
  };

  const linkedDocuments = useMemo(() => (selected?.documents || []).map((link) => ({ link, document: documents.find((document) => document.id === link.documentId) })).filter((entry) => entry.document), [selected?.documents, documents]);
  const updateSelected = (change: (facility: Facility) => Facility) => { if (selected) void save(change(selected)); };
  const saveReport = async (report: FacilityMaintenanceReport) => {
    try {
      const response = await fetch('/api/facilities/maintenance-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not save maintenance report.');
      const saved = payload.report as FacilityMaintenanceReport;
      setMaintenanceReports((current) => current.some((item) => item.id === saved.id) ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setReportDialog(null);
      toast({ title: saved.status === 'Closed' ? 'Maintenance report closed' : 'Maintenance report saved', description: saved.title });
    } catch (error) { toast({ variant: 'destructive', title: 'Save failed', description: error instanceof Error ? error.message : 'Could not save maintenance report.' }); }
  };

  if (!isAccessLoading && !isAllowed) return <TenantLayoutDisabledState />;
  if (loading || isAccessLoading) return <div className="mx-auto w-full max-w-[1180px] space-y-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-[520px] w-full" /></div>;

  return <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
    <Card className="overflow-hidden border shadow-none">
      <MainPageHeader title="Facilities" description="Manage airports, heliports, operating zones, controlled SOPs and manuals, and airport diagrams." actions={canManage ? <Button className={HEADER_SECONDARY_BUTTON_CLASS} onClick={() => setEditing(blankFacility())}><Plus className="h-3.5 w-3.5" /> Add facility</Button> : undefined} />
      <CardContent className="p-3">
        {facilities.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center"><Building2 className="h-9 w-9 text-muted-foreground" /><div><p className="font-semibold">No facilities yet</p><p className="mt-1 text-sm text-muted-foreground">Add an airport, heliport, base, or helistop. Existing quality audits and checklists remain your inspection tools.</p></div>{canManage && <Button onClick={() => setEditing(blankFacility())}>Add first facility</Button>}</div> : <div className="grid gap-3 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-2">{facilities.map((facility) => <button key={facility.id} type="button" onClick={() => setSelectedId(facility.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selected?.id === facility.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-bold">{facility.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{facility.type}{facility.code ? ` · ${facility.code}` : ''}</p></div><Badge variant="outline" className="text-[10px]">{facility.status}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{facility.zones.length} zones · {facility.assets.length} assets · {facility.documents.length} documents</p></button>)}</aside>
          {selected && <section className="space-y-3"><Card className="overflow-hidden border shadow-none"><div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><MapPinned className="h-4 w-4 text-primary" /><h2 className="font-bold">{selected.name}</h2><Badge>{selected.type}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{selected.location || 'Location not specified'}{selected.code ? ` · ${selected.code}` : ''}</p></div>{canManage && <div className="flex gap-2"><Button asChild variant="outline" size="sm"><a href={`/assets/facilities/${encodeURIComponent(selected.id)}/report-qr`}>Report QR</a></Button><Button variant="outline" size="sm" onClick={() => setEditing(selected)}>Edit</Button><Button variant="outline" size="sm" className="text-destructive" onClick={() => void remove(selected)}><Trash2 className="mr-1 h-3.5 w-3.5" />Remove</Button></div>}</div><CardContent className="grid gap-3 p-4 sm:grid-cols-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Operating status</p><p className="mt-1 font-semibold">{selected.status}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Zones</p><p className="mt-1 font-semibold">{selected.zones.length}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assets</p><p className="mt-1 font-semibold">{selected.assets.length}</p></div>{selected.notes && <p className="sm:col-span-3 text-sm text-muted-foreground">{selected.notes}</p>}</CardContent></Card>
            <FacilitySection title="Maintenance reports" icon={<ClipboardPlus className="h-4 w-4" />} action={canReport ? <Button size="sm" onClick={() => setReportDialog({ id: crypto.randomUUID(), facilityId: selected.id, title: '', category: 'General facility', description: '', priority: 'Medium', operationalImpact: 'Serviceable', status: 'Open', assignedTo: '', dueDate: '', verificationNotes: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })}>Report issue</Button> : undefined}>{maintenanceReports.filter((report) => report.facilityId === selected.id).length === 0 ? <Empty label="Record infrastructure defects and maintenance needs here. Aircraft workpacks remain in Maintenance." /> : <div className="space-y-2">{maintenanceReports.filter((report) => report.facilityId === selected.id).map((report) => <div key={report.id} className="flex flex-col gap-2 rounded border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{report.title}</p><p className="text-xs text-muted-foreground">{report.category} · {selected.zones.find((zone) => zone.id === report.zoneId)?.name || 'Facility-wide'}{selected.assets.find((asset) => asset.id === report.assetId) ? ` · ${selected.assets.find((asset) => asset.id === report.assetId)?.name}` : ''}{report.assignedTo ? ` · Assigned to ${report.assignedTo}` : ''}</p></div><div className="flex flex-wrap items-center gap-1"><Badge variant="outline">{report.priority}</Badge><Badge variant="outline">{report.operationalImpact}</Badge><Badge variant="outline">{report.status}</Badge>{canManage && <Button variant="outline" size="sm" onClick={() => setReportDialog(report)}>Update</Button>}</div></div>)}</div>}</FacilitySection>
            <div className="grid gap-3 xl:grid-cols-2"><FacilitySection title="Zones & equipment" icon={<Wrench className="h-4 w-4" />} action={canManage ? <><Button variant="outline" size="sm" onClick={() => setZoneDialog(true)}>Add zone</Button><Button size="sm" onClick={() => setAssetDialog(true)}>Link equipment</Button></> : undefined}>{selected.zones.length === 0 && selected.assets.length === 0 ? <Empty label="Add zones, then link registered tools and equipment such as ladders, lighting, fuel, or rescue equipment." /> : <div className="space-y-2">{selected.zones.map((zone) => <div key={zone.id} className="rounded border px-3 py-2"><p className="text-sm font-medium">{zone.name}</p><p className="text-xs text-muted-foreground">{zone.category || 'Operating zone'} · {selected.assets.filter((asset) => asset.zoneId === zone.id).length} assets</p></div>)}{selected.assets.map((asset) => <div key={asset.id} className="flex items-center justify-between rounded border px-3 py-2"><div><p className="text-sm font-medium">{asset.name}</p><p className="text-xs text-muted-foreground">{asset.companyNumber ? `Company no. ${asset.companyNumber} · ` : ''}{asset.category || 'Facility equipment'}{selected.zones.find((zone) => zone.id === asset.zoneId) ? ` · ${selected.zones.find((zone) => zone.id === asset.zoneId)?.name}` : ''}</p></div><Badge variant="outline">{asset.status || 'Serviceable'}</Badge></div>)}</div>}</FacilitySection>
              <FacilitySection title="SOPs & manuals" icon={<FileText className="h-4 w-4" />} action={canManage ? <Button size="sm" onClick={() => setDocumentKind('SOP')}>Link document</Button> : undefined}>{linkedDocuments.filter(({ link }) => link.kind !== 'Diagram').length === 0 ? <Empty label="Link controlled documents from Company Documents; no duplicate files are created." /> : <DocumentLinks rows={linkedDocuments.filter(({ link }) => link.kind !== 'Diagram')} canManage={canManage} onUnlink={(id) => updateSelected((facility) => ({ ...facility, documents: facility.documents.filter((item) => item.id !== id) }))} />}</FacilitySection>
              <FacilitySection title="Airport & heliport diagrams" icon={<ImageIcon className="h-4 w-4" />} action={canManage ? <Button size="sm" onClick={() => setDocumentKind('Diagram')}>Link diagram</Button> : undefined}>{linkedDocuments.filter(({ link }) => link.kind === 'Diagram').length === 0 ? <Empty label="Link controlled airport diagrams, approach plates, site plans, or heliport drawings." /> : <DocumentLinks rows={linkedDocuments.filter(({ link }) => link.kind === 'Diagram')} canManage={canManage} onUnlink={(id) => updateSelected((facility) => ({ ...facility, documents: facility.documents.filter((item) => item.id !== id) }))} />}</FacilitySection>
            </div></section>}
        </div>}
      </CardContent>
    </Card>
    <FacilityDialog facility={editing} saving={saving} onClose={() => setEditing(null)} onSave={save} />
    {selected && <ZoneDialog open={zoneDialog} onClose={() => setZoneDialog(false)} onSave={(zone) => updateSelected((facility) => ({ ...facility, zones: [...facility.zones, zone] }))} />}
    {selected && <AssetDialog open={assetDialog} tools={tools} zones={selected.zones} onClose={() => setAssetDialog(false)} onSave={(asset) => updateSelected((facility) => ({ ...facility, assets: [...facility.assets, asset] }))} />}
    {selected && <LinkDocumentDialog open={Boolean(documentKind)} kind={documentKind || 'SOP'} documents={documents} onClose={() => setDocumentKind(null)} onSave={(document) => updateSelected((facility) => ({ ...facility, documents: [...facility.documents, document] }))} />}
    {selected && <MaintenanceReportDialog report={reportDialog} zones={selected.zones} assets={selected.assets} onClose={() => setReportDialog(null)} onSave={saveReport} />}
  </div>;
}

function FacilitySection({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) { return <Card className="overflow-hidden border shadow-none"><div className="flex min-h-[38px] items-center justify-between gap-2 border-b bg-muted/20 px-3"><div className="flex items-center gap-2 text-sm font-bold">{icon}{title}</div><div className="flex gap-1">{action}</div></div><CardContent className="p-3">{children}</CardContent></Card>; }
function Empty({ label }: { label: string }) { return <p className="rounded border border-dashed p-3 text-sm text-muted-foreground">{label}</p>; }
function DocumentLinks({ rows, canManage, onUnlink }: { rows: { link: FacilityDocument; document?: CompanyDocument }[]; canManage: boolean; onUnlink: (id: string) => void }) { return <div className="space-y-2">{rows.map(({ link, document }) => document && <div key={link.id} className="flex items-center justify-between gap-3 rounded border px-3 py-2"><a href={document.url} target="_blank" rel="noreferrer" className="min-w-0 text-sm font-medium text-primary hover:underline">{document.name}</a><div className="flex shrink-0 items-center gap-2"><Badge variant="outline">{link.kind}</Badge>{canManage && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUnlink(link.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</div></div>)}</div>; }
function FacilityDialog({ facility, saving, onClose, onSave }: { facility: Facility | null; saving: boolean; onClose: () => void; onSave: (facility: Facility) => void }) { const [draft, setDraft] = useState<Facility | null>(facility); useEffect(() => setDraft(facility), [facility]); if (!draft) return null; const set = (key: keyof Facility, value: string) => setDraft({ ...draft, [key]: value }); return <Dialog open={Boolean(facility)} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>{facility?.name ? 'Edit facility' : 'Add facility'}</DialogTitle><DialogDescription>Register the physical operating location. Checklists and audits continue to be completed in Quality.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label="Name"><Input value={draft.name} onChange={(event) => set('name', event.target.value)} /></Field><Field label="Type"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.type} onChange={(event) => set('type', event.target.value)}>{['Airport', 'Heliport', 'Helistop', 'Base', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="ICAO / local code"><Input value={draft.code || ''} onChange={(event) => set('code', event.target.value)} /></Field><Field label="Location"><Input value={draft.location || ''} onChange={(event) => set('location', event.target.value)} /></Field><Field label="Operating status"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={(event) => set('status', event.target.value)}>{['Operational', 'Restricted', 'Inactive'].map((item) => <option key={item}>{item}</option>)}</select></Field></div><Field label="Notes"><Textarea value={draft.notes || ''} onChange={(event) => set('notes', event.target.value)} /></Field><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!draft.name.trim() || saving} onClick={() => onSave(draft)}>{saving ? 'Saving…' : 'Save facility'}</Button></DialogFooter></DialogContent></Dialog>; }
function ZoneDialog({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (zone: FacilityZone) => void }) { const [name, setName] = useState(''); const [category, setCategory] = useState(''); return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>Add operating zone</DialogTitle></DialogHeader><Field label="Zone name"><Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Apron, runway, fuel farm…" /></Field><Field label="Category"><Input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Airside, landside, operational…" /></Field><DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!name.trim()} onClick={() => { onSave({ id: crypto.randomUUID(), name: name.trim(), category: category.trim() }); setName(''); setCategory(''); onClose(); }}>Add zone</Button></DialogFooter></DialogContent></Dialog>; }
function AssetDialog({ open, tools, zones, onClose, onSave }: { open: boolean; tools: RegisteredTool[]; zones: FacilityZone[]; onClose: () => void; onSave: (asset: FacilityAsset) => void }) { const [toolId, setToolId] = useState(''); const [zoneId, setZoneId] = useState(''); const selectedTool = tools.find((tool) => tool.id === toolId); return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>Link registered equipment</DialogTitle><DialogDescription>This assigns an item from Assets → Tools & Equipment to this facility; it does not create another asset record.</DialogDescription></DialogHeader>{tools.length === 0 ? <div className="space-y-3 rounded border border-dashed p-3"><p className="text-sm text-muted-foreground">No equipment is registered yet. Add the master record, including its company number, first.</p><Button asChild className="w-full"><a href="/assets/tools">Open Tools & Equipment</a></Button></div> : <><Field label="Registered equipment"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={toolId} onChange={(event) => setToolId(event.target.value)}><option value="">Select equipment</option>{tools.map((tool) => <option key={tool.id} value={tool.id}>{tool.assetTag ? `${tool.assetTag} · ` : ''}{tool.name} · {tool.serialNumber}</option>)}</select></Field><Field label="Zone"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={zoneId} onChange={(event) => setZoneId(event.target.value)}><option value="">Unassigned</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field></>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>{tools.length > 0 && <Button disabled={!selectedTool} onClick={() => { if (selectedTool) onSave({ id: crypto.randomUUID(), toolId: selectedTool.id, name: selectedTool.name, companyNumber: selectedTool.assetTag, category: selectedTool.equipmentCategory, zoneId, status: selectedTool.status }); setToolId(''); setZoneId(''); onClose(); }}>Link equipment</Button>}</DialogFooter></DialogContent></Dialog>; }
function LinkDocumentDialog({ open, kind, documents, onClose, onSave }: { open: boolean; kind: FacilityDocument['kind']; documents: CompanyDocument[]; onClose: () => void; onSave: (document: FacilityDocument) => void }) { const [documentId, setDocumentId] = useState(''); const hasDocuments = documents.length > 0; return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>Link {kind.toLowerCase()}</DialogTitle><DialogDescription>This links an existing controlled Company Document. Updating the document remains centralized.</DialogDescription></DialogHeader>{!hasDocuments ? <div className="space-y-3 rounded border border-dashed p-3"><p className="text-sm text-muted-foreground">There are no Company Documents available yet. Upload the source SOP, manual, or diagram first, then return here to link it.</p><Button asChild className="w-full"><a href="/operations/company-documents">Open Company Documents</a></Button></div> : <Field label="Controlled document"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">Select a document</option>{documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}</select></Field>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button>{hasDocuments && <Button disabled={!documentId} onClick={() => { const document = documents.find((item) => item.id === documentId); if (document) onSave({ id: crypto.randomUUID(), documentId, kind, title: document.name }); setDocumentId(''); onClose(); }}>Link document</Button>}</DialogFooter></DialogContent></Dialog>; }
function MaintenanceReportDialog({ report, zones, assets, onClose, onSave }: { report: FacilityMaintenanceReport | null; zones: FacilityZone[]; assets: FacilityAsset[]; onClose: () => void; onSave: (report: FacilityMaintenanceReport) => void }) {
  const [draft, setDraft] = useState<FacilityMaintenanceReport | null>(report);
  useEffect(() => setDraft(report), [report]);
  if (!draft) return null;
  const set = <K extends keyof FacilityMaintenanceReport>(key: K, value: FacilityMaintenanceReport[K]) => setDraft({ ...draft, [key]: value });
  return <Dialog open={Boolean(report)} onOpenChange={(open) => !open && onClose()}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{report?.title ? 'Update maintenance report' : 'Report facility maintenance issue'}</DialogTitle><DialogDescription>Use this for facility infrastructure and equipment. Aircraft defects and workpacks remain in Maintenance.</DialogDescription></DialogHeader><div className="grid gap-3 sm:grid-cols-2"><Field label="Issue title"><Input value={draft.title} onChange={(event) => set('title', event.target.value)} placeholder="Apron floodlight not working" /></Field><Field label="Category"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.category} onChange={(event) => set('category', event.target.value)}>{['General facility', 'Lighting and markings', 'Pavement and surface', 'Fuel and rescue equipment', 'Security and fencing', 'Drainage and utilities', 'Diagram or signage'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Zone"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.zoneId || ''} onChange={(event) => set('zoneId', event.target.value)}><option value="">Facility-wide</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></Field><Field label="Equipment"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.assetId || ''} onChange={(event) => set('assetId', event.target.value)}><option value="">No linked equipment</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></Field><Field label="Priority"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.priority} onChange={(event) => set('priority', event.target.value as FacilityMaintenanceReport['priority'])}>{['Low', 'Medium', 'High', 'Critical'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Operational impact"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.operationalImpact} onChange={(event) => set('operationalImpact', event.target.value as FacilityMaintenanceReport['operationalImpact'])}>{['Serviceable', 'Restricted', 'Out of service'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Assigned to"><Input value={draft.assignedTo || ''} onChange={(event) => set('assignedTo', event.target.value)} placeholder="Responsible person or team" /></Field><Field label="Target date"><Input type="date" value={draft.dueDate?.slice(0, 10) || ''} onChange={(event) => set('dueDate', event.target.value)} /></Field><Field label="Workflow status"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={draft.status} onChange={(event) => set('status', event.target.value as FacilityMaintenanceReport['status'])}>{['Open', 'Assigned', 'In progress', 'Closed'].map((item) => <option key={item}>{item}</option>)}</select></Field></div><Field label="Description"><Textarea value={draft.description || ''} onChange={(event) => set('description', event.target.value)} placeholder="Describe the defect, condition, or repair required." /></Field>{draft.status === 'Closed' && <Field label="Verification and close-out"><Textarea value={draft.verificationNotes || ''} onChange={(event) => set('verificationNotes', event.target.value)} placeholder="Record how the repair was verified." /></Field>}<DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={!draft.title.trim()} onClick={() => onSave(draft)}>{draft.status === 'Closed' ? 'Save and close' : 'Save report'}</Button></DialogFooter></DialogContent></Dialog>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5"><Label>{label}</Label>{children}</label>; }
