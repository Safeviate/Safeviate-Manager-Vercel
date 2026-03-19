'use client';

import { useState, useMemo } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileSpreadsheet, Calculator, Receipt, Landmark } from 'lucide-react';
import { BillingTable } from './billing-table';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
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

  // --- Client-Side Processing ---
  const enrichedData = useMemo(() => {
    if (!bookings) return { unbilled: [], exported: [] };

    // Filter for completed flights with tech logs
    const completed = bookings.filter(b => b.status === 'Completed' && b.postFlightData && b.preFlightData);

    // Sort by date (latest first)
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
          "4000"
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
    <div className="flex flex-col h-full overflow-hidden gap-4">
      <Card className="flex flex-col h-full overflow-hidden shadow-none border">
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle>Flight Billing</CardTitle>
            </div>
            <CardDescription>Manage revenue and Sage Accounting exports.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending Revenue</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-primary">
                  ${totalBillable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Badge variant="outline" className="h-5 text-[9px] font-bold">
                  {enrichedData.unbilled.length} FLIGHTS
                </Badge>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 hidden md:block" />

            <div className="text-right hidden lg:block">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Synced History</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-green-600">
                  {enrichedData.exported.length}
                </span>
                <Badge variant="outline" className="h-5 text-[9px] font-bold uppercase">Records</Badge>
              </div>
            </div>

            <Button 
              size="lg"
              className="gap-2 font-bold shadow-md h-12 px-6" 
              onClick={handleSageExport} 
              disabled={selectedIds.size === 0 || activeTab !== 'unbilled'}
            >
              <FileSpreadsheet className="h-5 w-5" /> Export to Sage ({selectedIds.size})
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-muted/5">
          <Tabs defaultValue="unbilled" onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <div className="px-6 py-4 border-b bg-background/50">
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                <TabsTrigger value="unbilled" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-xs font-bold uppercase tracking-tight">
                  Unbilled Flights ({enrichedData.unbilled.length})
                </TabsTrigger>
                <TabsTrigger value="exported" className="rounded-full px-6 py-1.5 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0 text-xs font-bold uppercase tracking-tight">
                  Export History ({enrichedData.exported.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 min-h-0 overflow-hidden relative">
              <ScrollArea className="h-full">
                <div className="p-6 pb-20">
                  <TabsContent value="unbilled" className="mt-0">
                    <BillingTable 
                      bookings={enrichedData.unbilled} 
                      aircrafts={aircrafts || []} 
                      personnel={allUsers}
                      selectedIds={selectedIds}
                      onToggleSelection={toggleSelection}
                      onToggleAll={toggleAll}
                    />
                  </TabsContent>

                  <TabsContent value="exported" className="mt-0">
                    <BillingTable 
                      bookings={enrichedData.exported} 
                      aircrafts={aircrafts || []} 
                      personnel={allUsers}
                      selectedIds={new Set()}
                      onToggleSelection={() => {}}
                      onToggleAll={() => {}}
                    />
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
