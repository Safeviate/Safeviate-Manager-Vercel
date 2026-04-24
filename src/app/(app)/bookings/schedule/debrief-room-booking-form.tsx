'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addMinutes, isBefore, parse } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Booking } from '@/types/booking';
import type { PilotProfile, Personnel } from '@/app/(app)/users/personnel/page';

type DebriefRoomSessionType = 'Ground School' | 'Student Debrief' | 'Meeting';

type DebriefRoomBookingDraft = {
  date: Date;
  startTime: string;
  endTime: string;
  instructorId: string;
  sessionType: DebriefRoomSessionType;
  courseName: string;
  meetingType: string;
  notes: string;
  studentIds: string[];
};

const debriefRoomBookingSchema = z.object({
  date: z.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  instructorId: z.string().optional(),
  sessionType: z.enum(['Ground School', 'Student Debrief', 'Meeting']),
  courseName: z.string().optional(),
  meetingType: z.string().optional(),
  notes: z.string().optional(),
  studentIds: z.array(z.string()).default([]),
}).refine((values) => {
  const start = parse(`${format(values.date, 'yyyy-MM-dd')} ${values.startTime}`, 'yyyy-MM-dd HH:mm', new Date());
  const end = parse(`${format(values.date, 'yyyy-MM-dd')} ${values.endTime}`, 'yyyy-MM-dd HH:mm', new Date());
  return isBefore(start, end);
}, {
  message: 'End time must be after start time.',
  path: ['endTime'],
});

interface DebriefRoomBookingFormProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  tenantId: string;
  date: Date;
  startTime: Date;
  roomId: string;
  roomName: string;
  pilots: (PilotProfile | Personnel)[];
  students: (PilotProfile | Personnel)[];
  existingBooking?: Booking;
  refreshBookings: () => void;
}

export function DebriefRoomBookingForm({
  isOpen,
  setIsOpen,
  tenantId,
  date,
  startTime,
  roomId,
  roomName,
  pilots,
  students,
  existingBooking,
  refreshBookings,
}: DebriefRoomBookingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const instructors = useMemo(() => pilots.filter((person) => person.canBeInstructor || person.userType === 'Instructor'), [pilots]);
  const defaultValues = useMemo<DebriefRoomBookingDraft>(() => ({
    date,
    startTime: existingBooking?.startTime || format(startTime, 'HH:mm'),
    endTime: existingBooking?.endTime || format(addMinutes(startTime, 60), 'HH:mm'),
    instructorId: existingBooking?.instructorId || '',
    sessionType: (existingBooking?.sessionType as DebriefRoomSessionType) || 'Ground School',
    courseName: existingBooking?.courseName || existingBooking?.notes || '',
    meetingType: existingBooking?.meetingType || '',
    notes: existingBooking?.notes || '',
    studentIds: Array.isArray(existingBooking?.studentIds) ? existingBooking.studentIds : existingBooking?.studentId ? [existingBooking.studentId] : [],
  }), [date, existingBooking, startTime]);

  const form = useForm<z.infer<typeof debriefRoomBookingSchema>>({
    resolver: zodResolver(debriefRoomBookingSchema),
    defaultValues,
  });

  const watchSessionType = form.watch('sessionType');
  const selectedStudentIds = form.watch('studentIds') || [];

  useEffect(() => {
    if (!isOpen) return;
    form.reset(defaultValues);
  }, [defaultValues, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof debriefRoomBookingSchema>) => {
    setIsSubmitting(true);
    try {
      const startIso = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.startTime}`).toISOString();
      const endIso = new Date(`${format(values.date, 'yyyy-MM-dd')}T${values.endTime}`).toISOString();

      const bookingPayload: Booking = {
        ...(existingBooking || {}),
        id: existingBooking?.id || crypto.randomUUID(),
        bookingNumber: existingBooking?.bookingNumber || '',
        type: values.sessionType,
        date: format(values.date, 'yyyy-MM-dd'),
        start: startIso,
        end: endIso,
        startTime: values.startTime,
        endTime: values.endTime,
        aircraftId: existingBooking?.aircraftId || '',
        briefingRoomId: roomId,
        briefingRoomName: roomName,
        sessionType: values.sessionType,
        courseName: values.sessionType === 'Ground School' ? values.courseName?.trim() || '' : undefined,
        meetingType:
          values.sessionType === 'Meeting'
            ? ((values.meetingType as Booking['meetingType']) || undefined)
            : undefined,
        notes: values.notes?.trim() || undefined,
        instructorId: values.instructorId && values.instructorId !== 'unassigned' ? values.instructorId : undefined,
        studentIds: values.studentIds,
        studentId: values.studentIds[0] || undefined,
        status: existingBooking?.status || 'Confirmed',
        preFlight: false,
        postFlight: false,
      };

      const method = existingBooking ? 'PUT' : 'POST';
      const response = await fetch('/api/bookings', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking: bookingPayload }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to save room booking.');
      }

      refreshBookings();
      setIsOpen(false);
      toast({
        title: existingBooking ? 'Room Booking Updated' : 'Room Booking Saved',
        description: `${roomName} has been scheduled for ${values.sessionType.toLowerCase()}.`,
      });
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save room booking.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="flex h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[720px] min-h-0 flex-col overflow-hidden p-4 sm:h-auto sm:w-full sm:p-6">
        <DialogHeader className="space-y-1 pb-2">
          <DialogTitle className="text-base font-black uppercase tracking-tight sm:text-lg">
            {existingBooking ? 'Edit Room Booking' : 'Book Briefing Room'}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Schedule {roomName} for ground school, student debriefs, or meetings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain pr-1 pb-24">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-xl border bg-muted/5 px-2.5 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Briefing Room</p>
                <p className="mt-1 text-sm font-bold leading-tight">{roomName}</p>
              </div>
              <div className="rounded-xl border bg-muted/5 px-2.5 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Date</p>
                <p className="mt-1 text-sm font-bold leading-tight">{format(date, 'PPP')}</p>
              </div>
              <div className="rounded-xl border bg-muted/5 px-2.5 py-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Time</p>
                <p className="mt-1 text-sm font-bold leading-tight">
                  {form.watch('startTime')} - {form.watch('endTime')}
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sessionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest">Session Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose session type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ground School">Ground School</SelectItem>
                          <SelectItem value="Student Debrief">Student Debrief</SelectItem>
                          <SelectItem value="Meeting">Meeting</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest">Instructor</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select instructor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {instructors.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.firstName} {person.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchSessionType === 'Ground School' ? (
              <FormField
                control={form.control}
                name="courseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest">Ground School Course</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Radio Procedures, Air Law, Meteorology" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            {watchSessionType === 'Meeting' ? (
              <FormField
                control={form.control}
                name="meetingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest">Meeting Type</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Choose meeting type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Instructor Meeting">Instructor Meeting</SelectItem>
                          <SelectItem value="Safety Meeting">Safety Meeting</SelectItem>
                          <SelectItem value="Staff Meeting">Staff Meeting</SelectItem>
                          <SelectItem value="Student Meeting">Student Meeting</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="studentIds"
                render={() => (
                  <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase tracking-widest">Students Attending</FormLabel>
                  <FormControl>
                    <ScrollArea className="h-28 rounded-xl border bg-muted/5 p-2 sm:h-40">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {students.length > 0 ? (
                          students.map((student) => {
                            const checked = selectedStudentIds.includes(student.id);
                            return (
                              <label
                                key={student.id}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors',
                                  checked ? 'border-foreground bg-foreground/5' : 'border-input bg-background'
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => {
                                    const next = value
                                      ? Array.from(new Set([...selectedStudentIds, student.id]))
                                      : selectedStudentIds.filter((id) => id !== student.id);
                                    form.setValue('studentIds', next, { shouldDirty: true, shouldValidate: true });
                                  }}
                                />
                                <span className="min-w-0 truncate font-medium">
                                  {student.firstName} {student.lastName}
                                </span>
                              </label>
                            );
                          })
                        ) : (
                        <div className="col-span-full py-4 text-center text-sm text-muted-foreground">
                            No students available.
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest">Start Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[9px] font-black uppercase tracking-widest">End Time</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" className="h-9" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[9px] font-black uppercase tracking-widest">Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Optional room notes or briefing points." className="min-h-[72px]" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                )}
              />
            </div>

            <div className="sticky bottom-0 z-10 mt-auto flex items-center justify-between gap-3 border-t bg-background/95 pt-3 backdrop-blur sm:static sm:z-auto sm:bg-transparent sm:pt-4">
              <Badge variant="outline" className="text-[10px] font-black uppercase">
                {selectedStudentIds.length} student{selectedStudentIds.length === 1 ? '' : 's'}
              </Badge>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : existingBooking ? 'Update Booking' : 'Save Booking'}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
