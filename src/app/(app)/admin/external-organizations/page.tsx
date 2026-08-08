'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronsUpDown } from 'lucide-react';
import { PAGE_FORMAT_MOBILE_DARK_BUTTON_CLASS } from '@/lib/page-format-buttons';
import type { ExternalOrganization, ExternalOrganizationRole } from '@/types/quality';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ResponsiveCardGrid } from '@/components/responsive-card-grid';
import { Skeleton } from '@/components/ui/skeleton';

export default function ExternalOrganizationsPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  
  const canManage = hasPermission('admin-external-orgs-manage');

  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExternalOrganization | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [roles, setRoles] = useState<ExternalOrganizationRole[]>(['Client']);
  const [auditRequired, setAuditRequired] = useState(false);
  const [rateCurrency, setRateCurrency] = useState('ZAR');
  const [hourlyRate, setHourlyRate] = useState('');
  const [minimumHours, setMinimumHours] = useState('');
  const [positioningRate, setPositioningRate] = useState('');
  const [copyCoherenceMatrix, setCopyCoherenceMatrix] = useState(true);

  const loadOrgs = useCallback(async () => {
    setIsLoading(true);
    try {
        const response = await fetch('/api/external-organizations', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({ organizations: [] }));
        setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
    } catch (e) {
        console.error('Failed to load external companies', e);
        setOrganizations([]);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrgs();
    window.addEventListener('safeviate-external-organizations-updated', loadOrgs);
    return () => window.removeEventListener('safeviate-external-organizations-updated', loadOrgs);
  }, [loadOrgs]);

  const handleOpenForm = (org: ExternalOrganization | null = null) => {
    if (!canManage) return;
    setEditingOrg(org);
    setName(org?.name || '');
    setContactName(org?.contactName || '');
    setEmail(org?.contactEmail || '');
    setPhone(org?.contactPhone || '');
    setAddress(org?.address || '');
    setBillingAddress(org?.billingAddress || '');
    setTaxNumber(org?.taxNumber || '');
    setRoles(org?.roles?.length ? org.roles : ['Client']);
    setAuditRequired(org?.auditRequired === true);
    setRateCurrency(org?.rateCard?.currency || 'ZAR');
    setHourlyRate(org?.rateCard?.hourlyRate != null ? String(org.rateCard.hourlyRate) : '');
    setMinimumHours(org?.rateCard?.minimumHours != null ? String(org.rateCard.minimumHours) : '');
    setPositioningRate(org?.rateCard?.positioningRate != null ? String(org.rateCard.positioningRate) : '');
    setCopyCoherenceMatrix(!org);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!canManage) return;
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Organization name is required.' });
      return;
    }
    if (roles.length === 0) {
      toast({ variant: 'destructive', title: 'Role Required', description: 'Select Client, External Supplier, or both.' });
      return;
    }

    try {
        const payload = {
          organization: { ...(editingOrg || {}), name, roles, auditRequired, contactName, contactEmail: email, contactPhone: phone, address, billingAddress, taxNumber, rateCard: { currency: rateCurrency.trim().toUpperCase() || 'ZAR', hourlyRate: Number(hourlyRate) || 0, minimumHours: Number(minimumHours) || 0, positioningRate: Number(positioningRate) || 0 } },
          ...(editingOrg ? {} : { copyCoherenceMatrix }),
        };
        const response = await fetch(editingOrg ? `/api/external-organizations/${editingOrg.id}` : '/api/external-organizations', {
          method: editingOrg ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to save organization.');
        window.dispatchEvent(new Event('safeviate-external-organizations-updated'));
        toast({
          title: editingOrg ? 'Company Updated' : 'Company Created',
          description: !editingOrg && Number(result.copiedItemCount) > 0
            ? `${result.copiedItemCount} internal coherence matrix entries were copied for this company.`
            : undefined,
        });
        setIsFormOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save company.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    try {
        const response = await fetch(`/api/external-organizations/${id}`, { method: 'DELETE' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Failed to delete organization.');
        window.dispatchEvent(new Event('safeviate-external-organizations-updated'));
        toast({ title: 'Company Deleted' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete organization.' });
    }
  };

  const renderOrgCard = (org: ExternalOrganization) => (
    <Card key={org.id} className="group overflow-hidden border shadow-none transition-shadow hover:shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 border-b bg-muted/20 px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-black uppercase tracking-[-0.01em] text-foreground">{org.name}</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {org.clientNumber || 'Client number pending'}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {(org.roles?.length ? org.roles : ['Client']).map((role) => (
              <span key={role} className="rounded-full border bg-background px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-muted-foreground">{role}</span>
            ))}
            {org.auditRequired ? <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-800">Audit</span> : null}
          </div>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border bg-background text-[10px] font-black uppercase text-muted-foreground">
          Org
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border bg-background px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Client Number</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{org.clientNumber || 'Pending assignment'}</p>
          </div>
          <div className="rounded-2xl border bg-background px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Contact Person</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{org.contactName || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border bg-background px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Contact Email</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{org.contactEmail || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border bg-background px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Contact Phone</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{org.contactPhone || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border bg-background px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Address</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{org.address || 'N/A'}</p>
          </div>
          <div className="rounded-2xl border bg-background px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Tax / VAT Number</p>
            <p className="mt-1 break-words text-sm font-semibold text-foreground">{org.taxNumber || 'N/A'}</p>
          </div>
          </div>
        {org.billingSummary ? (
          <div className="rounded-2xl border bg-muted/20 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Commercial Billing</p>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div><p className="text-[10px] text-muted-foreground">Bookings</p><p className="text-sm font-black">{org.billingSummary.bookingCount}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Quoted</p><p className="text-sm font-black">{org.billingSummary.currency} {org.billingSummary.quotedTotal.toFixed(2)}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Billed</p><p className="text-sm font-black">{org.billingSummary.currency} {org.billingSummary.billedTotal.toFixed(2)}</p></div>
              <div><p className="text-[10px] text-muted-foreground">Outstanding</p><p className="text-sm font-black">{org.billingSummary.currency} {org.billingSummary.outstandingTotal.toFixed(2)}</p></div>
            </div>
          </div>
        ) : null}
        {org.rateCard?.hourlyRate ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50/40 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-800">Active Client Rate Card</p>
            <p className="mt-1 text-sm font-black">{org.rateCard.currency} {org.rateCard.hourlyRate.toFixed(2)} / hour</p>
            <p className="text-xs text-muted-foreground">Minimum {org.rateCard.minimumHours || 0} hours{org.rateCard.positioningRate ? ` · Positioning ${org.rateCard.currency} ${org.rateCard.positioningRate.toFixed(2)}` : ''}</p>
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <EditActionButton onClick={() => handleOpenForm(org)} label="Edit company" />
            <DeleteActionButton
              description={`This will permanently delete external company "${org.name}".`}
              onDelete={() => handleDelete(org.id)}
              srLabel="Delete company"
            />
          </div>
        ) : (
          <div className="flex justify-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Read only</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 h-full p-6">
      <Card className="shadow-none border overflow-hidden">
        {canManage && (
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border bg-muted/5 px-4 py-3" style={{ borderBottomColor: 'hsl(var(--card-border))' }}>
            <Button
              onClick={() => handleOpenForm()}
              variant={isMobile ? 'outline' : 'default'}
              size={isMobile ? 'sm' : 'default'}
              className={isMobile ? PAGE_FORMAT_MOBILE_DARK_BUTTON_CLASS : 'font-black uppercase text-[10px] h-9 tracking-tight'}
            >
              <span className="flex items-center gap-2">
                <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} /> Add Client
              </span>
              {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
            </Button>
          </div>
        )}
        <CardContent className="p-0">
          <ResponsiveCardGrid
            items={organizations}
            isLoading={isLoading}
            loadingCount={3}
            className="p-4"
            gridClassName="sm:grid-cols-2 xl:grid-cols-3"
            renderItem={(org) => renderOrgCard(org)}
            renderLoadingItem={(index) => <Skeleton key={index} className="h-48 w-full rounded-2xl" />}
            emptyState={(
              <div className="p-4">
                <Card className="border-dashed shadow-none">
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                    <p className="text-lg font-semibold text-foreground">No external companies found.</p>
                    <p className="text-sm text-foreground/80">Add a company record to begin tracking partners and contacts.</p>
                  </CardContent>
                </Card>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOrg ? 'Edit' : 'Add'} Client</DialogTitle>
            <DialogDescription>Maintain the client profile used by commercial bookings and accounting.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Client / Company Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {editingOrg?.clientNumber ? (
              <div className="rounded-lg border bg-muted/20 px-3 py-2">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Assigned Client Number</p>
                <p className="mt-1 text-sm font-black text-foreground">{editingOrg.clientNumber}</p>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact-name">Contact Person</Label>
                <Input id="contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-number">Tax / VAT Number</Label>
                <Input id="tax-number" value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              </div>
          </div>
          <div className="space-y-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-800">Client Rate Card</p><p className="mt-1 text-xs text-muted-foreground">These are client charges. Aircraft operating costs remain internal.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="rate-currency">Currency</Label><Input id="rate-currency" maxLength={8} value={rateCurrency} onChange={(e) => setRateCurrency(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="hourly-rate">Aircraft hourly rate</Label><Input id="hourly-rate" type="number" min="0" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="minimum-hours">Minimum billable hours</Label><Input id="minimum-hours" type="number" min="0" step="0.1" value={minimumHours} onChange={(e) => setMinimumHours(e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="positioning-rate">Positioning rate</Label><Input id="positioning-rate" type="number" min="0" step="0.01" value={positioningRate} onChange={(e) => setPositioningRate(e.target.value)} /></div>
            </div>
          </div>
          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-foreground">Organisation Roles</p>
              <p className="mt-1 text-xs text-muted-foreground">Select every role that applies. An organisation may be both a client and a supplier.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['Client', 'External Supplier'] as const).map((role) => (
                <label key={role} htmlFor={`organization-role-${role.toLowerCase().replace(' ', '-')}`} className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium">
                  <Checkbox
                    id={`organization-role-${role.toLowerCase().replace(' ', '-')}`}
                    checked={roles.includes(role)}
                    onCheckedChange={(checked) => setRoles((current) => checked ? Array.from(new Set([...current, role])) : current.filter((item) => item !== role))}
                  />
                  {role}
                </label>
              ))}
            </div>
            <label htmlFor="audit-required" className="flex items-start gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium">
              <Checkbox id="audit-required" checked={auditRequired} onCheckedChange={(checked) => setAuditRequired(checked === true)} />
              <span><span className="block">Subject to audit</span><span className="block text-xs font-normal text-muted-foreground">Include this organisation in audit and compliance workflows.</span></span>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="address">Physical Address</Label>
                <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billing-address">Billing Address</Label>
                <Input id="billing-address" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} />
              </div>
            </div>
            {!editingOrg && (
              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
                <Checkbox
                  id="copy-coherence-matrix"
                  checked={copyCoherenceMatrix}
                  onCheckedChange={(checked) => setCopyCoherenceMatrix(checked === true)}
                />
                <div className="space-y-1">
                  <Label htmlFor="copy-coherence-matrix">Copy internal coherence matrix</Label>
                  <p className="text-xs text-muted-foreground">
                    Creates an independent copy for this company. Later changes do not affect the internal matrix.
                  </p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave}>Save Client</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
