'use client';

import { use, useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Trash2, Save, User } from 'lucide-react';
import type { Booking } from '@/types/booking';
import type { PilotProfile } from '@/app/(app)/users/personnel/page';
import { SignaturePad } from '@/components/ui/signature-pad';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BackNavButton } from '@/components/back-nav-button';
import { MainPageHeader } from '@/components/page-header';

const debriefSchema = z.object({
    overallComment: z.string().min(1, "Please provide an overall comment."),
    entries: z.array(z.object({
        id: z.string(),
        exercise: z.string().min(1, "Exercise name is required."),
        rating: z.coerce.number().min(1).max(4),
        comment: z.string().optional(),
    })).min(1, "At least one exercise entry is required."),
    instructorSignatureUrl: z.string().optional(),
    studentSignatureUrl: z.string().optional(),
});

type FormValues = z.infer<typeof debriefSchema>;

function NewDebriefContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams?.get('bookingId') ?? '';
    const { toast } = useToast();
    const tenantId = 'safeviate';

    const [booking, setBooking] = useState<Booking | null>(null);
    const [student, setStudent] = useState<PilotProfile | null>(null);
    const [instructor, setInstructor] = useState<PilotProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
                const payload = await response.json().catch(() => ({}));
                const bookings = Array.isArray(payload?.bookings) ? payload.bookings : [];
                const students = Array.isArray(payload?.students) ? payload.students : [];
                const instructors = Array.isArray(payload?.instructors) ? payload.instructors : [];

                const b = bookings.find((x: Booking) => x.id === bookingId);
                if (b && !cancelled) {
                    setBooking(b);
                    setStudent(students.find((s: PilotProfile) => s.id === b.studentId) || null);
                    setInstructor(instructors.find((i: PilotProfile) => i.id === b.instructorId) || null);
                }
            } catch (e) {
                console.error('Failed to load data', e);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    const isLoadingBooking = isLoading;
    const isLoadingStudent = isLoading;
    const isLoadingInstructor = isLoading;

    const form = useForm<FormValues>({
        resolver: zodResolver(debriefSchema),
        defaultValues: {
            overallComment: '',
            entries: [{ id: uuidv4(), exercise: '', rating: 4, comment: '' }],
            instructorSignatureUrl: '',
            studentSignatureUrl: '',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "entries",
    });

    const onSubmit = async (values: FormValues) => {
        if (!booking) return;

        const debriefData = {
            ...values,
            id: crypto.randomUUID(),
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            studentId: booking.studentId,
            instructorId: booking.instructorId,
            date: new Date().toISOString(),
        };

        try {
            const response = await fetch('/api/student-training', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ report: debriefData }),
            });

            if (!response.ok) {
                throw new Error('Failed to save debrief.');
            }
            
            window.dispatchEvent(new Event('safeviate-training-updated'));
            
            toast({
                title: 'Debrief Saved',
                description: 'The training progress has been updated for this student.',
            });
            
            router.push('/bookings/history');
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to save debrief.',
            });
        }
    };

    if (isLoadingBooking || isLoadingStudent || isLoadingInstructor) {
        return (
            <div className="space-y-6 max-w-4xl mx-auto">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No booking found for this debrief.</p>
                <BackNavButton href="/bookings/history" text="Back to History" />
            </div>
        );
    }

    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
    const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown Instructor';

    return (
        <div className="space-y-6 max-w-4xl mx-auto h-full flex flex-col overflow-hidden">
            <MainPageHeader
                title="Post-Flight Instructor Debrief"
                description={`Booking #${booking.bookingNumber} · ${booking.type}`}
                actions={<BackNavButton href="/bookings/history" text="Back to History" />}
            />

            <Card className="flex-1 flex flex-col overflow-hidden shadow-none border">
                <CardHeader className="shrink-0 border-b bg-muted/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Post-Flight Instructor Debrief</CardTitle>
                            <CardDescription>
                                Booking #{booking.bookingNumber} • {booking.type}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-lg border">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Student</span>
                                <span className="text-sm font-semibold">{studentName}</span>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-muted-foreground">Instructor</span>
                                <span className="text-sm font-semibold">{instructorName}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 p-0 overflow-hidden">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <h3 className="text-lg font-semibold">Exercise Ratings</h3>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => append({ id: uuidv4(), exercise: '', rating: 4, comment: '' })}
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Exercise
                                            </Button>
                                        </div>

                                        {fields.map((field, index) => (
                                            <div key={field.id} className="p-4 border rounded-lg bg-muted/20 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <FormField 
                                                        control={form.control} 
                                                        name={`entries.${index}.exercise`} 
                                                        render={({ field }) => (
                                                            <FormItem className="md:col-span-2">
                                                                <FormLabel>Exercise / Maneuver</FormLabel>
                                                                <FormControl><Input placeholder="e.g., Steep Turns" {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} 
                                                    />
                                                    <FormField 
                                                        control={form.control} 
                                                        name={`entries.${index}.rating`} 
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Rating</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="1">1 - Unsatisfactory</SelectItem>
                                                                        <SelectItem value="2">2 - Needs Improvement</SelectItem>
                                                                        <SelectItem value="3">3 - Satisfactory</SelectItem>
                                                                        <SelectItem value="4">4 - Proficient</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} 
                                                    />
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        onClick={() => remove(index)} 
                                                        className="text-destructive"
                                                        disabled={fields.length === 1}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <FormField 
                                                    control={form.control} 
                                                    name={`entries.${index}.comment`} 
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Exercise Notes</FormLabel>
                                                            <FormControl><Textarea placeholder="Specific feedback for this exercise..." {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} 
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <Separator />

                                    <FormField 
                                        control={form.control} 
                                        name="overallComment" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-lg font-semibold">Overall Progress Comment</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        className="min-h-[120px]" 
                                                        placeholder="Summarize the overall performance and objectives for the next flight..." 
                                                        {...field} 
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} 
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-6">
                                        <FormField 
                                            control={form.control} 
                                            name="instructorSignatureUrl" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Instructor Signature</FormLabel>
                                                    <FormControl>
                                                        <SignaturePad 
                                                            onSignatureEnd={field.onChange} 
                                                            height={150} 
                                                            className="w-full"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />
                                        <FormField 
                                            control={form.control} 
                                            name="studentSignatureUrl" 
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Student Acknowledgement</FormLabel>
                                                    <FormControl>
                                                        <SignaturePad 
                                                            onSignatureEnd={field.onChange} 
                                                            height={150} 
                                                            className="w-full"
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )} 
                                        />
                                    </div>
                                </div>
                            </ScrollArea>

                            <div className="shrink-0 flex justify-end gap-4 p-6 border-t bg-muted/5">
                                <Button asChild variant="outline" type="button">
                                    <Link href="/bookings/history">Cancel</Link>
                                </Button>
                                <Button type="submit">
                                    <Save className="mr-2 h-4 w-4" /> Save Debrief
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function NewDebriefPage() {
    return (
        <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <NewDebriefContent />
        </Suspense>
    );
}
