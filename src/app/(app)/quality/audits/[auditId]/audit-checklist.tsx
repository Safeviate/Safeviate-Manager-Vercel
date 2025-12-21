'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CustomCalendar } from '@/components/ui/custom-calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { QualityAudit, QualityAuditChecklistTemplate, QualityFinding, AuditFinding, ChecklistSection, AuditChecklistItem } from '@/types/quality';

type EnrichedAudit = QualityAudit & { template: QualityAuditChecklistTemplate };

interface AuditChecklistProps {
  audit: EnrichedAudit;
  tenantId: string;
}

const findingSchema = z.object({
  checklistItemId: z.string(),
  finding: z.enum(['Compliant', 'Non Compliant', 'Observation', 'Not Applicable']),
  comment: z.string().optional(),
  level: z.string().optional(),
  // Add other finding fields as needed (e.g., evidence)
});

const formSchema = z.object({
  findings: z.array(findingSchema),
});

type FormValues = z.infer<typeof formSchema>;

export function AuditChecklist({ audit, tenantId }: AuditChecklistProps) {
    const firestore = useFirestore();
    const { toast } = useToast();

    const allChecklistItems = audit.template.sections.flatMap(section => section.items);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            findings: allChecklistItems.map(item => {
                const existingFinding = audit.findings.find(f => f.checklistItemId === item.id);
                return existingFinding || { checklistItemId: item.id, finding: 'Compliant' };
            })
        },
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: 'findings',
        keyName: 'formId' // Use a different key name to avoid conflict with item.id
    });

    const onSubmit = (values: FormValues) => {
        if (!firestore) return;

        const auditRef = doc(firestore, `tenants/${tenantId}/quality-audits`, audit.id);

        const filledFindings = values.findings.filter(f => f.finding);

        updateDocumentNonBlocking(auditRef, { findings: filledFindings });
        toast({ title: "Findings Saved", description: "Your audit findings have been saved." });
    };

    const renderChecklistItem = (section: ChecklistSection, item: AuditChecklistItem) => {
        const itemIndex = form.getValues('findings').findIndex(f => f.checklistItemId === item.id);
        if (itemIndex === -1) return null; // Should not happen with defaultValues setup

        const findingType = form.watch(`findings.${itemIndex}.finding`);

        return (
            <Card key={item.id} className="mb-4">
                <CardHeader>
                    <CardTitle className="text-base">{item.text}</CardTitle>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name={`findings.${itemIndex}.finding`}
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-wrap gap-4"
                                    >
                                        {(['Compliant', 'Non Compliant', 'Observation', 'Not Applicable'] as AuditFinding[]).map(value => (
                                            <FormItem key={value} className="flex items-center space-x-2 space-y-0">
                                                <FormControl>
                                                    <RadioGroupItem value={value} />
                                                </FormControl>
                                                <FormLabel className="font-normal">{value}</FormLabel>
                                            </FormItem>
                                        ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {(findingType === 'Non Compliant' || findingType === 'Observation') && (
                         <div className="mt-4 space-y-4 border-t pt-4">
                            <FormField
                                control={form.control}
                                name={`findings.${itemIndex}.comment`}
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Comment / Details</FormLabel>
                                    <FormControl>
                                    <Textarea placeholder="Provide details about the finding..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             {findingType === 'Non Compliant' && (
                                <FormField
                                    control={form.control}
                                    name={`findings.${itemIndex}.level`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Finding Level</FormLabel>
                                        <FormControl>
                                        <Input placeholder="e.g., Level 1, Level 2" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}
                         </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {audit.template.sections.map((section) => (
                    <div key={section.id}>
                        <h2 className="text-xl font-semibold mt-8 mb-4 border-b pb-2">{section.title}</h2>
                        {section.items.map(item => renderChecklistItem(section, item))}
                    </div>
                ))}
                <div className="flex justify-end sticky bottom-0 py-4 bg-background z-10">
                    <Button type="submit">Save Findings</Button>
                </div>
            </form>
        </Form>
    );
}
