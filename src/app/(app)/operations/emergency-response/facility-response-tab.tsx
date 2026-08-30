'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Save, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { usePermissions } from '@/hooks/use-permissions';
import { useToast } from '@/hooks/use-toast';

type Facility = { id: string; name: string; type: string; code?: string };
type FacilityResponseProfile = { facilityId: string; emergencyCoordinator?: string; controlPoint?: string; assemblyPoint?: string; hospital?: string; rescueCoordination?: string; notes?: string; updatedAt?: string };

export function FacilityResponseTab() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [profiles, setProfiles] = useState<FacilityResponseProfile[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [saving, setSaving] = useState(false);
  const canManage = hasPermission('operations-erp-admin');

  useEffect(() => { void (async () => { const [facilitiesResponse, profilesResponse] = await Promise.all([fetch('/api/facilities', { cache: 'no-store' }), fetch('/api/erp-state?category=facility-profiles', { cache: 'no-store' })]); const [facilitiesPayload, profilesPayload] = await Promise.all([facilitiesResponse.json(), profilesResponse.json()]); const nextFacilities = Array.isArray(facilitiesPayload.facilities) ? facilitiesPayload.facilities : []; setFacilities(nextFacilities); setSelectedId(nextFacilities[0]?.id || ''); setProfiles(Array.isArray(profilesPayload.data) ? profilesPayload.data : []); })(); }, []);
  const facility = facilities.find((item) => item.id === selectedId);
  const profile = useMemo(() => profiles.find((item) => item.facilityId === selectedId) || { facilityId: selectedId }, [profiles, selectedId]);
  const [draft, setDraft] = useState<FacilityResponseProfile>({ facilityId: '' });
  useEffect(() => setDraft(profile), [profile]);
  const set = (key: keyof FacilityResponseProfile, value: string) => setDraft((current) => ({ ...current, facilityId: selectedId, [key]: value }));
  const save = async () => { if (!selectedId || !canManage) return; setSaving(true); try { const saved = { ...draft, facilityId: selectedId, updatedAt: new Date().toISOString() }; const next = profiles.some((item) => item.facilityId === selectedId) ? profiles.map((item) => item.facilityId === selectedId ? saved : item) : [...profiles, saved]; const response = await fetch('/api/erp-state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: 'facility-profiles', data: next }) }); if (!response.ok) throw new Error(); setProfiles(next); toast({ title: 'Facility ERP profile saved', description: facility?.name }); } catch { toast({ variant: 'destructive', title: 'Save failed', description: 'Could not save the facility ERP profile.' }); } finally { setSaving(false); } };

  if (!facilities.length) return <div className="p-6"><p className="rounded border border-dashed p-4 text-sm text-muted-foreground">Add an airport, heliport, or base in Facilities before creating a facility ERP profile.</p></div>;
  return <div className="space-y-4 p-4"><Card className="overflow-hidden border shadow-none"><div className="flex flex-col gap-3 border-b bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /><h2 className="font-semibold">Facility emergency profiles</h2></div><p className="mt-1 text-sm text-muted-foreground">Store the local command, assembly, medical, and rescue-coordination details used during ERP activation.</p></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}</select></div><CardContent className="space-y-4 p-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Emergency coordinator"><Input disabled={!canManage} value={draft.emergencyCoordinator || ''} onChange={(event) => set('emergencyCoordinator', event.target.value)} placeholder="Name or role" /></Field><Field label="Emergency control point"><Input disabled={!canManage} value={draft.controlPoint || ''} onChange={(event) => set('controlPoint', event.target.value)} placeholder="Operations room, office, or radio point" /></Field><Field label="Assembly point"><Input disabled={!canManage} value={draft.assemblyPoint || ''} onChange={(event) => set('assemblyPoint', event.target.value)} placeholder="Muster point or access gate" /></Field><Field label="Nearest hospital / medical support"><Input disabled={!canManage} value={draft.hospital || ''} onChange={(event) => set('hospital', event.target.value)} placeholder="Hospital, ambulance, or clinic" /></Field><Field label="Rescue coordination"><Input disabled={!canManage} value={draft.rescueCoordination || ''} onChange={(event) => set('rescueCoordination', event.target.value)} placeholder="RCC, fire service, water rescue, or mutual aid" /></Field></div><Field label="Facility-specific response notes"><Textarea disabled={!canManage} value={draft.notes || ''} onChange={(event) => set('notes', event.target.value)} placeholder="Access routes, water-rescue arrangements, shut-off points, or recovery instructions." /></Field><div className="flex flex-col gap-2 rounded border border-amber-300 bg-amber-50/60 p-3 text-sm text-amber-950 sm:flex-row sm:items-center"><ShieldAlert className="h-5 w-5 shrink-0" /><span>These are operational prompts; keep official contacts, controlled plans, and diagrams current in the ERP contacts and documents sections.</span></div>{canManage && <div className="flex justify-end"><Button disabled={saving} onClick={() => void save()}><Save className="mr-1 h-4 w-4" />{saving ? 'Saving…' : 'Save profile'}</Button></div>}</CardContent></Card></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5"><Label>{label}</Label>{children}</label>; }
