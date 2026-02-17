
'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { SpiConfig } from './edit-spi-form';
import { useSpiData } from './use-spi-data';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SPICardProps {
    spi: SpiConfig;
    onEdit: (spi: SpiConfig) => void;
    reports: SafetyReport[] | null;
    bookings: Booking[] | null;
    onMonthDataSave: (spiId: string, monthIndex: number, newValue: number) => void;
}

export function SPICard({ spi, onEdit, reports, bookings, onMonthDataSave }: SPICardProps) {
    const { monthlyData: spiData, yearlyValue } = useSpiData(spi, reports, bookings);

    const [isMonthEditDialogOpen, setIsMonthEditDialogOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState<{ index: number; label: string; value: number } | null>(null);
    const [monthValue, setMonthValue] = useState<number | string>('');

    const unitLabel = useMemo(() => {
        if (spi.unit === 'Rate') {
            return `per ${spi.rateFactor || 1} fh`;
        }
        return spi.periodLabel || spi.unit;
    }, [spi.unit, spi.rateFactor, spi.periodLabel]);

    const yearlySummary = useMemo(() => {
        if (yearlyValue === undefined) return null;
        
        const label = spi.unit === 'Count' 
            ? `avg per ${spi.periodLabel || 'Month'}`
            : `for ${new Date().getFullYear()}`;

        return {
            label,
            value: yearlyValue
        };
    }, [yearlyValue, spi]);

    const getStatusClass = (value: number) => {
        const { levels, comparison } = spi;
        
        if (comparison === 'greater-is-better') {
            if (value >= levels.acceptable) return 'text-green-600';
            if (value >= levels.monitor) return 'text-yellow-600';
            if (value >= levels.actionRequired) return 'text-orange-600';
            return 'text-red-600';
        } else { // lower-is-better
            if (value <= levels.acceptable) return 'text-green-600';
            if (value <= levels.monitor) return 'text-yellow-600';
            if (value <= levels.actionRequired) return 'text-orange-600';
            return 'text-red-600';
        }
    };
    
    const getMonthStatusClass = (value: number) => {
        const { levels, comparison } = spi;

        if (comparison === 'greater-is-better') {
            if (value >= levels.acceptable) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            if (value >= levels.monitor) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
            if (value >= levels.actionRequired) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        } else { // lower-is-better
            if (value <= levels.acceptable) return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
            if (value <= levels.monitor) return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
            if (value <= levels.actionRequired) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
            return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
        }
    };

    const handleMonthClick = (index: number, label: string, value: number) => {
        setSelectedMonth({ index, label, value });
        setMonthValue(value);
        setIsMonthEditDialogOpen(true);
    };

    const handleSaveMonthData = () => {
        if (selectedMonth) {
            const newValue = typeof monthValue === 'string' ? parseFloat(monthValue) : monthValue;
            if (!isNaN(newValue)) {
                onMonthDataSave(spi.id, selectedMonth.index, newValue);
            }
        }
        setIsMonthEditDialogOpen(false);
        setSelectedMonth(null);
    };


    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">{spi.name}</CardTitle>
                            <CardDescription>{spi.description}</CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" onClick={() => onEdit(spi)}>
                            <Edit className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
                        <div className="lg:col-span-1 text-center lg:border-r lg:pr-6">
                            {yearlySummary ? (
                                <>
                                    <p className={cn('text-5xl font-bold tracking-tighter', getStatusClass(yearlySummary.value))}>
                                        {yearlySummary.value}
                                    </p>
                                    <p className='text-sm text-muted-foreground mt-1'>{unitLabel} {yearlySummary.label}</p>
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">No data</p>
                            )}
                        </div>
                        <div className="lg:col-span-3">
                            <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                                {spiData.map((dataPoint, index) => (
                                    <button 
                                        key={dataPoint.label} 
                                        className={cn(
                                            "text-center p-2 rounded-lg transition-colors hover:opacity-90",
                                            getMonthStatusClass(dataPoint.value)
                                        )}
                                        onClick={() => handleMonthClick(index, dataPoint.label, dataPoint.value)}
                                    >
                                        <p className="text-xs font-medium opacity-80">{dataPoint.label.split(' ')[0]}</p>
                                        <p className="text-lg font-bold">{dataPoint.value}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Dialog open={isMonthEditDialogOpen} onOpenChange={setIsMonthEditDialogOpen}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>Edit Data for {selectedMonth?.label}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="month-value">Value</Label>
                        <Input 
                            id="month-value"
                            type="number"
                            value={monthValue}
                            onChange={(e) => setMonthValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveMonthData()}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsMonthEditDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveMonthData}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
