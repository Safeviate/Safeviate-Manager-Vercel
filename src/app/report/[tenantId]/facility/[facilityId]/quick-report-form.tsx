'use client';

import { FormEvent, useState } from 'react';
import { Building2, CheckCircle2, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = { tenantId: string; tenantName: string; facilityId: string; facilityName: string };

export function FacilityQuickReportForm({ tenantId, tenantName, facilityId, facilityName }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General facility');
  const [priority, setPriority] = useState('Medium');
  const [operationalImpact, setOperationalImpact] = useState('Serviceable');
  const [reportedBy, setReportedBy] = useState('');
  const [reportedByEmail, setReportedByEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true); setError('');
    try {
      const response = await fetch('/api/public/facility-maintenance-reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report: { tenantId, facilityId, title, description, category, priority, operationalImpact, reportedBy, reportedByEmail } }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Could not submit the report.');
      setSubmitted(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not submit the report.'); } finally { setSubmitting(false); }
  };

  if (submitted) return <main className="mx-auto flex min-h-screen w-full max-w-xl items-center p-4"><Card className="w-full overflow-hidden border shadow-none"><CardHeader className="border-b bg-muted/5 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-primary" /><CardTitle className="mt-3">Report submitted</CardTitle><CardDescription>Thank you. The facility team can now assess and assign this issue.</CardDescription></CardHeader><CardContent className="p-5 text-center"><p className="text-sm text-muted-foreground">You may close this page.</p></CardContent></Card></main>;
  return <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center p-4"><form onSubmit={submit} className="w-full"><Card className="overflow-hidden border shadow-none"><CardHeader className="border-b bg-muted/5"><div className="flex items-start gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full border"><Building2 className="h-5 w-5 text-primary" /></div><div><CardTitle>Facility maintenance report</CardTitle><CardDescription>{tenantName} · {facilityName}</CardDescription></div></div></CardHeader><CardContent className="space-y-4 p-5"><p className="rounded border border-dashed p-3 text-sm text-muted-foreground"><Wrench className="mr-2 inline h-4 w-4" />Use this QR form to report a facility defect or maintenance need. For an immediate operational danger, follow the local emergency procedure first.</p>{error && <p className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><Field label="Your name (optional)"><Input value={reportedBy} onChange={(event) => setReportedBy(event.target.value)} /></Field><Field label="Email (optional)"><Input type="email" value={reportedByEmail} onChange={(event) => setReportedByEmail(event.target.value)} /></Field></div><Field label="Issue title"><Input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs attention?" /></Field><div className="grid gap-4 sm:grid-cols-3"><Field label="Category"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={category} onChange={(event) => setCategory(event.target.value)}>{['General facility', 'Lighting and markings', 'Pavement and surface', 'Fuel and rescue equipment', 'Security and fencing', 'Drainage and utilities', 'Diagram or signage'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Priority"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={priority} onChange={(event) => setPriority(event.target.value)}>{['Low', 'Medium', 'High', 'Critical'].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Operational impact"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={operationalImpact} onChange={(event) => setOperationalImpact(event.target.value)}>{['Serviceable', 'Restricted', 'Out of service'].map((item) => <option key={item}>{item}</option>)}</select></Field></div><Field label="Description"><Textarea required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the defect, its location, and any immediate action taken." /></Field><Button className="w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit maintenance report'}</Button></CardContent></Card></form></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5"><Label>{label}</Label>{children}</label>; }
