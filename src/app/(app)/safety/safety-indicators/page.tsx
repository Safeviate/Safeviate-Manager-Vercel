
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditSpiForm, type SpiConfig } from './edit-spi-form';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { SPICard } from './spi-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Updated initialSpiConfig
const initialSpiConfig: SpiConfig[] = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        comparison: 'lower-is-better',
        unit: 'Rate per 100 fh',
        description: 'Number of reported unstable approaches per 100 flight hours.',
        target: 0.5,
        levels: {
            acceptable: 0.5,
            monitor: 1.0,
            actionRequired: 1.5,
            urgentAction: 2.0,
        },
        monthlyData: Array(12).fill(0),
    },
    {
        id: 'tech-defect',
        name: 'Aircraft Technical Defect Rate',
        comparison: 'lower-is-better',
        unit: 'Rate per 100 fh',
        description: 'Number of aircraft technical defects reported per 100 flight hours.',
        target: 1.0,
        levels: {
            acceptable: 1.0,
            monitor: 2.0,
            actionRequired: 3.0,
            urgentAction: 4.0,
        },
        monthlyData: Array(12).fill(0),
    },
    {
        id: 'ground-incidents',
        name: 'Ground Incidents',
        comparison: 'lower-is-better',
        unit: 'Count',
        description: 'Total number of ground incidents reported per month.',
        target: 0,
        levels: {
            acceptable: 0,
            monitor: 1,
            actionRequired: 2,
            urgentAction: 3,
        },
        monthlyData: Array(12).fill(0),
    },
    {
        id: 'proactive-reports',
        name: 'Proactive Reports',
        comparison: 'greater-is-better',
        unit: 'Count',
        description: 'Total number of proactive safety reports filed by personnel.',
        target: 10,
        levels: {
            acceptable: 10, // Target is to have at least this many
            monitor: 8,
            actionRequired: 5,
            urgentAction: 2,
        },
        monthlyData: Array(12).fill(0),
    }
];

export type TimeScale = 'monthly' | 'quarterly' | 'yearly';

export default function SafetyIndicatorsPage() {
  const [spiConfig, setSpiConfig] = useState<SpiConfig[]>(initialSpiConfig);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSpi, setSelectedSpi] = useState<SpiConfig | null>(null);
  const [timeScale, setTimeScale] = useState<TimeScale>('monthly');

  const firestore = useFirestore();
  const tenantId = 'safeviate';

  const reportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'safety-reports')) : null),
    [firestore, tenantId]
  );
  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'bookings')) : null),
    [firestore, tenantId]
  );

  const { data: reports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);


  const handleEdit = (spi: SpiConfig) => {
    setSelectedSpi(spi);
    setIsEditDialogOpen(true);
  };

  const handleSave = (updatedSpi: SpiConfig) => {
    setSpiConfig(prev => prev.map(spi => spi.id === updatedSpi.id ? updatedSpi : spi));
    setIsEditDialogOpen(false);
  };

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
          <div className="flex justify-between items-center">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">Safety Indicators</h1>
                  <p className="text-muted-foreground">
                      Monitoring key safety metrics and trends over time.
                  </p>
              </div>
          </div>
            <Tabs defaultValue="monthly" onValueChange={(value) => setTimeScale(value as TimeScale)}>
                <TabsList>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                    <TabsTrigger value="yearly">Yearly</TabsTrigger>
                </TabsList>
                <TabsContent value={timeScale} className="mt-6">
                    {isLoadingReports || isLoadingBookings ? (
                        <p>Loading SPI data...</p>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {spiConfig.map(spi => (
                                <SPICard 
                                    key={spi.id} 
                                    spi={spi} 
                                    onEdit={handleEdit} 
                                    reports={reports} 
                                    bookings={bookings}
                                    timeScale={timeScale}
                                />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                  <DialogTitle>Edit SPI: {selectedSpi?.name}</DialogTitle>
                  <DialogDescription>
                      Adjust the targets and alert levels for this Safety Performance Indicator.
                  </DialogDescription>
              </DialogHeader>
              {selectedSpi && (
                  <EditSpiForm 
                      spi={selectedSpi}
                      onSave={handleSave}
                      onCancel={() => setIsEditDialogOpen(false)}
                  />
              )}
          </DialogContent>
      </Dialog>
    </>
  );
}
