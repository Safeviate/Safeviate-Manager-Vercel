'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EditSpiForm, type SpiConfig } from './edit-spi-form';


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

const SPICard = ({ spi, onEdit }: { spi: SpiConfig; onEdit: (spi: SpiConfig) => void; }) => {
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
                <div className="h-48 w-full flex items-center justify-center bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">[Chart Placeholder]</p>
                </div>
            </CardContent>
        </Card>
    )
}


export default function SafetyIndicatorsPage() {
  const [spiConfig, setSpiConfig] = useState<SpiConfig[]>(initialSpiConfig);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSpi, setSelectedSpi] = useState<SpiConfig | null>(null);

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {spiConfig.map(spi => (
                  <SPICard key={spi.id} spi={spi} onEdit={handleEdit} />
              ))}
          </div>
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
