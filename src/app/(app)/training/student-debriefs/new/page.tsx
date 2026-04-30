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
import { DEFAULT_TRAINING_COMPETENCY_KEY, TRAINING_COMPETENCY_OPTIONS } from '@/lib/training-competencies';

const RATING_GUIDE = [
    { value: '1', label: 'Unsafe', hint: 'Instructor intervention required immediately.' },
    { value: '2', label: 'Significant Support Needed', hint: 'Heavy prompting or corrective input required.' },
    { value: '3', label: 'Acceptable With Coaching', hint: 'Safe enough to continue, but still needs active coaching.' },
    { value: '4', label: 'Competent', hint: 'Meets standard with only light instructor input.' },
    { value: '5', label: 'Strong / Independent', hint: 'Confident, disciplined, and largely self-directed.' },
] as const;

const debriefSchema = z.object({
    overallComment: z.string().min(1, "Please provide an overall comment."),
    entries: z.array(z.object({
        id: z.string(),
        exercise: z.string().min(1, "Exercise name is required."),
        rating: z.coerce.number().min(1).max(5),
        comment: z.string().optional(),
        competencyKey: z.string().optional(),
        competencySignal: z.enum(['strength', 'growth', 'watch']).optional(),
    })).min(1, "At least one exercise entry is required."),
    instructorSignatureUrl: z.string().optional(),
    studentSignatureUrl: z.string().optional(),
});

type FormValues = z.infer<typeof debriefSchema>;

function NewDebriefContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const bookingId = searchParams?.get('bookingId') ?? '';
    const bookingNumber = searchParams?.get('bookingNumber') ?? '';
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

                const b = bookings.find((x: Booking) => x.id === bookingId || (bookingNumber && x.bookingNumber === bookingNumber));
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
    }, [bookingId, bookingNumber]);

    const isLoadingBooking = isLoading;
    const isLoadingStudent = isLoading;
    const isLoadingInstructor = isLoading;

    const form = useForm<FormValues>({
        resolver: zodResolver(debriefSchema),
        defaultValues: {
            overallComment: '',
            entries: [{ id: uuidv4(), exercise: '', rating: 4, comment: '', competencyKey: DEFAULT_TRAINING_COMPETENCY_KEY, competencySignal: 'growth' }],
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
            <div className="space-y-6 max-w-4xl mx-auto h-full min-h-0 overflow-hidden">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="text-center py-12 h-full min-h-0 overflow-hidden">
                <p className="text-muted-foreground mb-4">No booking found for this debrief.</p>
                <BackNavButton href="/bookings/history" text="Back to History" />
            </div>
        );
    }

    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Unknown Student';
    const instructorName = instructor ? `${instructor.firstName} ${instructor.lastName}` : 'Unknown Instructor';

    return (
        <div className="space-y-6 max-w-4xl mx-auto h-full min-h-0 flex flex-col overflow-hidden">
            <MainPageHeader
                title="Post-Flight Instructor Debrief"
                description={`Booking #${booking.bookingNumber} · ${booking.type}`}
                actions={<BackNavButton href="/bookings/history" text="Back to History" />}
            />

            <Card className="flex-1 min-h-0 flex flex-col overflow-hidden shadow-none border">
                <CardHeader className="shrink-0 border-b bg-muted/5 px-5 py-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Post-Flight Instructor Debrief</CardTitle>
                            <CardDescription>
                                Booking #{booking.bookingNumber} • {booking.type}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black tracking-[0.12em] text-muted-foreground">Student</span>
                                <span className="text-sm font-semibold">{studentName}</span>
                            </div>
                            <Separator orientation="vertical" className="h-8" />
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black tracking-[0.12em] text-muted-foreground">Instructor</span>
                                <span className="text-sm font-semibold">{instructorName}</span>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="h-full flex flex-col">
                            <ScrollArea className="flex-1 p-6">
                                <div className="space-y-8">
                                    <div className="rounded-xl border bg-muted/5 p-4 space-y-4">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-black uppercase tracking-[0.08em]">Instructor Assessment Guide</h3>
                                            <p className="text-sm text-muted-foreground">
                                                Rate what the student or higher-rated pilot actually demonstrated on this flight, then tag the main competency being assessed.
                                            </p>
                                        </div>
                                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                            {RATING_GUIDE.map((item) => (
                                                <div key={item.value} className="rounded-lg border bg-background p-3">
                                                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Rating {item.value}</p>
                                                    <p className="mt-1 text-sm font-semibold">{item.label}</p>
                                                    <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <h3 className="text-lg font-semibold">Assessment Entries</h3>
                                                <p className="text-sm text-muted-foreground">Log each observed exercise, competency, and instructor signal from the flight.</p>
                                            </div>
                                            <Button 
                                                type="button" 
                                                variant="outline" 
                                                size="sm" 
                                                onClick={() => append({ id: uuidv4(), exercise: '', rating: 4, comment: '', competencyKey: DEFAULT_TRAINING_COMPETENCY_KEY, competencySignal: 'growth' })}
                                            >
                                                <PlusCircle className="mr-2 h-4 w-4" /> Add Entry
                                            </Button>
                                        </div>

                                        {fields.map((field, index) => (
                                            <div key={field.id} className="rounded-xl border bg-background p-4 space-y-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Entry {index + 1}</p>
                                                        <p className="text-sm font-semibold">Observed competency and instructor feedback</p>
                                                    </div>
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
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                                                    <FormField 
                                                        control={form.control} 
                                                        name={`entries.${index}.exercise`} 
                                                        render={({ field }) => (
                                                            <FormItem className="md:col-span-2">
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Exercise / Observation</FormLabel>
                                                                <FormControl><Input placeholder="e.g., Circuit rejoin, general handling, arrival and landing" {...field} /></FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} 
                                                    />
                                                    <FormField 
                                                        control={form.control} 
                                                        name={`entries.${index}.rating`} 
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Rating</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="1">1 - Unsafe</SelectItem>
                                                                        <SelectItem value="2">2 - Significant Support Needed</SelectItem>
                                                                        <SelectItem value="3">3 - Acceptable With Coaching</SelectItem>
                                                                        <SelectItem value="4">4 - Competent</SelectItem>
                                                                        <SelectItem value="5">5 - Strong / Independent</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} 
                                                    />
                                                    <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                                        Use the guide above
                                                    </div>
                                                </div>
                                                <FormField 
                                                    control={form.control} 
                                                    name={`entries.${index}.comment`} 
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Instructor Notes</FormLabel>
                                                            <FormControl><Textarea placeholder="What went well, what needed intervention, and what should be reinforced next flight..." {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} 
                                                />

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`entries.${index}.competencyKey`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Competency Area</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value || DEFAULT_TRAINING_COMPETENCY_KEY}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select area" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {TRAINING_COMPETENCY_OPTIONS.map((option) => (
                                                                            <SelectItem key={option.value} value={option.value}>
                                                                                {option.label}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />

                                                    <FormField
                                                        control={form.control}
                                                        name={`entries.${index}.competencySignal`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">Instructor Signal</FormLabel>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value || 'growth'}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select signal" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        <SelectItem value="strength">Strength</SelectItem>
                                                                        <SelectItem value="growth">Growth</SelectItem>
                                                                        <SelectItem value="watch">Watch</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Separator />

                                    <FormField 
                                        control={form.control} 
                                        name="overallComment" 
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-lg font-semibold">Overall Instructor Debrief</FormLabel>
                                                <FormControl>
                                                    <Textarea 
                                                        className="min-h-[120px]" 
                                                        placeholder="Summarize the student's overall performance, key risks, strengths, and the focus for the next lesson..." 
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
