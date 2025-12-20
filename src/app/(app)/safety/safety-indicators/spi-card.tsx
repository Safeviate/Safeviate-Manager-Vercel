'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { SpiConfig } from './edit-spi-form';
import { useSpiData } from './use-spi-data';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { SpiChart } from './spi-chart';
import { cn } from '@/lib/utils';

interface SPICardProps {
    spi: SpiConfig;
    onEdit: (spi: SpiConfig) => void;
    reports: SafetyReport[] | null;
    bookings: Booking[] | null;
}

export function SPICard({ spi, onEdit, reports, bookings }: SPICardProps) {
    const spiData = useSpiData(spi, reports, bookings);
    const latestDataPoint = spiData.length > 0 ? spiData[spiData.length - 1] : null;

    const getStatusClass = (value: number) => {
        if (spi.type === 'Leading') { // Lower is worse for leading indicators
            if (value >= spi.levels.acceptable) return 'text-green-600';
            if (value >= spi.levels.monitor) return 'text-yellow-600';
            if (value >= spi.levels.actionRequired) return 'text-orange-600';
            return 'text-red-600';
        } else { // Higher is worse for lagging indicators
            if (value <= spi.levels.acceptable) return 'text-green-600';
            if (value <= spi.levels.monitor) return 'text-yellow-600';
            if (value <= spi.levels.actionRequired) return 'text-orange-600';
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
                <div className="flex flex-col md:flex-row gap-6 items-center">
                    <div className="flex-shrink-0 text-center">
                        {latestDataPoint ? (
                            <>
                                <p className={cn('text-5xl font-bold tracking-tighter', getStatusClass(latestDataPoint.value))}>
                                    {latestDataPoint.value}
                                </p>
                                <p className='text-sm text-muted-foreground mt-1'>{spi.unit} in {latestDataPoint.month}</p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No data</p>
                        )}
                    </div>
                    <div className="h-48 w-full flex-grow">
                        <SpiChart data={spiData} spi={spi} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
