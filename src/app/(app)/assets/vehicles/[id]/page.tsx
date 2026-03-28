'use client';

import { use, useState } from 'react';
import { arrayUnion, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Car, Eye, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { useDoc, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { DocumentUploader } from '@/components/document-uploader';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveTabRow } from '@/components/responsive-tab-row';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { DocumentExpirySettings } from '@/app/(app)/admin/document-dates/page';
import { getDocumentExpiryBadgeStyle } from '@/lib/document-expiry';
import { cn } from '@/lib/utils';
import type { Vehicle, VehicleDocument } from '@/types/vehicle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface VehicleDetailPageProps {
  params: Promise<{ id: string }>;
}

const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  registrationNumber: z.string().min(1),
  type: z.enum(['Car', 'Truck', 'Van', 'Bus', 'Utility', 'Other']),
  vin: z.string().optional(),
  currentOdometer: z.coerce.number().min(0),
  nextServiceDueDate: z.string().optional(),
  nextServiceDueOdometer: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
});

export default function VehicleDetailPage({ params }: VehicleDetailPageProps) {
  const resolvedParams = use(params);
  const firestore = useFirestore();
  const isMobile = useIsMobile();
  const { tenantId } = useUserProfile();
  const [activeTab, setActiveTab] = useState('overview');
  const vehicleId = resolvedParams.id;

  const vehicleRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'vehicles', vehicleId) : null),
    [firestore, tenantId, vehicleId]
  );
  const expirySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, 'tenants', tenantId, 'settings', 'document-expiry') : null),
    [firestore, tenantId]
  );

  const { data: vehicle, isLoading } = useDoc<Vehicle>(vehicleRef);
  const { data: expirySettings } = useDoc<DocumentExpirySettings>(expirySettingsRef);

  if (isLoading) {
    return (
      <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="max-w-[1400px] mx-auto w-full text-center py-20">
        <p className="text-muted-foreground">Vehicle not found.</p>
      </div>
    );
  }

  return (
    <div className={cn('max-w-[1400px] mx-auto w-full flex flex-col pt-2', isMobile ? 'min-h-0 overflow-y-auto' : 'h-full overflow-hidden')}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className={cn('w-full flex-1 flex flex-col', isMobile ? 'overflow-visible' : 'overflow-hidden')}>
        <div className={cn('flex-1 px-1 pb-10', isMobile ? 'overflow-visible' : 'overflow-y-auto no-scrollbar')}>
          <Card className="shadow-none border rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2 font-black">
                  <Car className="h-6 w-6 text-primary" />
                  {vehicle.registrationNumber}
                </CardTitle>
                <CardDescription className="text-sm font-medium">{vehicle.make} {vehicle.model}</CardDescription>
              </div>
              <EditVehicleDialog vehicle={vehicle} tenantId={tenantId || ''} />
            </CardHeader>

            <div className="border-b bg-muted/5 px-6 py-2 shrink-0 overflow-hidden">
              {isMobile ? (
                <ResponsiveTabRow
                  value={activeTab}
                  onValueChange={setActiveTab}
                  placeholder="Select Section"
                  className="shrink-0"
                  options={[
                    { value: 'overview', label: 'Overview' },
                    { value: 'documents', label: 'Documents' },
                  ]}
                />
              ) : (
                <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                  <TabsTrigger value="overview" className="rounded-sm px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground font-bold text-[10px] uppercase transition-all shrink-0">Overview</TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-sm px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground font-bold text-[10px] uppercase transition-all shrink-0">Documents</TabsTrigger>
                </TabsList>
              )}
            </div>

            <div className="flex-1 min-h-0">
              <TabsContent value="overview" className={cn('mt-0 outline-none', isMobile ? 'min-h-0' : 'h-full overflow-y-auto no-scrollbar')}>
                <CardContent className="p-8 space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Vehicle Details</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <DetailItem label="Make" value={vehicle.make} />
                        <DetailItem label="Model" value={vehicle.model} />
                        <DetailItem label="Type" value={vehicle.type || 'Car'} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Registration</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <DetailItem label="Registration" value={vehicle.registrationNumber} />
                        <DetailItem label="VIN" value={vehicle.vin || 'N/A'} />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-primary border-b pb-2">Usage</h3>
                      <div className="grid grid-cols-1 gap-6">
                        <DetailItem label="Current Odometer" value={(vehicle.currentOdometer || 0).toFixed(0)} />
                        <DetailItem label="Next Service Date" value={vehicle.nextServiceDueDate ? format(new Date(vehicle.nextServiceDueDate), 'dd MMM yyyy') : 'Not set'} />
                        <DetailItem label="Next Service Odometer" value={vehicle.nextServiceDueOdometer != null ? `${vehicle.nextServiceDueOdometer.toFixed(0)} km` : 'Not set'} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="documents" className={cn('mt-0 outline-none', isMobile ? 'min-h-0' : 'h-full overflow-y-auto no-scrollbar')}>
                <VehicleDocumentsTab vehicle={vehicle} tenantId={tenantId || ''} expirySettings={expirySettings} />
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
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-black text-foreground">{value}</p>
    </div>
  );
}

function VehicleDocumentsTab({ vehicle, tenantId, expirySettings }: { vehicle: Vehicle; tenantId: string; expirySettings: DocumentExpirySettings | null }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [viewingDoc, setViewingDoc] = useState<{ name: string; url: string } | null>(null);

  const handleDocUpload = (newDoc: VehicleDocument) => {
    const vehicleRef = doc(firestore, `tenants/${tenantId}/vehicles`, vehicle.id);
    updateDocumentNonBlocking(vehicleRef, { documents: arrayUnion(newDoc) });
    toast({ title: 'Document Added', description: `"${newDoc.name}" has been uploaded.` });
  };

  const handleDeleteDoc = (docName: string) => {
    const updatedDocs = (vehicle.documents || []).filter((docItem) => docItem.name !== docName);
    const vehicleRef = doc(firestore, `tenants/${tenantId}/vehicles`, vehicle.id);
    updateDocumentNonBlocking(vehicleRef, { documents: updatedDocs });
    toast({ title: 'Document Removed' });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-muted/5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 shrink-0">
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Vehicle Documents</h3>
          <p className="text-xs font-medium text-muted-foreground">Registration papers, insurance, and compliance records.</p>
        </div>
        <DocumentUploader
          onDocumentUploaded={handleDocUpload}
          trigger={(open) => (
            <Button size="sm" onClick={() => open()} variant="outline" className="gap-2 h-9 px-6 text-xs font-black uppercase border-slate-300">
              <PlusCircle className="h-4 w-4" /> Add Document
            </Button>
          )}
        />
      </div>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted/30 sticky top-0 z-10">
            <TableRow>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Document Name</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Upload Date</TableHead>
              <TableHead className="text-[10px] uppercase font-bold tracking-wider">Expiry</TableHead>
              <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicle.documents && vehicle.documents.length > 0 ? (
              vehicle.documents.map((docItem) => {
                const expiryStyle = getDocumentExpiryBadgeStyle(docItem.expirationDate, expirySettings);
                return (
                  <TableRow key={docItem.name}>
                    <TableCell className="font-bold text-sm">{docItem.name}</TableCell>
                    <TableCell className="text-xs font-medium">{format(new Date(docItem.uploadDate), 'dd MMM yyyy')}</TableCell>
                    <TableCell className="text-xs">
                      {docItem.expirationDate ? (
                        <Badge variant="outline" className="font-bold" style={expiryStyle || undefined}>
                          {format(new Date(docItem.expirationDate), 'dd MMM yyyy')}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground opacity-50 font-medium">No Expiry</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => setViewingDoc({ name: docItem.name, url: docItem.url })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteDoc(docItem.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">
                  No vehicle documents uploaded.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-[4/3] w-full bg-muted rounded-md overflow-hidden border">
            {viewingDoc ? <img src={viewingDoc.url} alt={viewingDoc.name} className="object-contain w-full h-full" /> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingDoc(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EditVehicleDialog({ vehicle, tenantId }: { vehicle: Vehicle; tenantId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof vehicleSchema>>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      make: vehicle.make || '',
      model: vehicle.model || '',
      registrationNumber: vehicle.registrationNumber || '',
      type: vehicle.type || 'Car',
      vin: vehicle.vin || '',
      currentOdometer: vehicle.currentOdometer || 0,
      nextServiceDueDate: vehicle.nextServiceDueDate || '',
      nextServiceDueOdometer: vehicle.nextServiceDueOdometer ?? '',
    },
  });

  const onSubmit = (values: z.infer<typeof vehicleSchema>) => {
    const vehicleRef = doc(firestore, `tenants/${tenantId}/vehicles`, vehicle.id);
    updateDocumentNonBlocking(vehicleRef, {
      ...values,
      nextServiceDueDate: values.nextServiceDueDate || null,
      nextServiceDueOdometer: values.nextServiceDueOdometer === '' ? null : values.nextServiceDueOdometer,
    });
    toast({ title: 'Vehicle Updated' });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9 px-6 text-xs font-black uppercase border-slate-300">
          <Pencil className="h-3.5 w-3.5" /> Edit Specifications
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle Details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="registrationNumber" render={({ field }) => (<FormItem><FormLabel>Registration</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem><FormLabel>Vehicle Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Car">Car</SelectItem><SelectItem value="Truck">Truck</SelectItem><SelectItem value="Van">Van</SelectItem><SelectItem value="Bus">Bus</SelectItem><SelectItem value="Utility">Utility</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></FormItem>
              )} />
              <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Make</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>VIN</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="currentOdometer" render={({ field }) => (<FormItem><FormLabel>Current Odometer</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="nextServiceDueDate" render={({ field }) => (<FormItem><FormLabel>Next Service Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>)} />
              <FormField control={form.control} name="nextServiceDueOdometer" render={({ field }) => (<FormItem><FormLabel>Next Service Due Odometer</FormLabel><FormControl><Input type="number" step="1" value={field.value} onChange={(e) => field.onChange(e.target.value === '' ? '' : Number(e.target.value))} /></FormControl></FormItem>)} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
