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
import { FileSpreadsheet, Calculator, Receipt, Landmark, Eye, Printer, X } from 'lucide-react';
import { BillingTable } from './billing-table';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

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

  const previewData = useMemo(() => {
    if (selectedIds.size === 0) return [];
    const selectedBookings = enrichedData.unbilled.filter(b => selectedIds.has(b.id));
    const aircraftMap = new Map(aircrafts?.map(a => [a.id, a]));
    const userMap = new Map(allUsers.map(u => [u.id, u]));

    return selectedBookings.map(b => {
      const ac = aircraftMap.get(b.aircraftId);
      const user = userMap.get(b.studentId || '');
      const duration = (b.postFlightData?.hobbs || 0) - (b.preFlightData?.hobbs || 0);
      const rate = ac?.hourlyRate || 0;
      
      return {
        reference: b.bookingNumber,
        date: b.date,
        customerId: user?.userNumber || "CASH",
        customerName: user ? `${user.firstName} ${user.lastName}` : "CASH_CLIENT",
        description: `Flight: ${ac?.tailNumber || b.aircraftId} (${b.type})`,
        duration: duration.toFixed(1),
        rate: rate.toFixed(2),
        total: (duration * rate).toFixed(2),
        nominalCode: "4000"
      };
    });
  }, [selectedIds, enrichedData.unbilled, aircrafts, allUsers]);

  const handleSageExport = async () => {
    if (selectedIds.size === 0 || !firestore) return;

    try {
      const headers = ["Reference", "Date", "Customer ID", "Customer Name", "Description", "Duration", "Rate", "Total", "Nominal Code"];
      const rows = previewData.map(d => [
        d.reference,
        d.date,
        d.customerId,
        d.customerName,
        d.description,
        d.duration,
        d.rate,
        d.total,
        d.nominalCode
      ].join(","));

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
      const selectedBookings = enrichedData.unbilled.filter(b => selectedIds.has(b.id));
      selectedBookings.forEach(b => {
        const ref = doc(firestore, `tenants/${tenantId}/bookings`, b.id);
        batch.update(ref, { accountingStatus: 'Exported' });
      });
      await batch.commit();

      toast({ title: 'Export Successful', description: `${selectedIds.size} records prepared for Sage.` });
      setSelectedIds(new Set());
      setIsPreviewOpen(false);
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
        <CardHeader className="shrink-0 border-b bg-muted/5 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-4 md:p-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              <CardTitle>Flight Billing</CardTitle>
            </div>
            <CardDescription>Manage revenue and Sage Accounting exports.</CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-8 w-full xl:w-auto justify-between xl:justify-end">
            <div className="text-left xl:text-right min-w-fit">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Pending Revenue</p>
              <div className="flex items-center gap-2 justify-start xl:justify-end">
                <span className="text-xl md:text-2xl font-black text-primary">
                  ${totalBillable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <Badge variant="outline" className="h-5 text-[9px] font-bold">
                  {enrichedData.unbilled.length} FLIGHTS
                </Badge>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10 hidden xl:block" />

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button 
                    variant="outline"
                    className="flex-1 md:flex-none gap-2 font-bold h-10 md:h-12 px-4 md:px-6 text-xs md:text-sm" 
                    onClick={() => setIsPreviewOpen(true)} 
                    disabled={selectedIds.size === 0 || activeTab !== 'unbilled'}
                >
                    <Eye className="h-4 w-4" /> Preview ({selectedIds.size})
                </Button>
                <Button 
                    className="flex-1 md:flex-none gap-2 font-bold shadow-md h-10 md:h-12 px-4 md:px-6 text-xs md:text-sm" 
                    onClick={handleSageExport} 
                    disabled={selectedIds.size === 0 || activeTab !== 'unbilled'}
                >
                    <FileSpreadsheet className="h-4 w-4 md:h-5 md:w-5" /> Export to Sage
                </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden flex flex-col bg-muted/5">
          <Tabs defaultValue="unbilled" onValueChange={setActiveTab} className="w-full flex-1 flex flex-col min-h-0">
            <div className="px-4 md:px-6 py-4 border-b bg-background/50 overflow-x-auto no-scrollbar">
              <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start w-full flex min-w-max">
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
                <div className="p-4 md:p-6 pb-20">
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

      {/* --- Sage Export Preview Dialog --- */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 md:p-6 overflow-hidden">
            <DialogHeader className="shrink-0 flex flex-col md:flex-row items-start md:items-center justify-between border-b pb-4 px-6 pt-6 md:px-0 md:pt-0">
                <div className="space-y-1">
                    <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-primary" />
                        Sage Export Preview
                    </DialogTitle>
                    <DialogDescription className="text-xs">Review the raw data structure generated for Sage Accounting.</DialogDescription>
                </div>
                <div className="flex items-center gap-2 no-print mt-4 md:mt-0">
                    <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs">
                        <Printer className="mr-2 h-4 w-4" /> Print Preview
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsPreviewOpen(false)} className="hidden md:flex">
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </DialogHeader>
            
            <ScrollArea className="flex-1">
                <div className="p-4 md:p-1 overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader className="bg-muted/50 sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="text-[10px] uppercase font-black">Reference</TableHead>
                                <TableHead className="text-[10px] uppercase font-black">Date</TableHead>
                                <TableHead className="text-[10px] uppercase font-black">Cust ID</TableHead>
                                <TableHead className="text-[10px] uppercase font-black">Customer Name</TableHead>
                                <TableHead className="text-[10px] uppercase font-black">Description</TableHead>
                                <TableHead className="text-[10px] uppercase font-black text-right">Hrs</TableHead>
                                <TableHead className="text-[10px] uppercase font-black text-right">Rate</TableHead>
                                <TableHead className="text-[10px] uppercase font-black text-right">Total</TableHead>
                                <TableHead className="text-[10px] uppercase font-black text-center">Nominal</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {previewData.map((row, idx) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-mono text-[11px]">{row.reference}</TableCell>
                                    <TableCell className="text-[11px] whitespace-nowrap">{row.date}</TableCell>
                                    <TableCell className="font-bold text-[11px] text-primary">{row.customerId}</TableCell>
                                    <TableCell className="text-[11px] truncate max-w-[120px]">{row.customerName}</TableCell>
                                    <TableCell className="text-[11px] truncate max-w-[200px]">{row.description}</TableCell>
                                    <TableCell className="text-right font-mono text-[11px]">{row.duration}</TableCell>
                                    <TableCell className="text-right font-mono text-[11px]">{row.rate}</TableCell>
                                    <TableCell className="text-right font-mono text-[11px] font-bold">${row.total}</TableCell>
                                    <TableCell className="text-center font-mono text-[11px] text-muted-foreground">{row.nominalCode}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </ScrollArea>

            <DialogFooter className="shrink-0 border-t p-4 md:p-0 md:pt-4 no-print flex flex-col md:flex-row gap-2">
                <DialogClose asChild><Button variant="outline" className="w-full md:w-auto">Close</Button></DialogClose>
                <Button onClick={handleSageExport} className="gap-2 w-full md:w-auto">
                    <FileSpreadsheet className="h-4 w-4" /> Download CSV & Update Status
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
