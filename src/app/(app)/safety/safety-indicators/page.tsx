'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

// Placeholder types for now
type SPIType = 'Lagging' | 'Leading';
type SPIUnit = 'Count' | 'Rate per 100 fh';

// Placeholder for SPI configuration
const spiConfig = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        type: 'Lagging' as SPIType,
        unit: 'Rate per 100 fh' as SPIUnit,
        description: 'Number of reported unstable approaches per 100 flight hours.'
    },
    {
        id: 'tech-defect',
        name: 'Aircraft Technical Defect Rate',
        type: 'Lagging' as SPIType,
        unit: 'Rate per 100 fh' as SPIUnit,
        description: 'Number of aircraft technical defects reported per 100 flight hours.'
    },
    {
        id: 'ground-incidents',
        name: 'Ground Incidents',
        type: 'Lagging' as SPIType,
        unit: 'Count' as SPIUnit,
        description: 'Total number of ground incidents reported per month.'
    },
    {
        id: 'proactive-reports',
        name: 'Proactive Reports',
        type: 'Leading' as SPIType,
        unit: 'Count' as SPIUnit,
        description: 'Total number of proactive safety reports filed by personnel.'
    }
];

const SPICard = ({ spi }: { spi: typeof spiConfig[0] }) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{spi.name}</CardTitle>
                        <CardDescription>{spi.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                        <Edit className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-48 w-full flex items-center justify-center bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">[Chart Placeholder]</p>
                </div>
            </CardContent>
        </Card>
    )
}


export default function SafetyIndicatorsPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Safety Indicators</h1>
                <p className="text-muted-foreground">
                    Monitoring key safety metrics and trends over time.
                </p>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {spiConfig.map(spi => (
                <SPICard key={spi.id} spi={spi} />
            ))}
        </div>
    </div>
  );
}
