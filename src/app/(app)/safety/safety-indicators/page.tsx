
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditSpiForm } from './edit-spi-form';
import { useCollection, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { SafetyReport } from '@/types/safety-report';
import type { Booking } from '@/types/booking';
import { SPICard } from './spi-card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import type { SpiConfig, SpiConfigurations } from '@/types/spi';


// Updated initialSpiConfig
const initialSpiConfig: SpiConfig[] = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        comparison: 'lower-is-better',
        unit: 'Rate',
        rateFactor: 100,
        description: '',
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
        unit: 'Rate',
        rateFactor: 100,
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
        periodLabel: 'Month',
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
        periodLabel: 'Month',
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


export default function SafetyIndicatorsPage() {
  const [spiConfig, setSpiConfig] = useState<SpiConfig[]>(initialSpiConfig);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSpi, setSelectedSpi] = useState<SpiConfig | null>(null);

  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const settingsDocId = 'spi-configurations';

  const reportsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'safety-reports')) : null),
    [firestore, tenantId]
  );
  const bookingsQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'bookings')) : null),
    [firestore, tenantId]
  );
  const spiConfigRef = useMemoFirebase(
    () => (firestore ? doc(firestore, `tenants/${tenantId}/settings`, settingsDocId) : null),
    [firestore, tenantId]
  );

  const { data: reports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: spiDocument, isLoading: isLoadingSpiDocument } = useDoc<SpiConfigurations>(spiConfigRef);
  
  const saveConfigToFirestore = useCallback((updatedConfig: SpiConfig[]) => {
    if (!firestore || !spiConfigRef) return;

    const cleanedConfigurations = JSON.parse(JSON.stringify(updatedConfig));
    
    const configToSave: SpiConfigurations = {
        id: settingsDocId,
        configurations: cleanedConfigurations
    };
    setDocumentNonBlocking(spiConfigRef, configToSave, { merge: true });
  }, [firestore, spiConfigRef]);
  
    useEffect(() => {
        if (isLoadingSpiDocument) {
            return;
        }

        if (spiDocument && spiDocument.configurations) {
            setSpiConfig(spiDocument.configurations);
        } else if (!spiDocument) {
            saveConfigToFirestore(initialSpiConfig);
        }
    }, [spiDocument, isLoadingSpiDocument, saveConfigToFirestore]);


  const handleEdit = (spi: SpiConfig) => {
    setSelectedSpi(spi);
    setIsEditDialogOpen(true);
  };

  const handleSave = (spiToSave: SpiConfig) => {
    let newConfig: SpiConfig[];
    if (spiToSave.id === 'new-spi') {
        newConfig = [...spiConfig, { ...spiToSave, id: `spi-${Date.now()}` }];
    } else {
        newConfig = spiConfig.map(s => s.id === spiToSave.id ? spiToSave : s);
    }
    setSpiConfig(newConfig);
    saveConfigToFirestore(newConfig);
    setIsEditDialogOpen(false);
    setSelectedSpi(null);
  };

  const handleNewSpi = () => {
    setSelectedSpi({
        id: 'new-spi', // Temporary ID
        name: '',
        comparison: 'lower-is-better',
        unit: 'Count',
        periodLabel: 'Month',
        description: '',
        target: 0,
        levels: { acceptable: 0, monitor: 1, actionRequired: 2, urgentAction: 3 },
        monthlyData: Array(12).fill(0),
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (spiId: string) => {
    if (window.confirm('Are you sure you want to delete this SPI?')) {
        const newConfig = spiConfig.filter(spi => spi.id !== spiId);
        setSpiConfig(newConfig);
        saveConfigToFirestore(newConfig);
    }
  };


  const handleMonthDataSave = (spiId: string, monthIndex: number, newValue: number) => {
      const newConfig = spiConfig.map(spi => {
          if (spi.id === spiId) {
              const newMonthlyData = [...(spi.monthlyData || Array(12).fill(0))];
              newMonthlyData[monthIndex] = newValue;
              return { ...spi, monthlyData: newMonthlyData };
          }
          return spi;
      });
      setSpiConfig(newConfig);
      saveConfigToFirestore(newConfig);
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
              <Button onClick={handleNewSpi}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New SPI
              </Button>
          </div>
          <div className="grid grid-cols-1 gap-6">
              {isLoadingReports || isLoadingBookings ? (
                  <p>Loading SPI data...</p>
              ) : (
                  
                      spiConfig.map(spi => (
                          <SPICard 
                              key={spi.id} 
                              spi={spi} 
                              onEdit={handleEdit}
                              onDelete={handleDelete}
                              reports={reports} 
                              bookings={bookings}
                              onMonthDataSave={handleMonthDataSave}
                          />
                      ))
                  
              )}
          </div>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                  <DialogTitle>{selectedSpi?.id === 'new-spi' ? 'Create New SPI' : `Edit SPI: ${selectedSpi?.name}`}</DialogTitle>
                  <DialogDescription>
                      {selectedSpi?.id === 'new-spi' ? 'Define a new Safety Performance Indicator.' : 'Adjust the targets and alert levels for this SPI.'}
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
