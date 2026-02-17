'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { SpiConfig } from './edit-spi-form';
import { useSpiData } from './use-spi-data';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { cn } from '@/lib/utils';

interface SPICardProps {
    spi: SpiConfig;
    onEdit: (spi: SpiConfig) => void;
    reports: SafetyReport[] | null;
    bookings: Booking[] | null;
}

export function SPICard({ spi, onEdit, reports, bookings }: SPICardProps) {
    const spiData = useSpiData(spi, reports, bookings);

    const yearlySummary = useMemo(() => {
        if (!spiData || spiData.length === 0) return null;
        
        let summaryValue = 0;
        if (spi.unit === 'Count') {
            // Sum up all monthly counts for the year
            summaryValue = spiData.reduce((sum, data) => sum + data.value, 0);
        } else {
            // For rates, calculate a yearly average from non-zero monthly rates
            const nonZeroMonths = spiData.filter(d => d.value > 0);
            if (nonZeroMonths.length > 0) {
                summaryValue = nonZeroMonths.reduce((sum, data) => sum + data.value, 0) / nonZeroMonths.length;
            }
        }
        
        return {
            label: `for ${new Date().getFullYear()}`,
            value: parseFloat(summaryValue.toFixed(2))
        };
    }, [spiData, spi.unit]);

    const getStatusClass = (value: number) => {
        // Adjust targets for yearly summary if it's a count
        const isCount = spi.unit === 'Count';
        const multiplier = isCount ? 12 : 1;

        const acceptable = spi.levels.acceptable * multiplier;
        const monitor = spi.levels.monitor * multiplier;
        const actionRequired = spi.levels.actionRequired * multiplier;
        
        if (spi.comparison === 'greater-is-better') {
            if (value >= acceptable) return 'text-green-600';
            if (value >= monitor) return 'text-yellow-600';
            if (value >= actionRequired) return 'text-orange-600';
            return 'text-red-600';
        } else { // Lower is better
            if (value <= acceptable) return 'text-green-600';
            if (value <= monitor) return 'text-yellow-600';
            if (value <= actionRequired) return 'text-orange-600';
            return 'text-red-600';
        }
    };

    return (
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
                                <p className='text-sm text-muted-foreground mt-1'>{spi.unit} {yearlySummary.label}</p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No data</p>
                        )}
                    </div>
                    <div className="lg:col-span-3">
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                            {spiData.map((dataPoint) => (
                                <div key={dataPoint.label} className="text-center p-2 rounded-lg bg-muted/50">
                                    <p className="text-xs font-medium text-muted-foreground">{dataPoint.label.split(' ')[0]}</p>
                                    <p className="text-lg font-bold">{dataPoint.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
