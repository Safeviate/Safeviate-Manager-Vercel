'use client';

import * as React from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk, Mitigation } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { ExternalOrganization } from '@/types/quality';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RiskForm } from './risk-form';
import { getRiskScoreStyle } from './utils';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import type { TabVisibilitySettings } from '../../admin/external/page';

const HAZARD_AREAS = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];

export default function RiskRegisterPage() {
  const firestore = useFirestore();
  const { tenantId, userProfile } = useUserProfile();
  const { hasPermission } = usePermissions();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);

  const canManageAll = hasPermission('risk-register-view');
  const userOrgId = userProfile?.organizationId;

  const risksQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/risks`)) : null),
    [firestore, tenantId]
  );
  
  const personnelQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );

  const orgsQuery = useMemoFirebase(
    () => (firestore && tenantId ? query(collection(firestore, `tenants/${tenantId}/external-organizations`)) : null),
    [firestore, tenantId]
  );

  const visibilitySettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'tab-visibility') : null),
    [firestore, tenantId]
  );

  const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
  const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);

  const personnelMap = React.useMemo(() => {
    if (!personnel) return new Map<string, string>();
    return new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [personnel]);
  
  const isLoading = isLoadingRisks || isLoadingPersonnel || isLoadingOrgs || isLoadingVisibility;
  
  const handleEditClick = (risk: Risk) => {
    setEditingRisk(risk);
    setIsDialogOpen(true);
  };

  const renderOrgContext = (orgId: string | 'internal') => {
    const orgRisks = (allRisks || []).filter(r => 
        orgId === 'internal' ? !r.organizationId : r.organizationId === orgId
    );

    return (
        <Card className="min-h-[500px] flex flex-col shadow-none border">
            <CardHeader className="bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{orgId === 'internal' ? 'Internal Risk Register' : organizations?.find(o => o.id === orgId)?.name}</CardTitle>
                        <CardDescription>Identified hazards and risk management status for this organization.</CardDescription>
                    </div>
                    <Button asChild size="sm">
                        <Link href={`/safety/risk-register/new?orgId=${orgId}`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Hazard
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="p-6">
                <Tabs defaultValue={HAZARD_AREAS[0]}>
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                        {HAZARD_AREAS.map(area => (
                            <TabsTrigger 
                                key={area} 
                                value={area} 
                                className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0"
                            >
                                {area}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {HAZARD_AREAS.map(area => {
                        const areaRisks = orgRisks.filter(r => r.hazardArea === area && r.status === 'Open');
                        return (
                            <TabsContent key={area} value={area} className="mt-0">
                                <div className="rounded-md border overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="w-[15%] text-[10px] uppercase font-bold">Hazard</TableHead>
                                                <TableHead className="w-[15%] text-[10px] uppercase font-bold">Risk</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold">Initial</TableHead>
                                                <TableHead className="w-[20%] text-[10px] uppercase font-bold">Mitigation</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold">Residual</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold">Responsible</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold">Review</TableHead>
                                                <TableHead className="text-right text-[10px] uppercase font-bold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        {areaRisks.length > 0 ? (
                                            areaRisks.map(hazard => (
                                                <tbody key={hazard.id} className='border-b'>
                                                    <RiskGroup hazard={hazard} personnelMap={personnelMap} onEditClick={handleEditClick} />
                                                </tbody>
                                            ))
                                        ) : (
                                            <tbody>
                                                <TableRow>
                                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground italic text-sm">
                                                        No open risks in this area.
                                                    </TableCell>
                                                </TableRow>
                                            </tbody>
                                        )}
                                    </Table>
                                </div>
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-6xl mx-auto w-full space-y-6">
            <Skeleton className="h-10 w-[400px] rounded-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  const isTabEnabled = visibilitySettings?.visibilities?.['risk-register'] ?? true;
  const showTabs = isTabEnabled && canManageAll;

  return (
    <div className="max-w-6xl mx-auto w-full flex flex-col gap-6 h-full">
      <div className="px-1">
          <h1 className="text-3xl font-bold tracking-tight">Risk Register</h1>
          <p className="text-muted-foreground">Proactive identification and management of safety hazards.</p>
      </div>

      {!showTabs ? (
          renderOrgContext(userOrgId || 'internal')
      ) : (
          <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
              <div className="px-1 shrink-0">
                  <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                      <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">Internal</TabsTrigger>
                      {(organizations || []).map(org => (
                          <TabsTrigger key={org.id} value={org.id} className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">
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
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
                <DialogTitle>Edit Hazard</DialogTitle>
                <DialogDescription>Update hazard details and associated risk assessments.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 pr-4">
                <div className="p-1">
                    <RiskForm
                        hideHeader
                        existingRisk={editingRisk}
                        personnel={personnel || []}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </div>
            </ScrollArea>
          </DialogContent>
      </Dialog>
    </div>
  );
}

function RiskGroup({ hazard, personnelMap, onEditClick }: { hazard: Risk; personnelMap: Map<string, string>; onEditClick: (risk: Risk) => void; }) {
  const hazardRisks = hazard.risks || [];
  const totalRowsForHazard = hazardRisks.reduce((acc, r) => acc + Math.max(1, (r.mitigations || []).length), 0);

  if (hazardRisks.length === 0) {
    return (
      <TableRow>
        <TableCell className="font-medium whitespace-normal align-top text-xs">{hazard.hazard}</TableCell>
        <TableCell colSpan={6} className="text-center text-muted-foreground text-xs italic">No risks defined.</TableCell>
        <TableCell className="text-right align-top">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditClick(hazard)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </TableCell>
      </TableRow>
    );
  }

  let isFirstRowOfHazard = true;
  return hazardRisks.flatMap((risk, riskIndex) => {
    const mitigations = (risk.mitigations && risk.mitigations.length > 0) ? risk.mitigations : [{} as Mitigation];
    const riskRowSpan = mitigations.length;

    return mitigations.map((mitigation, mitigationIndex) => {
      const showHazardCell = isFirstRowOfHazard;
      if (isFirstRowOfHazard) isFirstRowOfHazard = false;

      const isFirstRowOfRisk = mitigationIndex === 0;
      const isLastRowOfRisk = mitigationIndex === mitigations.length - 1;
      
      return (
        <TableRow key={`${hazard.id}-${risk.id}-${mitigation.id || mitigationIndex}`} className="border-0">
          {showHazardCell && <TableCell rowSpan={totalRowsForHazard} className="font-medium whitespace-normal align-top text-xs">{hazard.hazard}</TableCell>}
          {isFirstRowOfRisk && <TableCell rowSpan={riskRowSpan} className={cn("whitespace-normal align-top text-xs", isLastRowOfRisk ? "" : "border-b")}>{risk.description}</TableCell>}
          {isFirstRowOfRisk && (
            <TableCell rowSpan={riskRowSpan} className={cn("align-top", isLastRowOfRisk ? "" : "border-b")}>
              {risk.initialRiskAssessment?.riskScore !== undefined && (
                <Badge className="text-[10px] h-5" style={getRiskScoreStyle(risk.initialRiskAssessment.riskScore)}>
                  {risk.initialRiskAssessment.riskScore}
                </Badge>
              )}
            </TableCell>
          )}
          <TableCell className="text-xs">{mitigation.description}</TableCell>
          <TableCell>
            {mitigation.residualRiskAssessment?.riskScore !== undefined ? (
              <Badge className="text-[10px] h-5" style={getRiskScoreStyle(mitigation.residualRiskAssessment.riskScore)}>
                {mitigation.residualRiskAssessment.riskScore}
              </Badge>
            ) : <Badge variant="outline" className="text-[10px] h-5 opacity-50">N/A</Badge>}
          </TableCell>
          <TableCell className="text-xs whitespace-nowrap">{personnelMap.get(mitigation.responsiblePersonId) || 'N/A'}</TableCell>
          <TableCell className="text-xs whitespace-nowrap">{mitigation.reviewDate ? format(new Date(mitigation.reviewDate), 'dd MMM yy') : 'N/A'}</TableCell>
          {showHazardCell && (
            <TableCell rowSpan={totalRowsForHazard} className="text-right align-top">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditClick(hazard)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          )}
        </TableRow>
      );
    });
  });
}