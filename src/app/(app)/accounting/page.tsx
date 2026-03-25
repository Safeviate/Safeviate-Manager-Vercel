'use client';

import { useState, useMemo } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { MainPageHeader } from "@/components/page-header";
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, Calculator, Receipt } from 'lucide-react';
import { BillingTable } from './billing-table';
import { format } from 'date-fns';
import type { Booking } from '@/types/booking';
import type { Aircraft } from '@/types/aircraft';
import type { Personnel, PilotProfile } from '../users/personnel/page';

export default function AccountingPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const tenantId = 'safeviate';

  // --- Data Fetching: SIMPLE QUERIES ONLY to avoid security/index errors ---
  const bookingsQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/bookings`) : null), [firestore, tenantId]);
  const aircraftQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/aircrafts`) : null), [firestore, tenantId]);
  const personnelQuery = useMemoFirebase(() => (firestore ? collection(firestore, `tenants/${tenantId}/personnel`) : null), [firestore, tenantId]);
  const instructorsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/instructors`)) : null), [firestore, tenantId]);
  const studentsQuery = useMemoFirebase(() => (firestore ? query(collection(firestore, `tenants/${tenantId}/students`)) : null), [firestore, tenantId]);

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

  if (loadingB || loadingA) return <div className="p-8 space-y-6 px-1"><Skeleton className="h-14 w-full" /><Skeleton className="h-[400px] w-full" /></div>;

  return (
    <div className="max-w-[1350px] mx-auto w-full flex flex-col gap-6 h-full px-1 overflow-hidden">
      <Card className="flex-grow flex flex-col shadow-none border overflow-hidden">
        <Tabs defaultValue="unbilled" onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
          <MainPageHeader 
            title="Flight Billing"
            actions={
              <Button 
                size="sm"
                className="h-9 px-6 text-[10px] font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2 shrink-0" 
                onClick={handleSageExport} 
                disabled={selectedIds.size === 0 || activeTab !== 'unbilled'}
              >
                <FileSpreadsheet className="h-4 w-4" /> Export to Sage ({selectedIds.size})
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 border-b bg-muted/5 shrink-0">
            <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Pending Billing</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">${totalBillable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">{enrichedData.unbilled.length} FLIGHTS</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-background p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                <Receipt className="h-5 w-5 text-green-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Sync History</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-foreground">{enrichedData.exported.length}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">SUCCESSFUL</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b bg-muted/5 px-6 py-3 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex w-max gap-2 pr-6 flex-nowrap">
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start flex w-max pr-6 flex-nowrap">
                <TabsTrigger value="unbilled" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all">
                  Unbilled Flights ({enrichedData.unbilled.length})
                </TabsTrigger>
                <TabsTrigger value="exported" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-[10px] font-black uppercase transition-all">
                  Export History ({enrichedData.exported.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <CardContent className="flex-1 p-0 overflow-hidden">
            <TabsContent value="unbilled" className="m-0 h-full overflow-auto">
              <BillingTable 
                bookings={enrichedData.unbilled} 
                aircrafts={aircrafts || []} 
                personnel={allUsers}
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
                onToggleAll={toggleAll}
              />
            </TabsContent>

            <TabsContent value="exported" className="m-0 h-full overflow-auto">
              <BillingTable 
                bookings={enrichedData.exported} 
                aircrafts={aircrafts || []} 
                personnel={allUsers}
                selectedIds={new Set()}
                onToggleSelection={() => {}}
                onToggleAll={() => {}}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}
