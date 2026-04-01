
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { Personnel } from '../../users/personnel/page';
import type { ComplianceRequirement } from '@/types/quality';

const formSchema = z.object({
    regulationFamily: z.enum(['sacaa-cars', 'sacaa-cats', 'ohs']).optional(),
    parentRegulationCode: z.string().optional(),
    regulationCode: z.string().min(1, 'Code is required.'),
    regulationStatement: z.string().min(1, 'Statement is required.'),
    technicalStandard: z.string().optional(),
    companyReference: z.string().min(1, 'Reference is required.'),
    responsibleManagerId: z.string().optional(),
    nextAuditDate: z.date().optional(),
    organizationId: z.string().nullable().optional(),
});

const headerFormSchema = z.object({
    regulationFamily: z.enum(['sacaa-cars', 'sacaa-cats', 'ohs']),
    regulationCode: z.string().min(1, 'Code is required.'),
});

type FormValues = z.infer<typeof formSchema>;
type HeaderFormValues = z.infer<typeof headerFormSchema>;

interface ComplianceItemFormProps {
    personnel: Personnel[];
    existingItem?: ComplianceRequirement | null;
    onFormSubmit: () => void;
    tenantId: string;
    defaultRegulationFamily?: 'sacaa-cars' | 'sacaa-cats' | 'ohs';
    availableParentHeaders?: { code: string; label: string }[];
    mode?: 'item' | 'header';
}

export function ComplianceItemForm({ personnel, existingItem, onFormSubmit, tenantId, defaultRegulationFamily, availableParentHeaders = [], mode = 'item' }: ComplianceItemFormProps) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const topLevelHeaderValue = '__top_level__';

    const form = useForm<FormValues>({
        resolver: zodResolver(mode === 'header' ? headerFormSchema : formSchema),
        defaultValues: {
            regulationFamily: existingItem?.regulationFamily || defaultRegulationFamily || 'sacaa-cars',
            parentRegulationCode: existingItem?.parentRegulationCode || '',
            regulationCode: existingItem?.regulationCode || '',
            regulationStatement: existingItem?.regulationStatement || '',
            technicalStandard: existingItem?.technicalStandard || '',
            companyReference: existingItem?.companyReference || '',
            responsibleManagerId: existingItem?.responsibleManagerId || '',
            nextAuditDate: existingItem?.nextAuditDate ? new Date(existingItem.nextAuditDate) : undefined,
            organizationId: existingItem?.organizationId || null,
        },
    });

    const onSubmit = async (values: FormValues) => {
        if (!firestore) return;
        
        const dataToSave = mode === 'header'
            ? {
                regulationFamily: values.regulationFamily,
                parentRegulationCode: '',
                regulationCode: values.regulationCode,
                regulationStatement: values.regulationCode,
                technicalStandard: '',
                companyReference: '',
                responsibleManagerId: '',
                nextAuditDate: null,
                organizationId: null,
            }
            : {
                ...values,
                nextAuditDate: values.nextAuditDate ? values.nextAuditDate.toISOString() : null,
            };

        if (existingItem) {
            const docRef = doc(firestore, `tenants/${tenantId}/compliance-matrix`, existingItem.id);
            await updateDocumentNonBlocking(docRef, dataToSave);
            toast({ title: "Success", description: "Compliance item updated." });
        } else {
            const collectionRef = collection(firestore, `tenants/${tenantId}/compliance-matrix`);
            await addDocumentNonBlocking(collectionRef, dataToSave);
            toast({ title: "Success", description: "New compliance item added." });
        }
        onFormSubmit();
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="regulationCode" render={({ field }) => ( <FormItem><FormLabel>Regulation Code</FormLabel><FormControl><Input placeholder="e.g., 141.02.2" {...field} /></FormControl><FormMessage /></FormItem> )} />
                {mode === 'item' ? (
                    <>
                        <FormField control={form.control} name="regulationFamily" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Category</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || defaultRegulationFamily || 'sacaa-cars'}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="sacaa-cars">SACAA CARs</SelectItem>
                                        <SelectItem value="sacaa-cats">SACAA CATs</SelectItem>
                                        <SelectItem value="ohs">OHS</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="parentRegulationCode" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Parent Header</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(value === topLevelHeaderValue ? '' : value)}
                                    defaultValue={field.value || topLevelHeaderValue}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Top-level header" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value={topLevelHeaderValue}>Top-level header</SelectItem>
                                        {availableParentHeaders.map((header) => (
                                            <SelectItem key={header.code} value={header.code}>
                                                {header.code} - {header.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="regulationStatement" render={({ field }) => ( <FormItem><FormLabel>Regulation Statement</FormLabel><FormControl><Input placeholder="The short title of the regulation..." {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="technicalStandard" render={({ field }) => ( <FormItem><FormLabel>Full Regulation Text</FormLabel><FormControl><Textarea placeholder="The full, detailed text of the regulation..." {...field} className="min-h-32" /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="companyReference" render={({ field }) => ( <FormItem><FormLabel>Company Reference</FormLabel><FormControl><Input placeholder="e.g., Ops Manual, Sec 4.2.1" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="responsibleManagerId" render={({ field }) => ( <FormItem><FormLabel>Responsible Manager</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a manager" /></SelectTrigger></FormControl><SelectContent>{personnel.map(p => (<SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="nextAuditDate" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Next Audit Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><CustomCalendar selectedDate={field.value} onDateSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                    </>
                ) : null}
                {mode === 'header' ? (
                    <FormField control={form.control} name="regulationFamily" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || defaultRegulationFamily || 'sacaa-cars'}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="sacaa-cars">SACAA CARs</SelectItem>
                                    <SelectItem value="sacaa-cats">SACAA CATs</SelectItem>
                                    <SelectItem value="ohs">OHS</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                ) : null}
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onFormSubmit}>Cancel</Button>
                    <Button type="submit">Save</Button>
                </div>
            </form>
        </Form>
    );
}
