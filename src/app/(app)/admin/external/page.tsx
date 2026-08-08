'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, History, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ExternalOrganization } from '@/types/quality';
import type { Booking } from '@/types/booking';
import { ChevronsUpDown } from 'lucide-react';
import { DeleteActionButton, EditActionButton } from '@/components/record-action-buttons';
import { cn } from '@/lib/utils';
import { CARD_HEADER_BAND_CLASS, HEADER_COMPACT_CONTROL_CLASS, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { TenantLayoutDisabledState } from '@/components/tenant-layout-disabled-state';
import { useTenantRouteAccess } from '@/hooks/use-tenant-route-access';
import { CURRENCY_OPTIONS } from '@/lib/currencies';

const EXTERNAL_ORGANIZATIONS_UPDATED_EVENT = 'safeviate-external-organizations-updated';

function formatHistoryDate(value?: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatHistoryAmount(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExternalCompaniesPage() {
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { isLoading: isAccessLoading, isAllowed } = useTenantRouteAccess({ href: '/admin/external' });
  const isMobile = useIsMobile();
  const canManage = hasPermission('admin-external-orgs-manage');

  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<ExternalOrganization | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [rateCurrency, setRateCurrency] = useState('ZAR');
  const [hourlyRate, setHourlyRate] = useState('');
  const [minimumHours, setMinimumHours] = useState('');
  const [positioningRate, setPositioningRate] = useState('');
  const [copyCoherenceMatrix, setCopyCoherenceMatrix] = useState(true);
  const [historyClient, setHistoryClient] = useState<ExternalOrganization | null>(null);
  const [clientHistory, setClientHistory] = useState<Booking[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  if (!isAccessLoading && !isAllowed) {
    return <TenantLayoutDisabledState />;
  }

  const loadOrgs = useCallback(async () => {
    setIsLoadingOrgs(true);
    try {
      const response = await fetch('/api/external-organizations', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({ organizations: [] }));
      setOrganizations(Array.isArray(payload.organizations) ? payload.organizations : []);
    } catch (e) {
        console.error("Failed to load external companies", e);
    } finally {
        setIsLoadingOrgs(false);
    }
  }, []);

  useEffect(() => {
    void loadOrgs();
    window.addEventListener(EXTERNAL_ORGANIZATIONS_UPDATED_EVENT, loadOrgs);
    return () => window.removeEventListener(EXTERNAL_ORGANIZATIONS_UPDATED_EVENT, loadOrgs);
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
      toast({ variant: 'destructive', title: 'Error', description: 'Client name is required.' });
      return;
    }

    try {
        const organization: ExternalOrganization = {
          id: editingOrg?.id || crypto.randomUUID(),
          name,
          clientNumber: editingOrg?.clientNumber,
          contactName,
          contactEmail: email,
          contactPhone: phone,
          address,
          billingAddress,
          taxNumber,
          rateCard: { currency: rateCurrency.trim().toUpperCase() || 'ZAR', hourlyRate: Number(hourlyRate) || 0, minimumHours: Number(minimumHours) || 0, positioningRate: Number(positioningRate) || 0 },
        };
        const response = await fetch(editingOrg ? `/api/external-organizations/${editingOrg.id}` : '/api/external-organizations', {
          method: editingOrg ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ organization, ...(editingOrg ? {} : { copyCoherenceMatrix }) }),
        });
        if (!response.ok) throw new Error('Failed to save organization');
        const result = await response.json().catch(() => ({}));
        window.dispatchEvent(new Event(EXTERNAL_ORGANIZATIONS_UPDATED_EVENT));
        toast({
          title: editingOrg ? 'Client Updated' : 'Client Created',
          description: !editingOrg && Number(result.copiedItemCount) > 0
            ? `${result.copiedItemCount} internal coherence matrix entries were copied for this company.`
            : undefined,
        });
        setIsFormOpen(false);
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to save organization.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!canManage) return;
    try {
        const response = await fetch(`/api/external-organizations/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete organization');
        window.dispatchEvent(new Event(EXTERNAL_ORGANIZATIONS_UPDATED_EVENT));
        toast({ title: 'Client Deleted' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete organization.' });
    }
  };

  const handleOpenHistory = async (org: ExternalOrganization) => {
    setHistoryClient(org);
    setClientHistory([]);
    setIsHistoryOpen(true);
    setIsHistoryLoading(true);

    try {
      const response = await fetch('/api/bookings', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({ bookings: [] }));
      const bookings = Array.isArray(payload.bookings) ? payload.bookings as Booking[] : [];
      const linkedBookings = bookings
        .filter((booking) => (
          booking.organizationId === org.id
          || Boolean(org.clientNumber && booking.commercialDetails?.clientNumber === org.clientNumber)
        ))
        .sort((a, b) => new Date(b.start || b.date).getTime() - new Date(a.start || a.date).getTime());
      setClientHistory(linkedBookings);
    } catch (error) {
      console.error('Failed to load client booking history', error);
      toast({ variant: 'destructive', title: 'History unavailable', description: 'The client booking history could not be loaded.' });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 h-full min-h-0 lg:max-w-[1100px] mx-auto w-full pt-4">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden shadow-none border">
        <CardHeader className={CARD_HEADER_BAND_CLASS}>
          {canManage && (
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={() => handleOpenForm()}
                variant="outline"
                size={isMobile ? 'sm' : 'default'}
                className={cn(
                  HEADER_SECONDARY_BUTTON_CLASS,
                  HEADER_COMPACT_CONTROL_CLASS,
                  'bg-white text-slate-900 border-slate-200 hover:bg-slate-50 hover:text-slate-900',
                  isMobile ? 'w-full justify-between px-3' : 'min-w-[160px] justify-center px-3',
                )}
              >
                <span className="flex items-center gap-2">
                  <PlusCircle className={isMobile ? 'h-3.5 w-3.5' : 'mr-2 h-4 w-4'} />
                  Add Client
                </span>
                {isMobile ? <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" /> : null}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6">
              <div className="-mx-6 border-b border-border bg-muted/30" style={{ borderBottomColor: 'hsl(var(--card-border))' }}>
                <div className="px-6">
                  <Table>
                    <TableHeader className="[&_tr]:border-0">
                      <TableRow>
                        <TableHead>Client Number</TableHead>
                        <TableHead>Client / Company Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Contact Email</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                  </Table>
                </div>
              </div>
              <Table>
                <TableBody>
                  {isLoadingOrgs ? (
                    <TableRow><TableCell colSpan={5} className="text-center p-8">Loading...</TableCell></TableRow>
                  ) : (organizations || []).map(org => (
                    <TableRow key={org.id}>
                      <TableCell className="font-black">{org.clientNumber || 'Pending'}</TableCell>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.contactName || 'N/A'}</TableCell>
                      <TableCell>{org.contactEmail || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => void handleOpenHistory(org)}
                          >
                            <History className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">History</span>
                          </Button>
                          {canManage ? (
                            <EditActionButton onClick={() => handleOpenForm(org)} label="Edit company" />
                          ) : null}
                          {canManage ? (
                            <DeleteActionButton
                              description={`This will permanently delete external company "${org.name}".`}
                              onDelete={() => handleDelete(org.id)}
                              srLabel="Delete company"
                            />
                          ) : null}
                          {!canManage ? (
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Read only</span>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!organizations || organizations.length === 0) && !isLoadingOrgs && (
                    <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No clients found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
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
              <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-800">Client Rate Card</p><p className="mt-1 text-xs text-muted-foreground">Client charges are separate from the aircraft’s internal operating costs.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="rate-currency">Currency</Label><select id="rate-currency" value={rateCurrency} onChange={(e) => setRateCurrency(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium"><option value="">Select currency</option>{CURRENCY_OPTIONS.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} - {currency.name}</option>)}</select></div>
                <div className="space-y-2"><Label htmlFor="hourly-rate">Aircraft hourly rate</Label><Input id="hourly-rate" type="number" min="0" step="0.01" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="minimum-hours">Minimum billable hours</Label><Input id="minimum-hours" type="number" min="0" step="0.1" value={minimumHours} onChange={(e) => setMinimumHours(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="positioning-rate">Positioning rate</Label><Input id="positioning-rate" type="number" min="0" step="0.01" value={positioningRate} onChange={(e) => setPositioningRate(e.target.value)} /></div>
              </div>
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

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Client Booking History</DialogTitle>
            <DialogDescription>
              {historyClient?.clientNumber ? `${historyClient.clientNumber} · ` : ''}{historyClient?.name || 'Client'} — linked bookings, quote references, invoices, and flight records.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Linked Bookings</p>
              <p className="mt-1 text-lg font-black">{isHistoryLoading ? '…' : clientHistory.length}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Completed</p>
              <p className="mt-1 text-lg font-black">{isHistoryLoading ? '…' : clientHistory.filter((booking) => booking.status === 'Completed').length}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Recorded Value</p>
              <p className="mt-1 text-lg font-black">{isHistoryLoading ? '…' : formatHistoryAmount(clientHistory.reduce((sum, booking) => sum + (booking.totalCost || 0), 0))}</p>
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1 pr-3">
            {isHistoryLoading ? (
              <div className="grid gap-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : clientHistory.length === 0 ? (
              <div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No bookings are currently linked to this client.
              </div>
            ) : (
              <div className="grid gap-3">
                {clientHistory.map((booking) => (
                  <div key={booking.id} className="rounded-lg border bg-background p-3 shadow-none">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-black">{booking.bookingNumber}</p>
                        <p className="text-xs text-muted-foreground">{booking.type} · {formatHistoryDate(booking.start || booking.date)}</p>
                      </div>
                      <span className="rounded-full border bg-muted/30 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">{booking.status}</span>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                      <div><span className="font-bold text-muted-foreground">Mission</span><p>{booking.commercialDetails?.missionNumber || '—'}</p></div>
                      <div><span className="font-bold text-muted-foreground">Quote</span><p>{booking.commercialDetails?.quoteReference || '—'}</p></div>
                      <div><span className="font-bold text-muted-foreground">Invoice</span><p>{booking.invoiceReference || booking.accountingStatus || '—'}</p></div>
                      <div><span className="font-bold text-muted-foreground">Recorded Value</span><p>{formatHistoryAmount(booking.totalCost)}</p></div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <Button asChild variant="outline" size="sm" className="gap-1.5">
                        <a href={`/bookings/history/${booking.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                          View Booking
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
