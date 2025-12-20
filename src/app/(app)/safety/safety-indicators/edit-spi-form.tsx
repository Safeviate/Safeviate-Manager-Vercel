'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export type SpiConfig = {
    id: string;
    name: string;
    type: 'Lagging' | 'Leading';
    unit: 'Count' | 'Rate per 100 fh';
    description: string;
    target: number;
    levels: {
        acceptable: number;
        monitor: number;
        actionRequired: number;
        urgentAction: number;
    };
};

const formSchema = z.object({
  name: z.string().min(1, "Name is required."),
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
            target: spi.target,
            levels: spi.levels,
        },
    });

    const onSubmit = (values: FormValues) => {
        onSave({ ...spi, ...values });
    };
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
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

                <Separator />

                <div className='grid grid-cols-2 gap-x-6 gap-y-4'>
                    <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                            <FormItem className='col-span-2'>
                                <FormLabel>Overall Target ({spi.unit})</FormLabel>
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

                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Form>
    );
}