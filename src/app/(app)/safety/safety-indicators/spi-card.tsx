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
import { TimeScale } from './page';

interface SPICardProps {
    spi: SpiConfig;
    onEdit: (spi: SpiConfig) => void;
    reports: SafetyReport[] | null;
    bookings: Booking[] | null;
    timeScale: TimeScale;
}

export function SPICard({ spi, onEdit, reports, bookings, timeScale }: SPICardProps) {
    const spiData = useSpiData(spi, reports, bookings, timeScale);
    const latestDataPoint = spiData.length > 0 ? spiData[spiData.length - 1] : null;

    const getStatusClass = (value: number) => {
        let targetMultiplier = 1;
        if (spi.unit === 'Count' && timeScale !== 'monthly') {
            targetMultiplier = timeScale === 'quarterly' ? 3 : 12;
        }

        if (spi.comparison === 'greater-is-better') { // Higher is better
            if (value >= spi.levels.acceptable * targetMultiplier) return 'text-green-600';
            if (value >= spi.levels.monitor * targetMultiplier) return 'text-yellow-600';
            if (value >= spi.levels.actionRequired * targetMultiplier) return 'text-orange-600';
            return 'text-red-600';
        } else { // Lower is better
            if (value <= spi.levels.acceptable * targetMultiplier) return 'text-green-600';
            if (value <= spi.levels.monitor * targetMultiplier) return 'text-yellow-600';
            if (value <= spi.levels.actionRequired * targetMultiplier) return 'text-orange-600';
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
                                <p className='text-sm text-muted-foreground mt-1'>{spi.unit} {timeScale === 'monthly' ? `in ${latestDataPoint.label}` : `for ${latestDataPoint.label}`}</p>
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">No data</p>
                        )}
                    </div>
                    <div className="h-48 w-full flex-grow">
                        <SpiChart data={spiData} spi={spi} timeScale={timeScale} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
