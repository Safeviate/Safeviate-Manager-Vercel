
'use client';

import { use, useMemo, useState } from 'react';
import { useDoc, useFirestore, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Booking, Photo } from '@/types/booking';
import type { Aircraft } from '../../../assets/page';
import type { PilotProfile } from '../../../users/personnel/page';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Plane, User, FileText, Camera, ZoomIn, Scale } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BookingDetailPageProps {
    params: { id: string };
}

const DetailItem = ({ label, value, children }: { label: string; value?: string | null; children?: React.ReactNode }) => (
    <div>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? <div className="text-base">{children}</div> : <p className="text-base">{value || 'N/A'}</p>}
    </div>
);

const PhotoGrid = ({ photos }: { photos: Photo[] }) => {
    const [isViewerOpen, setIsViewerOpen] = useState(false);
    const [viewingUrl, setViewingUrl] = useState('');

    const openViewer = (url: string) => {
        setViewingUrl(url);
        setIsViewerOpen(true);
    };

    return (
        <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                        <Image
                            src={photo.url}
                            alt={photo.description}
                            fill
                            className="object-cover rounded-md"
                        />
                        <div 
                            className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={() => openViewer(photo.url)}
                        >
                            <ZoomIn className="h-8 w-8 text-white" />
                            <p className="text-xs text-white text-center mt-1 truncate">{photo.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle>Photo Viewer</DialogTitle>
                    </DialogHeader>
                    <div className="relative h-[80vh]">
                        <Image 
                            src={viewingUrl}
                            alt="Full size view" 
                            fill
                            style={{ objectFit: 'contain' }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Function to convert camelCase to Title Case
const camelToTitle = (camelCase: string) => {
  if (!camelCase) return '';
  const result = camelCase.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};


export default function BookingDetailPage({ params }: BookingDetailPageProps) {
    const resolvedParams = use(params);
    const firestore = useFirestore();
    const tenantId = 'safeviate';
    const bookingId = resolvedParams.id;

    const bookingRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'tenants', tenantId, 'bookings', bookingId) : null),
        [firestore, tenantId, bookingId]
    );
    const aircraftsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'aircrafts') : null),
        [firestore, tenantId]
    );
    const pilotsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'tenants', tenantId, 'pilots') : null),
        [firestore, tenantId]
    );

    const { data: booking, isLoading: isLoadingBooking, error: bookingError } = useDoc<Booking>(bookingRef);
    const { data: aircrafts, isLoading: isLoadingAircrafts } = useCollection<Aircraft>(aircraftsRef);
    const { data: pilots, isLoading: isLoadingPilots } = useCollection<PilotProfile>(pilotsRef);

    const isLoading = isLoadingBooking || isLoadingAircrafts || isLoadingPilots;

    const enrichedBooking = useMemo(() => {
        if (!booking || !aircrafts || !pilots) return null;
        
        const aircraft = aircrafts.find(a => a.id === booking.aircraftId);
        const creator = pilots.find(p => p.id === booking.createdById);
        const instructor = booking.instructorId ? pilots.find(p => p.id === booking.instructorId) : null;

        return {
            ...booking,
            aircraft,
            creatorName: creator ? `${creator.firstName} ${creator.lastName}` : 'Unknown Creator',
            instructorName: instructor ? `${instructor.firstName} ${instructor.lastName}` : null,
            fullStartTime: parse(`${booking.date} ${booking.startTime}`, 'yyyy-MM-dd HH:mm', new Date()),
            fullEndTime: parse(`${booking.date} ${booking.endTime}`, 'yyyy-MM-dd HH:mm', new Date()),
        };
    }, [booking, aircrafts, pilots]);

    if (isLoading) {
        return <div className="space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>;
    }

    if (bookingError) {
        return <div className="text-destructive">Error loading booking: {bookingError.message}</div>;
    }

    if (!enrichedBooking) {
        return <div>Booking not found.</div>;
    }
    
    const preFlight = enrichedBooking.preFlight;
    const postFlight = enrichedBooking.postFlight;
    const massAndBalance = enrichedBooking.massAndBalance;

    return (
        <div className="space-y-6">
            <Button asChild variant="outline">
                <Link href="/operations/bookings-history">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to History
                </Link>
            </Button>
            
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-2xl">Booking #{enrichedBooking.bookingNumber}</CardTitle>
                            <CardDescription>{format(enrichedBooking.fullStartTime, 'PPP, HH:mm')} - {format(enrichedBooking.fullEndTime, 'HH:mm')}</CardDescription>
                        </div>
                        <Badge variant={enrichedBooking.status === 'Completed' ? 'default' : 'secondary'}>{enrichedBooking.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <DetailItem label="Aircraft">
                        <div className="flex items-center gap-2">
                           <Plane className="h-4 w-4 text-muted-foreground" />
                           <span>{enrichedBooking.aircraft?.tailNumber}</span>
                        </div>
                    </DetailItem>
                    <DetailItem label="Pilot in Command">
                        <div className="flex items-center gap-2">
                           <User className="h-4 w-4 text-muted-foreground" />
                           <span>{enrichedBooking.creatorName}</span>
                        </div>
                    </DetailItem>
                    {enrichedBooking.instructorName && (
                        <DetailItem label="Instructor">
                            <div className="flex items-center gap-2">
                               <User className="h-4 w-4 text-muted-foreground" />
                               <span>{enrichedBooking.instructorName}</span>
                            </div>
                        </DetailItem>
                    )}
                    <DetailItem label="Booking Type" value={enrichedBooking.type} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Mass &amp; Balance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {massAndBalance && Object.keys(massAndBalance).length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                           {Object.entries(massAndBalance).map(([stationKey, values]) => (
                                <DetailItem key={stationKey} label={camelToTitle(stationKey)}>
                                    <p className="text-base">{values.weight.toFixed(2)} lbs @ {values.moment.toFixed(2)}</p>
                                </DetailItem>
                           ))}
                        </div>
                    ) : (
                        <p className="text-muted-foreground">No Mass & Balance calculation has been saved for this booking.</p>
                    )}
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pre-Flight Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {preFlight ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Hobbs" value={preFlight.actualHobbs?.toString()} />
                                    <DetailItem label="Tacho" value={preFlight.actualTacho?.toString()} />
                                    <DetailItem label="Oil (lts)" value={preFlight.oil?.toString()} />
                                    <DetailItem label="Fuel (lts)" value={preFlight.fuel?.toString()} />
                                </div>
                                <DetailItem label="Documents Checked">
                                    {preFlight.documentsChecked && preFlight.documentsChecked.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {preFlight.documentsChecked.map(doc => <Badge key={doc} variant="secondary">{doc.toUpperCase()}</Badge>)}
                                        </div>
                                    ) : 'N/A'}
                                </DetailItem>
                                <DetailItem label="Photos">
                                    {preFlight.photos && preFlight.photos.length > 0 ? (
                                        <PhotoGrid photos={preFlight.photos} />
                                    ) : <p className="text-sm text-muted-foreground">No photos submitted.</p>}
                                </DetailItem>
                            </>
                        ) : (
                            <p className="text-muted-foreground">No pre-flight checklist submitted.</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Post-Flight Checklist</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {postFlight ? (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label="Hobbs" value={postFlight.actualHobbs?.toString()} />
                                    <DetailItem label="Tacho" value={postFlight.actualTacho?.toString()} />
                                    <DetailItem label="Oil (lts)" value={postFlight.oil?.toString()} />
                                    <DetailItem label="Fuel (lts)" value={postFlight.fuel?.toString()} />
                                </div>
                                <DetailItem label="Photos">
                                    {postFlight.photos && postFlight.photos.length > 0 ? (
                                        <PhotoGrid photos={postFlight.photos} />
                                    ) : <p className="text-sm text-muted-foreground">No photos submitted.</p>}
                                </DetailItem>
                            </>
                        ) : (
                            <p className="text-muted-foreground">No post-flight checklist submitted.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
