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
import { ChevronsUpDown } from 'lucide-react';
import type { Aircraft } from '../../assets/page';
import type { PilotProfile } from '../../users/personnel/page';
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
import { format, addHours, set } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


interface BookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  aircraft: Aircraft;
  startTime: Date;
  tenantId: string;
  pilots: PilotProfile[];
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
}: BookingFormProps) {
  const [isBookingInfoOpen, setIsBookingInfoOpen] = useState(true);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [isPostFlightOpen, setIsPostFlightOpen] = useState(false);
  
  const [bookingType, setBookingType] = useState('');
  const [startTimeValue, setStartTimeValue] = useState('');
  const [endTimeValue, setEndTimeValue] = useState('');

  const [isOvernight, setIsOvernight] = useState(false);
  const [returnStartTimeValue, setReturnStartTimeValue] = useState('00:00');
  const [returnEndTimeValue, setReturnEndTimeValue] = useState('01:00');
  const [originalEndTime, setOriginalEndTime] = useState('');

  const [actualHobbs, setActualHobbs] = useState<number | string>('');
  const [actualTacho, setActualTacho] = useState<number | string>('');

  const [postFlightActualHobbs, setPostFlightActualHobbs] = useState<number | string>('');
  const [postFlightActualTacho, setPostFlightActualTacho] = useState<number | string>('');

  const [oil, setOil] = useState('');
  const [fuel, setFuel] = useState('');
  const [oilLeft, setOilLeft] = useState('');
  const [oilRight, setOilRight] = useState('');
  
  const [postFlightOil, setPostFlightOil] = useState('');
  const [postFlightFuel, setPostFlightFuel] = useState('');
  const [postFlightOilLeft, setPostFlightOilLeft] = useState('');
  const [postFlightOilRight, setPostFlightOilRight] = useState('');

  useEffect(() => {
    if (startTime) {
      const formattedStartTime = format(startTime, 'HH:mm');
      const endTimeDate = addHours(startTime, 1);
      const formattedEndTime = format(endTimeDate, 'HH:mm');

      setStartTimeValue(formattedStartTime);
      setEndTimeValue(formattedEndTime);
      setOriginalEndTime(formattedEndTime); // Store the original end time
    }
  }, [startTime]);

  useEffect(() => {
    if (isOvernight) {
      setEndTimeValue('23:59');
      setReturnStartTimeValue('00:00');
      setReturnEndTimeValue('01:00');
    } else {
      // Revert to original end time when switch is turned off
      setEndTimeValue(originalEndTime);
    }
  }, [isOvernight, originalEndTime]);

  useEffect(() => {
    if (aircraft) {
        setActualHobbs(aircraft.currentHobbs || '');
        setActualTacho(aircraft.currentTacho || '');
    }
  }, [aircraft]);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      // Reset form or state if needed when dialog closes
      setIsOvernight(false); // Also reset overnight switch on close
    }
    setIsOpen(open);
  };
  
  const students = useMemo(() => pilots.filter(p => p.userType === 'Student'), [pilots]);
  const instructors = useMemo(() => pilots.filter(p => p.userType === 'Instructor'), [pilots]);
  const privatePilots = useMemo(() => pilots.filter(p => p.userType === 'Private Pilot'), [pilots]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Booking</DialogTitle>
          <DialogDescription>
            Create a new booking for {aircraft.tailNumber} on {format(startTime, 'PPP')}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
            <div className="grid gap-4 py-4">
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
                                <Select onValueChange={setBookingType} value={bookingType}>
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
                                        <Select>
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
                                        <Select>
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
                                    <Select>
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
                                    readOnly={isOvernight}
                                />
                            </div>

                            <div className="col-span-2 flex items-center space-x-2 pt-2">
                                <Switch id="overnight-mode" checked={isOvernight} onCheckedChange={setIsOvernight} />
                                <Label htmlFor="overnight-mode">Overnight</Label>
                            </div>
                            
                            {isOvernight && (
                                <div className="col-span-2 space-y-4 pt-2">
                                    <Separator />
                                    <h4 className="text-sm font-semibold">Return Details</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="return-start-time">Start Time</Label>
                                            <Input
                                                id="return-start-time"
                                                type="time"
                                                value={returnStartTimeValue}
                                                readOnly
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="return-end-time">End Time</Label>
                                            <Input
                                                id="return-end-time"
                                                type="time"
                                                value={returnEndTimeValue}
                                                onChange={(e) => setReturnEndTimeValue(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isPreFlightOpen} onOpenChange={setIsPreFlightOpen} className="space-y-2">
                    <CollapsibleTrigger asChild>
                        <div className='flex items-center justify-between border-b pb-2 cursor-pointer'>
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
                                <Input 
                                    id="current-hobbs" 
                                    value={aircraft?.currentHobbs || ''} 
                                    readOnly 
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="current-tacho">Current Tacho</Label>
                                <Input 
                                    id="current-tacho" 
                                    value={aircraft?.currentTacho || ''} 
                                    readOnly 
                                    disabled
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actual-hobbs">Actual Hobbs</Label>
                                <Input 
                                    id="actual-hobbs"
                                    type="number"
                                    value={actualHobbs}
                                    onChange={(e) => setActualHobbs(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="actual-tacho">Actual Tacho</Label>
                                <Input 
                                    id="actual-tacho" 
                                    type="number"
                                    value={actualTacho}
                                    onChange={(e) => setActualTacho(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="col-span-2 mt-4 space-y-4">
                          {aircraft.type === 'Single-Engine' && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="oil">Oil</Label>
                                      <Input id="oil" value={oil} onChange={(e) => setOil(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="fuel">Fuel</Label>
                                      <Input id="fuel" value={fuel} onChange={(e) => setFuel(e.target.value)} />
                                  </div>
                              </div>
                          )}
                          {aircraft.type === 'Multi-Engine' && (
                              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="fuel">Fuel</Label>
                                      <Input id="fuel" value={fuel} onChange={(e) => setFuel(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="oil-left">Oil Left</Label>
                                      <Input id="oil-left" value={oilLeft} onChange={(e) => setOilLeft(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="oil-right">Oil Right</Label>
                                      <Input id="oil-right" value={oilRight} onChange={(e) => setOilRight(e.target.value)} />
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
                                        <Checkbox id={doc.id} />
                                        <Label htmlFor={doc.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            {doc.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>

                <Collapsible open={isPostFlightOpen} onOpenChange={setIsPostFlightOpen} className="space-y-2">
                    <CollapsibleTrigger asChild>
                        <div className='flex items-center justify-between border-b pb-2 cursor-pointer'>
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
                                <Input 
                                    id="post-actual-hobbs"
                                    type="number"
                                    value={postFlightActualHobbs}
                                    onChange={(e) => setPostFlightActualHobbs(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="post-actual-tacho">Actual Tacho</Label>
                                <Input 
                                    id="post-actual-tacho" 
                                    type="number"
                                    value={postFlightActualTacho}
                                    onChange={(e) => setPostFlightActualTacho(e.target.value)}
                                />
                            </div>
                        </div>
                         <div className="col-span-2 mt-4 space-y-4">
                          {aircraft.type === 'Single-Engine' && (
                              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-oil">Oil</Label>
                                      <Input id="post-flight-oil" value={postFlightOil} onChange={(e) => setPostFlightOil(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-fuel">Fuel</Label>
                                      <Input id="post-flight-fuel" value={postFlightFuel} onChange={(e) => setPostFlightFuel(e.target.value)} />
                                  </div>
                              </div>
                          )}
                          {aircraft.type === 'Multi-Engine' && (
                              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-fuel">Fuel</Label>
                                      <Input id="post-flight-fuel" value={postFlightFuel} onChange={(e) => setPostFlightFuel(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-oil-left">Oil Left</Label>
                                      <Input id="post-flight-oil-left" value={postFlightOilLeft} onChange={(e) => setPostFlightOilLeft(e.target.value)} />
                                  </div>
                                  <div className="space-y-2">
                                      <Label htmlFor="post-flight-oil-right">Oil Right</Label>
                                      <Input id="post-flight-oil-right" value={postFlightOilRight} onChange={(e) => setPostFlightOilRight(e.target.value)} />
                                  </div>
                              </div>
                          )}
                      </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </ScrollArea>
        <DialogFooter className='justify-between pt-6'>
            <Button variant="destructive" className="w-20">
                Delete
            </Button>
            <div className='flex gap-2'>
                <DialogClose asChild>
                    <Button variant="outline" className="w-20">Cancel</Button>
                </DialogClose>
                <Button className="w-20">Save</Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
