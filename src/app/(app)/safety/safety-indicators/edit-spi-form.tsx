
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

export type SpiComparison = 'lower-is-better' | 'greater-is-better';
export type SpiUnit = 'Count' | 'Rate';

export type SpiConfig = {
    id: string;
    name: string;
    type?: 'Lagging' | 'Leading'; // Keep for backward compatibility if needed, but prefer comparison
    comparison: SpiComparison;
    unit: SpiUnit;
    rateFactor?: number;
    periodLabel?: string;
    description: string;
    target: number;
    levels: {
        acceptable: number;
        monitor: number;
        actionRequired: number;
        urgentAction: number;
    };
    monthlyData?: number[]; // Array of 12 numbers for manual data
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
  comparison: z.enum(['lower-is-better', 'greater-is-better']),
  unit: z.enum(['Count', 'Rate']),
  rateFactor: z.number({ coerce: true }).optional(),
  periodLabel: z.string().optional(),
  target: z.number({ coerce: true }),
  levels: z.object({
    acceptable: z.number({ coerce: true }),
    monitor: z.number({ coerce: true }),
    actionRequired: z.number({ coerce: true }),
    urgentAction: z.number({ coerce: true }),
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface EditSpiFormProps {
    spi: SpiConfig;
    onSave: (updatedSpi: SpiConfig) => void;
    onCancel: () => void;
}

export function EditSpiForm({ spi, onSave, onCancel }: EditSpiFormProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: spi.name,
            comparison: spi.comparison || (spi.type === 'Leading' ? 'greater-is-better' : 'lower-is-better'),
            unit: spi.unit,
            rateFactor: spi.rateFactor || 100,
            periodLabel: spi.periodLabel || 'Month',
            target: spi.target,
            levels: spi.levels,
        },
    });

    const onSubmit = (values: FormValues) => {
        onSave({ 
            ...spi, 
            name: values.name,
            comparison: values.comparison,
            unit: values.unit,
            rateFactor: values.unit === 'Rate' ? values.rateFactor : undefined,
            periodLabel: values.unit === 'Count' ? values.periodLabel : undefined,
            target: values.target,
            levels: values.levels
        });
    };
    
    const unit = form.watch('unit');

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
                <ScrollArea className="h-[70vh] pr-4">
                    <div className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Indicator Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="comparison"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Target Direction</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="lower-is-better">Lower is Better</SelectItem>
                                                <SelectItem value="greater-is-better">Greater is Better</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Count">Count</SelectItem>
                                                <SelectItem value="Rate">Rate per Flight Hours</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             {unit === 'Rate' && (
                                <FormField
                                    control={form.control}
                                    name="rateFactor"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Flight Hour Rate (per X fh)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g., 100" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                            {unit === 'Count' && (
                                <FormField
                                    control={form.control}
                                    name="periodLabel"
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel>Period Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Month, Quarter" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                        </div>

                        <Separator />

                        <div className='grid grid-cols-2 gap-x-6 gap-y-4'>
                            <FormField
                                control={form.control}
                                name="target"
                                render={({ field }) => (
                                    <FormItem className='col-span-2'>
                                        <FormLabel>Overall Target</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="levels.acceptable"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Acceptable</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} className="border-green-500 focus-visible:ring-green-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="levels.monitor"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Monitor</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} className="border-yellow-500 focus-visible:ring-yellow-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="levels.actionRequired"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Action Required</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} className="border-orange-500 focus-visible:ring-orange-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="levels.urgentAction"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Urgent Action</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.1" {...field} className="border-red-500 focus-visible:ring-red-500" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                    </div>
                </ScrollArea>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Form>
    );
}
