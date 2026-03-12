'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { SpiConfig, SpiConfigurations } from '@/types/spi';
import type { ExternalOrganization } from '@/types/quality';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { TabVisibilitySettings } from '../../admin/external/page';

const initialSpiConfig: SpiConfig[] = [
    {
        id: 'unstable-approach',
        name: 'Unstable Approach Rate',
        comparison: 'lower-is-better',
        unit: 'Rate',
        rateFactor: 100,
        description: 'Rate of reported unstable approaches per 100 flight hours.',
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
            acceptable: 10,
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
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();
  const settingsDocId = 'spi-configurations';

  const canViewAll = hasPermission('safety-indicators-view');
  const userOrgId = userProfile?.organizationId;

  const reportsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'safety-reports')) : null),
    [firestore, tenantId]
  );
  const bookingsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, 'tenants', tenantId, 'bookings')) : null),
    [firestore, tenantId]
  );
  const orgsQuery = useMemoFirebase(
    () => (firestore && tenantId ? collection(firestore, `tenants/${tenantId}/external-organizations`) : null),
    [firestore, tenantId]
  );
  const spiConfigRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, settingsDocId) : null),
    [firestore, tenantId]
  );
  const visibilitySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
    [firestore, tenantId]
  );

  const { data: reports, isLoading: isLoadingReports } = useCollection<SafetyReport>(reportsQuery);
  const { data: bookings, isLoading: isLoadingBookings } = useCollection<Booking>(bookingsQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
  const { data: spiDocument, isLoading: isLoadingSpiDocument } = useDoc<SpiConfigurations>(spiConfigRef);
  const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);
  
  const saveConfigToFirestore = useCallback((updatedConfig: SpiConfig[]) => {
    if (!firestore || !spiConfigRef) return;
    const configToSave: SpiConfigurations = {
        id: settingsDocId,
        configurations: JSON.parse(JSON.stringify(updatedConfig))
    };
    setDocumentNonBlocking(spiConfigRef, configToSave, { merge: true });
  }, [firestore, spiConfigRef]);
  
  useEffect(() => {
    if (!isLoadingSpiDocument && spiDocument?.configurations) {
        setSpiConfig(spiDocument.configurations);
    } else if (!isLoadingSpiDocument && !spiDocument) {
        saveConfigToFirestore(initialSpiConfig);
    }
  }, [spiDocument, isLoadingSpiDocument, saveConfigToFirestore]);

  const handleEdit = (spi: SpiConfig) => {
    setSelectedSpi(spi);
    setIsEditDialogOpen(true);
  };

  const handleSave = (spiToSave: SpiConfig) => {
    const newConfig = spiToSave.id === 'new-spi' 
        ? [...spiConfig, { ...spiToSave, id: `spi-${Date.now()}` }]
        : spiConfig.map(s => s.id === spiToSave.id ? spiToSave : s);
    setSpiConfig(newConfig);
    saveConfigToFirestore(newConfig);
    setIsEditDialogOpen(false);
    setSelectedSpi(null);
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

  const renderOrgContext = (orgId: string | 'internal') => {
    const contextOrgId = orgId === 'internal' ? null : orgId;
    return (
        <div className="grid grid-cols-1 gap-6">
            {spiConfig.map(spi => (
                <SPICard 
                    key={spi.id} 
                    spi={spi} 
                    onEdit={handleEdit}
                    onDelete={(id) => {
                        if(window.confirm('Delete this SPI?')) {
                            const nc = spiConfig.filter(s => s.id !== id);
                            setSpiConfig(nc);
                            saveConfigToFirestore(nc);
                        }
                    }}
                    reports={reports?.filter(r => r.organizationId === contextOrgId) || []} 
                    bookings={bookings?.filter(b => b.organizationId === contextOrgId) || []}
                    onMonthDataSave={handleMonthDataSave}
                />
            ))}
        </div>
    );
  };

  if (isLoadingReports || isLoadingBookings || isLoadingOrgs || isLoadingSpiDocument || isLoadingVisibility) {
    return <div className="space-y-6"><Skeleton className="h-10 w-[400px] rounded-full" /><Skeleton className="h-[200px] w-full" /></div>;
  }

  const isTabEnabled = visibilitySettings?.visibilities?.['safety-indicators'] ?? true;
  const showTabs = isTabEnabled && canViewAll;

  if (!showTabs) {
    return renderOrgContext(userOrgId || 'internal');
  }

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
          <div className="flex justify-between items-center px-1">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight">Safety Indicators</h1>
                  <p className="text-muted-foreground">Monitoring Safety Performance Indicators (SPIs) across the fleet.</p>
              </div>
              <Button onClick={() => {
                  setSelectedSpi({
                      id: 'new-spi',
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
              }}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New SPI
              </Button>
          </div>

          <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
                <div className="px-1 shrink-0">
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar">
                        <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">Internal</TabsTrigger>
                        {(organizations || []).map(org => (
                            <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground">
                                {org.name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value="internal" className="mt-0">
                    {renderOrgContext('internal')}
                </TabsContent>
                
                {(organizations || []).map(org => (
                    <TabsContent key={org.id} value={org.id} className="mt-0">
                        {renderOrgContext(org.id)}
                    </TabsContent>
                ))}
            </Tabs>
      </div>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                  <DialogTitle>{selectedSpi?.id === 'new-spi' ? 'Create New SPI' : `Edit SPI: ${selectedSpi?.name}`}</DialogTitle>
                  <DialogDescription>Define targets and alert thresholds for this performance indicator.</DialogDescription>
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
