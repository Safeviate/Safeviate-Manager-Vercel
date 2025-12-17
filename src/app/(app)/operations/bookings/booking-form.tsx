
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronsUpDown, AlertCircle, Trash2 } from 'lucide-react';
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
import { format, addHours, set, parse, isBefore } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createBooking, updateBooking, deleteBooking } from './booking-functions';


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

const toNumberOrNull = (value: string | number | null | undefined): number | null => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
};


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
  const [preFlightHobbs, setPreFlightHobbs] = useState<number | string>(existingBooking?.preFlight?.actualHobbs ?? '');
  const [preFlightTacho, setPreFlightTacho] = useState<number | string>(existingBooking?.preFlight?.actualTacho ?? '');
  const [preFlightOil, setPreFlightOil] = useState<number | string>(existingBooking?.preFlight?.oil ?? '');
  const [preFlightFuel, setPreFlightFuel] = useState<number | string>(existingBooking?.preFlight?.fuel ?? '');
  const [preFlightOilLeft, setPreFlightOilLeft] = useState<number | string>(existingBooking?.preFlight?.oilLeft ?? '');
  const [preFlightOilRight, setPreFlightOilRight] = useState<number | string>(existingBooking?.preFlight?.oilRight ?? '');
  const [checkedDocs, setCheckedDocs] = useState<string[]>(existingBooking?.preFlight?.documentsChecked || []);
  
  // Post-flight state
  const [postFlightHobbs, setPostFlightHobbs] = useState<number | string>(existingBooking?.postFlight?.actualHobbs ?? '');
  const [postFlightTacho, setPostFlightTacho] = useState<number | string>(existingBooking?.postFlight?.actualTacho ?? '');
  const [postFlightOil, setPostFlightOil] = useState<number | string>(existingBooking?.postFlight?.oil ?? '');
  const [postFlightFuel, setPostFlightFuel] = useState<number | string>(existingBooking?.postFlight?.fuel ?? '');
  const [postFlightOilLeft, setPostFlightOilLeft] = useState<number | string>(existingBooking?.postFlight?.oilLeft ?? '');
  const [postFlightOilRight, setPostFlightOilRight] = useState<number | string>(existingBooking?.postFlight?.oilRight ?? '');

  const isChecklistNeeded = aircraft?.checklistStatus === 'needs-post-flight';
  const preflightDisabled = (!isEditMode && isChecklistNeeded);

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
    
    const baseDate = existingBooking ? existingBooking.startTime.toDate() : startTime;
    const [startHours, startMinutes] = startTimeValue.split(':').map(Number);
    const [endHours, endMinutes] = endTimeValue.split(':').map(Number);
    
    let parsedStartTime = set(baseDate, { hours: startHours, minutes: startMinutes, seconds: 0, milliseconds: 0 });
    let parsedEndTime = set(baseDate, { hours: endHours, minutes: endMinutes, seconds: 0, milliseconds: 0 });

    if (isBefore(parsedEndTime, parsedStartTime)) {
        parsedEndTime = addHours(parsedEndTime, 24); // Assume it's the next day
    }


    const getPreFlightData = () => ({
        actualHobbs: toNumberOrNull(preFlightHobbs),
        actualTacho: toNumberOrNull(preFlightTacho),
        oil: toNumberOrNull(preFlightOil),
        fuel: toNumberOrNull(preFlightFuel),
        oilLeft: toNumberOrNull(preFlightOilLeft),
        oilRight: toNumberOrNull(preFlightOilRight),
        documentsChecked: checkedDocs,
    });

    const getPostFlightData = () => ({
        actualHobbs: toNumberOrNull(postFlightHobbs),
        actualTacho: toNumberOrNull(postFlightTacho),
        oil: toNumberOrNull(postFlightOil),
        fuel: toNumberOrNull(postFlightFuel),
        oilLeft: toNumberOrNull(postFlightOilLeft),
        oilRight: toNumberOrNull(postFlightOilRight),
    });

    if (isEditMode && existingBooking) {
        // --- UPDATE LOGIC ---
        const updateData: Partial<Booking> = {
            startTime: parsedStartTime,
            endTime: parsedEndTime,
            type: bookingType as Booking['type'],
            pilotId: pilotId
        };
        
        // This is a general save, update everything
        if (!options.isPreFlight && !options.isPostFlight) {
            Object.assign(updateData, {
                preFlight: getPreFlightData(),
                postFlight: getPostFlightData(),
            });
            if (instructorId) {
                updateData.instructorId = instructorId;
            } else {
                updateData.instructorId = null; // Send null to be deleted by update function
            }
        }
        
        // This is just a pre-flight submission
        if (options.isPreFlight) {
            updateData.preFlight = getPreFlightData();
        }

        // This is just a post-flight submission
        if (options.isPostFlight) {
            updateData.postFlight = getPostFlightData();
        }
        
        try {
            const isPostFlightFilled = Number(postFlightHobbs) > 0 && Number(postFlightTacho) > 0;
            const finalStatus = isPostFlightFilled ? 'Completed' : (updateData.status || existingBooking.status);
            updateData.status = finalStatus;

            await updateBooking(firestore, tenantId, existingBooking.id, updateData, aircraft.id, isPostFlightFilled);
            
            if (options.isPreFlight) {
                toast({ title: 'Pre-Flight Submitted', description: `Booking #${existingBooking.bookingNumber} is ready for flight.` });
            } else if (options.isPostFlight) {
                 toast({ title: 'Post-Flight Submitted', description: 'Aircraft is now ready for the next booking.' });
            } else {
                 toast({ title: 'Booking Updated', description: `Booking #${existingBooking.bookingNumber} has been updated.` });
            }

        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
            return; // Stop execution if update fails
        }

    } else {
        // --- CREATE LOGIC ---
        const bookingData: any = {
            aircraftId: aircraft.id,
            pilotId,
            type: bookingType as Booking['type'],
            startTime: parsedStartTime,
            endTime: parsedEndTime,
        };
        
        if (instructorId) {
            bookingData.instructorId = instructorId;
        }

        try {
            await createBooking(firestore, tenantId, bookingData);
            toast({ title: 'Booking Created', description: 'The new booking has been saved successfully.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Creation Failed', description: error.message });
            return; // Stop execution if create fails
        }
    }

    if (options.closeOnSave) {
      setIsOpen(false);
    }
  };
  
  const handleDelete = async () => {
    if (!firestore || !existingBooking) return;
    try {
        await deleteBooking(firestore, tenantId, existingBooking.id);
        toast({ title: 'Booking Deleted', description: `Booking #${existingBooking.bookingNumber} has been deleted.` });
        setIsOpen(false);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: error.message });
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
                                <Select onValueChange={v => setBookingType(v as Booking['type'])} value={bookingType}>
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
                                        <Select onValueChange={setPilotId} value={pilotId}>
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
                                        <Select onValueChange={setInstructorId} value={instructorId}>
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
                                     <Select onValueChange={setPilotId} value={pilotId}>
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
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="end-time">End Time</Label>
                                <Input 
                                    id="end-time" 
                                    type="time" 
                                    value={endTimeValue}
                                    onChange={(e) => setEndTimeValue(e.target.value)}
                                />
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                {isEditMode && (
                    <>
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
                                        <Input id="actual-hobbs" type="number" value={preFlightHobbs} onChange={(e) => setPreFlightHobbs(e.target.value)} disabled={preflightDisabled} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="actual-tacho">Actual Tacho</Label>
                                        <Input id="actual-tacho" type="number" value={preFlightTacho} onChange={(e) => setPreFlightTacho(e.target.value)} disabled={preflightDisabled} />
                                    </div>
                                </div>

                                <div className="col-span-2 mt-4 space-y-4">
                                  {aircraft.type === 'Single-Engine' && (
                                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                          <div className="space-y-2">
                                              <Label htmlFor="oil">Oil</Label>
                                              <Input id="oil" type="number" value={preFlightOil} onChange={(e) => setPreFlightOil(e.target.value)} disabled={preflightDisabled} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="fuel">Fuel</Label>
                                              <Input id="fuel" type="number" value={preFlightFuel} onChange={(e) => setPreFlightFuel(e.target.value)} disabled={preflightDisabled} />
                                          </div>
                                      </div>
                                  )}
                                  {aircraft.type === 'Multi-Engine' && (
                                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                          <div className="space-y-2">
                                              <Label htmlFor="fuel">Fuel</Label>
                                              <Input id="fuel" type="number" value={preFlightFuel} onChange={(e) => setPreFlightFuel(e.target.value)} disabled={preflightDisabled} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="oil-left">Oil Left</Label>
                                              <Input id="oil-left" type="number" value={preFlightOilLeft} onChange={(e) => setPreFlightOilLeft(e.target.value)} disabled={preflightDisabled} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="oil-right">Oil Right</Label>
                                              <Input id="oil-right" type="number" value={preFlightOilRight} onChange={(e) => setPreFlightOilRight(e.target.value)} disabled={preflightDisabled} />
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
                                                    disabled={preflightDisabled}
                                                />
                                                <Label htmlFor={doc.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                    {doc.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {isEditMode && 
                                    <div className="flex justify-end pt-4">
                                        <Button onClick={() => handleSave({ closeOnSave: false, isPreFlight: true })} disabled={preflightDisabled}>Submit Pre-Flight</Button>
                                    </div>
                                }
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
                                        <Input id="post-actual-hobbs" type="number" value={postFlightHobbs} onChange={(e) => setPostFlightHobbs(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="post-actual-tacho">Actual Tacho</Label>
                                        <Input id="post-actual-tacho" type="number" value={postFlightTacho} onChange={(e) => setPostFlightTacho(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                    </div>
                                </div>
                                 <div className="col-span-2 mt-4 space-y-4">
                                  {aircraft.type === 'Single-Engine' && (
                                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                          <div className="space-y-2">
                                              <Label htmlFor="post-flight-oil">Oil</Label>
                                              <Input id="post-flight-oil" type="number" value={postFlightOil} onChange={(e) => setPostFlightOil(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="post-flight-fuel">Fuel</Label>
                                              <Input id="post-flight-fuel" type="number" value={postFlightFuel} onChange={(e) => setPostFlightFuel(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                          </div>
                                      </div>
                                  )}
                                  {aircraft.type === 'Multi-Engine' && (
                                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                          <div className="space-y-2">
                                              <Label htmlFor="post-flight-fuel">Fuel</Label>
                                              <Input id="post-flight-fuel" type="number" value={postFlightFuel} onChange={(e) => setPostFlightFuel(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="post-flight-oil-left">Oil Left</Label>
                                              <Input id="post-flight-oil-left" type="number" value={postFlightOilLeft} onChange={(e) => setPostFlightOilLeft(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                          </div>
                                          <div className="space-y-2">
                                              <Label htmlFor="post-flight-oil-right">Oil Right</Label>
                                              <Input id="post-flight-oil-right" type="number" value={postFlightOilRight} onChange={(e) => setPostFlightOilRight(e.target.value)} disabled={!isEditMode || preflightDisabled} />
                                          </div>
                                      </div>
                                  )}
                              </div>
                              {isEditMode &&
                                <div className="flex justify-end pt-4">
                                    <Button onClick={() => handleSave({ closeOnSave: false, isPostFlight: true })} disabled={!isEditMode || preflightDisabled}>Submit Post-Flight</Button>
                                </div>
                              }
                            </CollapsibleContent>
                        </Collapsible>
                    </>
                )}
            </div>
        </ScrollArea>
        <DialogFooter className='justify-between pt-6'>
          {isEditMode ? (
              <AlertDialog>
                  <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-20" disabled={!isEditMode}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                      </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                      <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete booking #{existingBooking?.bookingNumber}.
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDelete} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
                              Delete Booking
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>
          ) : (
            <div></div> // Placeholder for layout
          )}
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
