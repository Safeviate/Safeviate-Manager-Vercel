'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditSpiForm, type SpiConfig } from './edit-spi-form';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { format, startOfMonth, getMonth, getYear } from 'date-fns';

const initialSpiConfig: SpiConfig[] = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        type: 'Lagging',
        unit: 'Rate per 100 fh',
        description: 'Number of reported unstable approaches per 100 flight hours.',
        target: 0.5,
        levels: {
            acceptable: 0.5,
            monitor: 1.0,
            actionRequired: 1.5,
            urgentAction: 2.0,
        }
    },
    {
        id: 'tech-defect',
        name: 'Aircraft Technical Defect Rate',
        type: 'Lagging',
        unit: 'Rate per 100 fh',
        description: 'Number of aircraft technical defects reported per 100 flight hours.',
        target: 1.0,
        levels: {
            acceptable: 1.0,
            monitor: 2.0,
            actionRequired: 3.0,
            urgentAction: 4.0,
        }
    },
    {
        id: 'ground-incidents',
        name: 'Ground Incidents',
        type: 'Lagging',
        unit: 'Count',
        description: 'Total number of ground incidents reported per month.',
        target: 0,
        levels: {
            acceptable: 0,
            monitor: 1,
            actionRequired: 2,
            urgentAction: 3,
        }
    },
    {
        id: 'proactive-reports',
        name: 'Proactive Reports',
        type: 'Leading',
        unit: 'Count',
        description: 'Total number of proactive safety reports filed by personnel.',
        target: 10,
        levels: {
            acceptable: 10, // Target is to have at least this many
            monitor: 8,
            actionRequired: 5,
            urgentAction: 2,
        }
    }
];

type MonthlySpiData = {
    month: string; // e.g., "Jan 2024"
    value: number;
}

const useSpiData = (spi: SpiConfig, reports: SafetyReport[] | null, bookings: Booking[] | null) => {
    return useMemo(() => {
        if (!reports || !bookings) return [];

        // 1. Filter reports based on SPI criteria
        const filteredReports = reports.filter(report => {
            switch(spi.id) {
                case 'unstable-approach':
                    // This is a placeholder logic. In a real scenario, you'd check a specific field.
                    return report.reportType === 'Flight Operations' && report.description.toLowerCase().includes('unstable approach');
                case 'tech-defect':
                    return report.reportType === 'Aircraft Defect';
                case 'ground-incidents':
                    return report.reportType === 'Ground Operations';
                case 'proactive-reports':
                    // Placeholder: assuming general concerns are proactive
                    return report.reportType === 'General Safety Concern';
                default:
                    return false;
            }
        });

        // 2. Aggregate by month
        const monthlyData: { [key: string]: { count: number, flightHours: number } } = {};
        
        filteredReports.forEach(report => {
            const monthKey = format(startOfMonth(new Date(report.submittedAt)), 'yyyy-MM');
            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { count: 0, flightHours: 0 };
            }
            monthlyData[monthKey].count++;
        });

        // 3. TODO: Calculate flight hours per month from bookings
        // For now, flight hours are 0.

        // 4. Calculate final value
        const result: MonthlySpiData[] = Object.entries(monthlyData).map(([monthKey, data]) => {
            const monthLabel = format(new Date(`${monthKey}-02`), 'MMM yyyy'); // Use day 2 to avoid timezone issues
            let value = 0;
            if (spi.unit === 'Count') {
                value = data.count;
            } else if (spi.unit === 'Rate per 100 fh') {
                // TODO: Replace 1000 with actual flight hours for the month
                const totalFlightHours = 1000; 
                value = totalFlightHours > 0 ? (data.count / totalFlightHours) * 100 : 0;
            }
            return { month: monthLabel, value: parseFloat(value.toFixed(2)) };
        });

        // Sort by date
        return result.sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    }, [spi, reports, bookings]);
}

const SPICard = ({ spi, onEdit, reports, bookings }: { spi: SpiConfig; onEdit: (spi: SpiConfig) => void; reports: SafetyReport[] | null; bookings: Booking[] | null; }) => {
    const spiData = useSpiData(spi, reports, bookings);
    
    // Get the most recent month's data
    const latestDataPoint = spiData.length > 0 ? spiData[spiData.length - 1] : null;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-lg">{spi.name}</CardTitle>
                        <CardDescription>{spi.description}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => onEdit(spi)}>
                        <Edit className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="h-48 w-full flex flex-col items-center justify-center bg-muted/50 rounded-md p-4">
                     {latestDataPoint ? (
                        <>
                            <p className='text-5xl font-bold tracking-tighter'>{latestDataPoint.value}</p>
                            <p className='text-sm text-muted-foreground mt-1'>{spi.unit} in {latestDataPoint.month}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">[Chart Placeholder]</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}


export default function SafetyIndicatorsPage() {
  const [spiConfig, setSpiConfig] = useState<SpiConfig[]>(initialSpiConfig);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSpi, setSelectedSpi] = useState<SpiConfig | null>(null);

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
          {isLoadingReports || isLoadingBookings ? (
            <p>Loading SPI data...</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {spiConfig.map(spi => (
                    <SPICard key={spi.id} spi={spi} onEdit={handleEdit} reports={reports} bookings={bookings} />
                ))}
            </div>
          )}
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
