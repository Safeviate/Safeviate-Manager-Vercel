
'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown, AlertCircle } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, addHours, set, parse } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBooking, updateBooking } from './booking-functions';


interface BookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  aircraft: Aircraft;
  startTime: Date;
  tenantId: string;
  pilots: PilotProfile[];
  existingBooking?: Booking;
}

const requiredDocumentsList = [
    { id: 'poh', label: 'POH' },
    { id: 'cors', label: 'CoRs' },
    { id: 'coa', label: 'CoA' },
    { id: 'radio', label: 'Radio' },
    { id: 'mb', label: 'M&B' },
    { id: 'insp', label: 'Insp' },
];

export function BookingForm({
  isOpen,
  setIsOpen,
  aircraft,
  startTime,
  tenantId,
  pilots,
  existingBooking,
}: BookingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = !!existingBooking;

  // Collapsible sections state
  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(true);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(isEditMode);
  const [isPostFlightOpen, setIsPostFlightOpen] = useState(false);

  // Form state
  const [bookingType, setBookingType] = useState(existingBooking?.type || '');
  const [pilotId, setPilotId] = useState(existingBooking?.pilotId || '');
  const [instructorId, setInstructorId] = useState(existingBooking?.instructorId || '');
  const [startTimeValue, setStartTimeValue] = useState('');
  const [endTimeValue, setEndTimeValue] = useState('');
  
  // Pre-flight state
  const [preFlightHobbs, setPreFlightHobbs] = useState<number | string>(existingBooking?.preFlight?.actualHobbs || '');
  const [preFlightTacho, setPreFlightTacho] = useState<number | string>(existingBooking?.preFlight?.actualTacho || '');
  const [preFlightOil, setPreFlightOil] = useState<number | string>(existingBooking?.preFlight?.oil || '');
  const [preFlightFuel, setPreFlightFuel] = useState<number | string>(existingBooking?.preFlight?.fuel || '');
  const [preFlightOilLeft, setPreFlightOilLeft] = useState<number | string>(existingBooking?.preFlight?.oilLeft || '');
  const [preFlightOilRight, setPreFlightOilRight] = useState<number | string>(existingBooking?.preFlight?.oilRight || '');
  const [checkedDocs, setCheckedDocs] = useState<string[]>(existingBooking?.preFlight?.documentsChecked || []);
  
  // Post-flight state
  const [postFlightHobbs, setPostFlightHobbs] = useState<number | string>(existingBooking?.postFlight?.actualHobbs || '');
  const [postFlightTacho, setPostFlightTacho] = useState<number | string>(existingBooking?.postFlight?.actualTacho || '');
  const [postFlightOil, setPostFlightOil] = useState<number | string>(existingBooking?.postFlight?.oil || '');
  const [postFlightFuel, setPostFlightFuel] = useState<number | string>(existingBooking?.postFlight?.fuel || '');
  const [postFlightOilLeft, setPostFlightOilLeft] = useState<number | string>(existingBooking?.postFlight?.oilLeft || '');
  const [postFlightOilRight, setPostFlightOilRight] = useState<number | string>(existingBooking?.postFlight?.oilRight || '');

  const isChecklistNeeded = aircraft?.checklistStatus === 'needs-post-flight';
  const preflightDisabled = !isEditMode && isChecklistNeeded;

  useEffect(() => {
    if (startTime && !isEditMode) {
      const formattedStartTime = format(startTime, 'HH:mm');
      const endTimeDate = addHours(startTime, 1);
      const formattedEndTime = format(endTimeDate, 'HH:mm');
      setStartTimeValue(formattedStartTime);
      setEndTimeValue(formattedEndTime);
    }
    if (isEditMode && existingBooking) {
      setStartTimeValue(format(existingBooking.startTime.toDate(), 'HH:mm'));
      setEndTimeValue(format(existingBooking.endTime.toDate(), 'HH:mm'));
    }
  }, [startTime, isEditMode, existingBooking]);

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
  };
  
  const handleSave = async (options: { closeOnSave: boolean, isPreFlight?: boolean, isPostFlight?: boolean } = { closeOnSave: true }) => {
    if (!firestore) return;

    if (!bookingType || !pilotId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Booking Type and Pilot are required.' });
      return;
    }

    if (bookingType === 'Training Flight' && !instructorId) {
        toast({ variant: 'destructive', title: 'Error', description: 'Instructor is required for Training Flights.' });
        return;
    }
    
    const startDate = existingBooking ? existingBooking.startTime.toDate() : startTime;
    const parsedStartTime = parse(startTimeValue, 'HH:mm', startDate);
    const parsedEndTime = parse(endTimeValue, 'HH:mm', startDate);

    if (isEditMode && existingBooking) {
        // --- UPDATE LOGIC ---
        const updateData: Partial<Booking> = {};
        
        // Always include booking details on a full save
        if (!options.isPreFlight && !options.isPostFlight) {
            Object.assign(updateData, {
                type: bookingType as Booking['type'],
                pilotId,
                instructorId: instructorId || undefined,
                startTime: parsedStartTime,
                endTime: parsedEndTime,
            });
        }
        
        // Add pre-flight data if it's a pre-flight submit or a full save
        if (options.isPreFlight || !options.isPostFlight) {
            updateData.preFlight = {
                actualHobbs: Number(preFlightHobbs) || undefined,
                actualTacho: Number(preFlightTacho) || undefined,
                oil: Number(preFlightOil) || undefined,
                fuel: Number(preFlightFuel) || undefined,
                oilLeft: Number(preFlightOilLeft) || undefined,
                oilRight: Number(preFlightOilRight) || undefined,
                documentsChecked: checkedDocs,
            };
        }

        // Add post-flight data if it's a post-flight submit or a full save
        if (options.isPostFlight || !options.isPreFlight) {
            updateData.postFlight = {
                actualHobbs: Number(postFlightHobbs) || undefined,
                actualTacho: Number(postFlightTacho) || undefined,
                oil: Number(postFlightOil) || undefined,
                fuel: Number(postFlightFuel) || undefined,
                oilLeft: Number(postFlightOilLeft) || undefined,
                oilRight: Number(postFlightOilRight) || undefined,
            };
        }
        
        // Finalize status on post-flight or full save
        if (options.isPostFlight || !options.isPreFlight) {
            const isPostFlightFilled = Number(postFlightHobbs) > 0 && Number(postFlightTacho) > 0;
            if (isPostFlightFilled) {
                updateData.status = 'Completed';
                updateBooking(firestore, tenantId, existingBooking.id, updateData, aircraft.id, true);
                toast({ title: 'Post-Flight Submitted', description: 'Aircraft is now ready for the next booking.' });
            } else {
                 updateBooking(firestore, tenantId, existingBooking.id, updateData, aircraft.id, false);
                 toast({ title: 'Booking Updated', description: `Booking #${existingBooking.bookingNumber} has been updated.` });
            }
        } else if (options.isPreFlight) {
            updateBooking(firestore, tenantId, existingBooking.id, updateData, aircraft.id, false);
            toast({ title: 'Pre-Flight Submitted', description: `Booking #${existingBooking.bookingNumber} is ready for flight.` });
        }

    } else {
        // --- CREATE LOGIC ---
        const bookingData = {
            aircraftId: aircraft.id,
            pilotId,
            instructorId: instructorId || undefined,
            type: bookingType as Booking['type'],
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            preFlight: {
                actualHobbs: Number(preFlightHobbs),
                actualTacho: Number(preFlightTacho),
                oil: Number(preFlightOil),
                fuel: Number(preFlightFuel),
                oilLeft: Number(preFlightOilLeft),
                oilRight: Number(preFlightOilRight),
                documentsChecked: checkedDocs,
            }
        };

        try {
            await createBooking(firestore, tenantId, bookingData);
            toast({ title: 'Booking Created', description: 'The new booking has been saved successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
        }
    }

    if (options.closeOnSave) {
      setIsOpen(false);
    }
  };
  
  const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);
  const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
  const privatePilots = useMemo(() => pilots.filter(p => p.userType === 'Private Pilot'), [pilots]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? `Edit Booking #${existingBooking.bookingNumber}` : 'Create Booking'}</DialogTitle>
          <DialogDescription>
            For {aircraft.tailNumber} on {format(startTime, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
            <div className="grid gap-4 py-4 pr-2">
                {preflightDisabled && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Pre-Flight Unavailable</AlertTitle>
                        <AlertDescription>
                            A post-flight checklist for this aircraft must be completed before a new pre-flight can be started.
                        </AlertDescription>
                    </Alert>
                )}
                <Collapsible open={isBookingInfoOpen} onOpenChange={setIsBookingInfoOpen} className="space-y-2">
                    <CollapsibleTrigger asChild>
                        <div className='flex items-center justify-between border-b pb-2 cursor-pointer'>
                            <h4 className="text-sm font-semibold">Booking Information</h4>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                <ChevronsUpDown className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="col-span-2 space-y-2">
                                <Label htmlFor="booking-type">Booking Type</Label>
                                <Select onValueChange={v => setBookingType(v as Booking['type'])} value={bookingType} disabled={isEditMode}>
                                    <SelectTrigger id="booking-type">
                                        <SelectValue placeholder="Select a flight type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Training Flight">Training Flight</SelectItem>
                                        <SelectItem value="Private Flight">Private Flight</SelectItem>
                                        <SelectItem value="Reposition Flight">Reposition Flight</SelectItem>
                                        <SelectItem value="Maintenance Flight">Maintenance Flight</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {bookingType === 'Training Flight' && (
                                <>
                                    <div className="col-span-1 space-y-2">
                                        <Label htmlFor="student">Student</Label>
                                        <Select onValueChange={setPilotId} value={pilotId} disabled={isEditMode}>
                                            <SelectTrigger id="student">
                                                <SelectValue placeholder="Select a student" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {students.map(student => (
                                                    <SelectItem key={student.id} value={student.id}>
                                                        {student.firstName} {student.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="col-span-1 space-y-2">
                                        <Label htmlFor="instructor">Instructor</Label>
                                        <Select onValueChange={setInstructorId} value={instructorId} disabled={isEditMode}>
                                            <SelectTrigger id="instructor">
                                                <SelectValue placeholder="Select an instructor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {instructors.map(instructor => (
                                                    <SelectItem key={instructor.id} value={instructor.id}>
                                                        {instructor.firstName} {instructor.lastName}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </>
                            )}
                            {bookingType === 'Private Flight' && (
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="private-pilot">Pilot</Label>
                                     <Select onValueChange={setPilotId} value={pilotId} disabled={isEditMode}>
                                        <SelectTrigger id="private-pilot">
                                            <SelectValue placeholder="Select a pilot" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {privatePilots.map(pilot => (
                                                <SelectItem key={pilot.id} value={pilot.id}>
                                                    {pilot.firstName} {pilot.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="start-time">Start Time</Label>
                                <Input 
                                    id="start-time" 
                                    type="time"
                                    value={startTimeValue}
                                    onChange={(e) => setStartTimeValue(e.target.value)}
                                    readOnly={isEditMode}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-time">End Time</Label>
                                <Input 
                                    id="end-time" 
                                    type="time" 
                                    value={endTimeValue}
                                    onChange={(e) => setEndTimeValue(e.target.value)}
                                    readOnly={isEditMode}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isPreFlightOpen} onOpenChange={setIsPreFlightOpen} disabled={preflightDisabled}>
                    <CollapsibleTrigger asChild disabled={preflightDisabled}>
                        <div className='flex items-center justify-between border-b pb-2 cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'>
                            <h4 className="text-sm font-semibold">Pre-Flight Checks</h4>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                <ChevronsUpDown className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                       <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-hobbs">Current Hobbs</Label>
                                <Input id="current-hobbs" value={aircraft?.currentHobbs || ''} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="current-tacho">Current Tacho</Label>
                                <Input id="current-tacho" value={aircraft?.currentTacho || ''} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actual-hobbs">Actual Hobbs</Label>
                                <Input id="actual-hobbs" type="number" value={preFlightHobbs} onChange={(e) => setPreFlightHobbs(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actual-tacho">Actual Tacho</Label>
                                <Input id="actual-tacho" type="number" value={preFlightTacho} onChange={(e) => setPreFlightTacho(e.target.value)} />
                            </div>
                        </div>

                        <div className="col-span-2 mt-4 space-y-4">
                          {aircraft.type === 'Single-Engine' && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="oil">Oil</Label>
                                      <Input id="oil" value={preFlightOil} onChange={(e) => setPreFlightOil(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="fuel">Fuel</Label>
                                      <Input id="fuel" value={preFlightFuel} onChange={(e) => setPreFlightFuel(e.target.value)} />
                                  </div>
                              </div>
                          )}
                          {aircraft.type === 'Multi-Engine' && (
                              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="fuel">Fuel</Label>
                                      <Input id="fuel" value={preFlightFuel} onChange={(e) => setPreFlightFuel(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="oil-left">Oil Left</Label>
                                      <Input id="oil-left" value={preFlightOilLeft} onChange={(e) => setPreFlightOilLeft(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="oil-right">Oil Right</Label>
                                      <Input id="oil-right" value={preFlightOilRight} onChange={(e) => setPreFlightOilRight(e.target.value)} />
                                  </div>
                              </div>
                          )}
                      </div>


                        <div className="col-span-2 mt-4 space-y-2">
                            <Separator />
                            <h4 className="text-sm font-semibold pt-2">Required documents</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
                                {requiredDocumentsList.map((doc) => (
                                    <div key={doc.id} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={doc.id} 
                                            checked={checkedDocs.includes(doc.id)}
                                            onCheckedChange={(checked) => {
                                                setCheckedDocs(prev => checked ? [...prev, doc.id] : prev.filter(id => id !== doc.id))
                                            }}
                                        />
                                        <Label htmlFor={doc.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {doc.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={() => handleSave({ closeOnSave: false, isPreFlight: true })}>Submit Pre-Flight</Button>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isPostFlightOpen} onOpenChange={setIsPostFlightOpen} disabled={!isEditMode}>
                    <CollapsibleTrigger asChild disabled={!isEditMode}>
                        <div className='flex items-center justify-between border-b pb-2 cursor-pointer data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50'>
                            <h4 className="text-sm font-semibold">Post-Flight Checks</h4>
                            <Button variant="ghost" size="sm" className="w-9 p-0">
                                <ChevronsUpDown className="h-4 w-4" />
                                <span className="sr-only">Toggle</span>
                            </Button>
                        </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                        <div className="grid grid-cols-2 gap-4 pt-4">
                           <div className="space-y-2">
                                <Label htmlFor="post-actual-hobbs">Actual Hobbs</Label>
                                <Input id="post-actual-hobbs" type="number" value={postFlightHobbs} onChange={(e) => setPostFlightHobbs(e.target.value)} disabled={!isEditMode} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="post-actual-tacho">Actual Tacho</Label>
                                <Input id="post-actual-tacho" type="number" value={postFlightTacho} onChange={(e) => setPostFlightTacho(e.target.value)} disabled={!isEditMode} />
                            </div>
                        </div>
                         <div className="col-span-2 mt-4 space-y-4">
                          {aircraft.type === 'Single-Engine' && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-oil">Oil</Label>
                                      <Input id="post-flight-oil" value={postFlightOil} onChange={(e) => setPostFlightOil(e.target.value)} disabled={!isEditMode} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-fuel">Fuel</Label>
                                      <Input id="post-flight-fuel" value={postFlightFuel} onChange={(e) => setPostFlightFuel(e.target.value)} disabled={!isEditMode} />
                                  </div>
                              </div>
                          )}
                          {aircraft.type === 'Multi-Engine' && (
                              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-fuel">Fuel</Label>
                                      <Input id="post-flight-fuel" value={postFlightFuel} onChange={(e) => setPostFlightFuel(e.target.value)} disabled={!isEditMode} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-oil-left">Oil Left</Label>
                                      <Input id="post-flight-oil-left" value={postFlightOilLeft} onChange={(e) => setPostFlightOilLeft(e.target.value)} disabled={!isEditMode} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-oil-right">Oil Right</Label>
                                      <Input id="post-flight-oil-right" value={postFlightOilRight} onChange={(e) => setPostFlightOilRight(e.target.value)} disabled={!isEditMode} />
                                  </div>
                              </div>
                          )}
                      </div>
                      <div className="flex justify-end pt-4">
                          <Button onClick={() => handleSave({ closeOnSave: false, isPostFlight: true })} disabled={!isEditMode}>Submit Post-Flight</Button>
                      </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </ScrollArea>
        <DialogFooter className='justify-between pt-6'>
            <Button variant="destructive" className="w-20" disabled={!isEditMode}>
                Delete
            </Button>
            <div className='flex gap-2'>
                <DialogClose asChild>
                    <Button variant="outline" className="w-20">Cancel</Button>
                </DialogClose>
                <Button onClick={() => handleSave({ closeOnSave: true })} className="w-20" disabled={preflightDisabled}>Save</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
