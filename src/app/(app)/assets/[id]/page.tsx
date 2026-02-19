'use client';

import { use, Suspense } from 'react';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, FileText, Wrench, Scale, Clock, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Aircraft, AircraftComponent } from '@/types/aircraft';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface AircraftDetailPageProps {
  params: { id: string };
}

const DetailItem = ({ label, value, unit, children }: { label: string; value?: string | number | null; unit?: string; children?: React.ReactNode }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? <div className="text-base font-semibold">{children}</div> : <p className="text-base font-semibold">{value ?? 'N/A'}{unit ? ` ${unit}` : ''}</p>}
    </div>
);


function AircraftDetailPageContent({ params }: AircraftDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const aircraftId = resolvedParams.id;
    
    const aircraftRef = useMemoFirebase(
        () => (firestore && aircraftId ? doc(firestore, 'tenants', tenantId, 'aircrafts', aircraftId) : null),
        [firestore, tenantId, aircraftId]
    );

    const { data: aircraft, isLoading, error } = useDoc<Aircraft>(aircraftRef);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Card>
                    <CardHeader>
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                    </CardHeader>
                </Card>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }
    
    if (error) {
        return <p className="text-destructive">Error: {error.message}</p>;
    }
    
    if (!aircraft) {
        return <p>Aircraft not found.</p>;
    }

    return (
        <div className="space-y-6">
            <Button asChild variant="outline">
                <Link href="/assets">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Fleet
                </Link>
            </Button>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">{aircraft.tailNumber}</CardTitle>
                            <CardDescription>{aircraft.model}</CardDescription>
                        </div>
                        <Badge variant="secondary">{aircraft.type}</Badge>
                    </div>
                </CardHeader>
            </Card>

            <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="hours">Hours & Inspections</TabsTrigger>
                    <TabsTrigger value="documents">Documents</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                    <TabsTrigger value="weight-balance">Weight & Balance</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                    <Card>
                        <CardHeader>
                            <CardTitle>Aircraft Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <DetailItem label="Model" value={aircraft.model} />
                           <DetailItem label="Type" value={aircraft.type} />
                           <DetailItem label="Abbreviation" value={aircraft.abbreviation} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="hours">
                     <Card>
                        <CardHeader>
                            <CardTitle>Hours & Inspections</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                           <DetailItem label="Frame Hours" value={aircraft.frameHours} unit="hrs" />
                           <DetailItem label="Engine Hours" value={aircraft.engineHours} unit="hrs" />
                           <DetailItem label="Current Hobbs" value={aircraft.currentHobbs} unit="hrs" />
                           <DetailItem label="Current Tacho" value={aircraft.currentTacho} unit="hrs" />
                           <DetailItem label="Next 50hr Tacho" value={aircraft.tachoAtNext50Inspection} unit="hrs" />
                           <DetailItem label="Next 100hr Tacho" value={aircraft.tachoAtNext100Inspection} unit="hrs" />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="documents">
                    <Card>
                        <CardHeader>
                            <CardTitle>Documents</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Upload Date</TableHead>
                                        <TableHead>Expiry Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(aircraft.documents || []).length > 0 ? aircraft.documents!.map(doc => (
                                        <TableRow key={doc.name}>
                                            <TableCell>{doc.name}</TableCell>
                                            <TableCell>{doc.uploadDate ? format(new Date(doc.uploadDate), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>{doc.expirationDate ? format(new Date(doc.expirationDate), 'PPP') : 'N/A'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center">No documents uploaded.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="components">
                    <Card>
                        <CardHeader>
                            <CardTitle>Components</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Part No.</TableHead>
                                        <TableHead>Serial No.</TableHead>
                                        <TableHead>Install Date</TableHead>
                                        <TableHead>Max Hours</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(aircraft.components || []).length > 0 ? aircraft.components!.map(comp => (
                                        <TableRow key={comp.id}>
                                            <TableCell>{comp.name}</TableCell>
                                            <TableCell>{comp.partNumber}</TableCell>
                                            <TableCell>{comp.serialNumber || 'N/A'}</TableCell>
                                            <TableCell>{comp.installDate ? format(new Date(comp.installDate), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>{comp.maxHours ? `${comp.maxHours} hrs` : 'N/A'}</TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center">No components tracked.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="weight-balance">
                    <Card>
                        <CardHeader>
                            <CardTitle>Weight & Balance</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                            <DetailItem label="Empty Weight" value={aircraft.emptyWeight} unit="lbs" />
                            <DetailItem label="Empty Weight Moment" value={aircraft.emptyWeightMoment} unit="lbs-in" />
                            <DetailItem label="Max Takeoff Weight" value={aircraft.maxTakeoffWeight} unit="lbs" />
                            <DetailItem label="Max Landing Weight" value={aircraft.maxLandingWeight} unit="lbs" />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


export default function AircraftDetailPage(props: AircraftDetailPageProps) {
  return (
    <Suspense fallback={<div>Loading aircraft details...</div>}>
      <AircraftDetailPageContent {...props} />
    </Suspense>
  )
}
