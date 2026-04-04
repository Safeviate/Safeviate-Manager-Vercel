'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, MoreVertical, Trash2 } from 'lucide-react';
import type { SpiConfig } from '@/types/spi';
import { useSpiData } from './use-spi-data';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface SPICardProps {
    spi: SpiConfig;
    onEdit: (spi: SpiConfig) => void;
    onDelete: (spiId: string) => void;
    reports: SafetyReport[] | null;
    bookings: Booking[] | null;
    onMonthDataSave: (spiId: string, monthIndex: number, newValue: number) => void;
}

export function SPICard({ spi, onEdit, onDelete, reports, bookings, onMonthDataSave }: SPICardProps) {
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
            if (value >= levels.acceptable) return 'text-primary';
            if (value >= levels.monitor) return 'text-foreground';
            if (value >= levels.actionRequired) return 'text-muted-foreground';
            return 'text-destructive';
        } else { // lower-is-better
            if (value <= levels.acceptable) return 'text-primary';
            if (value <= levels.monitor) return 'text-foreground';
            if (value <= levels.actionRequired) return 'text-muted-foreground';
            return 'text-destructive';
        }
    };
    
    const getMonthStatusClass = (value: number) => {
        const { levels, comparison } = spi;

        if (value === 0 && comparison === 'greater-is-better') return 'bg-primary/15 text-foreground border border-primary/30';
        if (comparison === 'greater-is-better') {
            if (value >= levels.acceptable) return 'bg-primary/15 text-foreground border border-primary/30';
            if (value >= levels.monitor) return 'bg-muted/70 text-foreground border border-border';
            if (value >= levels.actionRequired) return 'bg-amber-100 text-amber-900 border border-amber-300';
            return 'bg-red-100 text-red-900 border border-red-300';
        } else { // lower-is-better
            if (value <= levels.acceptable) return 'bg-primary/15 text-foreground border border-primary/30';
            if (value <= levels.monitor) return 'bg-muted/70 text-foreground border border-border';
            if (value <= levels.actionRequired) return 'bg-amber-100 text-amber-900 border border-amber-300';
            return 'bg-red-100 text-red-900 border border-red-300';
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
                            <CardDescription>
                                {spi.description}
                                <span className="block text-xs text-muted-foreground mt-1">
                                    Target Direction: <span className="font-semibold">{spi.comparison === 'lower-is-better' ? 'Lower is Better' : 'Greater is Better'}</span>
                                </span>
                            </CardDescription>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="w-8 h-8 flex-shrink-0" aria-label={`Open actions menu for ${spi.name}`}>
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => onEdit(spi)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => onDelete(spi.id)} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                                    <p className='text-sm text-foreground/80 mt-1'>{unitLabel} {yearlySummary.label}</p>
                                </>
                            ) : (
                                <p className="text-sm text-foreground/80">No data</p>
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
                                        <p className="text-xs font-semibold">{dataPoint.label.split(' ')[0]}</p>
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
                        <DialogDescription>
                            Update the recorded SPI value for the selected month.
                        </DialogDescription>
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
