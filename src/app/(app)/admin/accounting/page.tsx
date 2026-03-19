'use client';

import { useState, useMemo } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, Calculator, Receipt } from 'lucide-react';
import { BillingTable } from './billing-table';
import { format } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { Personnel, PilotProfile } from '@/app/(app)/users/personnel/page';

export default function AccountingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  // --- Data Fetching: SIMPLE QUERIES ONLY to avoid security/index errors ---
  const bookingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/bookings`) : null), [firestore, tenantId]);
  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/instructors`) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/students`) : null), [firestore, tenantId]);

  const { data: bookings, isLoading: loadingB } = useCollection<Booking>(bookingsQuery);
  const { data: aircrafts, isLoading: loadingA } = useCollection<Aircraft>(aircraftQuery);
  const { data: personnel } = useCollection<Personnel>(personnelQuery);
  const { data: instructors } = useCollection<PilotProfile>(instructorsQuery);
  const { data: students } = useCollection<PilotProfile>(studentsQuery);

  const allUsers = useMemo(() => [
    ...(personnel || []),
    ...(instructors || []),
    ...(students || [])
  ], [personnel, instructors, students]);

  // --- State ---
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('unbilled');

  // --- Client-Side Processing: Avoids Firestore 'where' and 'orderBy' complexities ---
  const enrichedData = useMemo(() => {
    if (!bookings) return { unbilled: [], exported: [] };

    // 1. Filter for completed flights with tech logs
    const completed = bookings.filter(b => b.status === 'Completed' && b.postFlightData && b.preFlightData);

    // 2. Sort by date (latest first)
    const sorted = [...completed].sort((a, b) => b.date.localeCompare(a.date));

    return {
      unbilled: sorted.filter(b => !b.accountingStatus || b.accountingStatus === 'Unbilled'),
      exported: sorted.filter(b => b.accountingStatus === 'Exported' || b.accountingStatus === 'Paid')
    };
  }, [bookings]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedIds(newSelected);
  };

  const toggleAll = (ids: string[]) => {
    if (selectedIds.size === ids.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(ids));
  };

  const handleSageExport = async () => {
    if (selectedIds.size === 0 || !firestore) return;

    try {
      const selectedBookings = enrichedData.unbilled.filter(b => selectedIds.has(b.id));
      const aircraftMap = new Map(aircrafts?.map(a => [a.id, a]));
      const userMap = new Map(allUsers.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

      // 1. Prepare Sage CSV Data
      const headers = ["Reference", "Date", "Customer", "Description", "Duration", "Rate", "Total", "Nominal Code"];
      const rows = selectedBookings.map(b => {
        const ac = aircraftMap.get(b.aircraftId);
        const duration = (b.postFlightData?.hobbs || 0) - (b.preFlightData?.hobbs || 0);
        const rate = ac?.hourlyRate || 0;
        return [
          b.bookingNumber,
          b.date,
          userMap.get(b.studentId || '') || "CASH_CLIENT",
          `Flight: ${ac?.tailNumber || b.aircraftId} (${b.type})`,
          duration.toFixed(1),
          rate.toFixed(2),
          (duration * rate).toFixed(2),
          "4000" // Default Sales nominal code
        ].join(",");
      });

      const csvContent = [headers.join(","), ...rows].join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `sage_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Update Firestore Status
      const batch = writeBatch(firestore);
      selectedBookings.forEach(b => {
        const ref = doc(firestore, `tenants/${tenantId}/bookings`, b.id);
        batch.update(ref, { accountingStatus: 'Exported' });
      });
      await batch.commit();

      toast({ title: 'Export Successful', description: `${selectedIds.size} records prepared for Sage.` });
      setSelectedIds(new Set());
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: e.message });
    }
  };

  const totalBillable = useMemo(() => {
    return enrichedData.unbilled.reduce((sum, b) => {
      const ac = aircrafts?.find(a => a.id === b.aircraftId);
      const duration = (b.postFlightData?.hobbs || 0) - (b.preFlightData?.hobbs || 0);
      return sum + (duration * (ac?.hourlyRate || 0));
    }, 0);
  }, [enrichedData.unbilled, aircrafts]);

  if (loadingB || loadingA) return <div className="p-8 space-y-6"><Skeleton className="h-10 w-48" /><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full pb-10">
      <div className="px-1 shrink-0">
        <h1 className="text-3xl font-bold tracking-tight text-foreground font-headline">Flight Billing</h1>
        <p className="text-muted-foreground">Manage revenue from completed flights and export to Sage Accounting.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-1">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Billing</CardTitle>
            <Calculator className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBillable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">{enrichedData.unbilled.length} flights waiting for export</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export History</CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrichedData.exported.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Flights successfully synced</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Batch Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full gap-2" 
              onClick={handleSageExport} 
              disabled={selectedIds.size === 0 || activeTab !== 'unbilled'}
            >
              <FileSpreadsheet className="h-4 w-4" /> Export to Sage ({selectedIds.size})
            </Button>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="unbilled" onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
        <div className="px-1 shrink-0">
          <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
            <TabsTrigger value="unbilled" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Unbilled Flights ({enrichedData.unbilled.length})</TabsTrigger>
            <TabsTrigger value="exported" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Export History ({enrichedData.exported.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="unbilled" className="mt-0 flex-1 min-h-0 overflow-hidden">
          <BillingTable 
            bookings={enrichedData.unbilled} 
            aircrafts={aircrafts || []} 
            personnel={allUsers}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
            onToggleAll={toggleAll}
          />
        </TabsContent>

        <TabsContent value="exported" className="mt-0 flex-1 min-h-0 overflow-hidden">
          <BillingTable 
            bookings={enrichedData.exported} 
            aircrafts={aircrafts || []} 
            personnel={allUsers}
            selectedIds={new Set()}
            onToggleSelection={() => {}}
            onToggleAll={() => {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}