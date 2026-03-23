
'use client';

import * as React from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit, ShieldAlert, Settings2, Trash2, Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk, Mitigation, RiskRegisterSettings } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import type { ExternalOrganization } from '@/types/quality';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { RiskForm } from './risk-form';
import { getRiskScoreStyle, getAlphanumericRisk } from './utils';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/hooks/use-user-profile';
import { usePermissions } from '@/hooks/use-permissions';
import { useOrganizationScope } from '@/hooks/use-organization-scope';
import type { TabVisibilitySettings } from '../../admin/external/page';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

function CompanyTabsRow({ organizations }: { organizations: ExternalOrganization[] }) {
    return (
        <div className="border-b px-6 py-4">
            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex min-w-max">
                <TabsTrigger value="internal" className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0">
                    Internal
                </TabsTrigger>
                {organizations.map((organization) => (
                    <TabsTrigger
                        key={organization.id}
                        value={organization.id}
                        className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground shrink-0"
                    >
                        {organization.name}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
}

const DEFAULT_HAZARD_AREAS = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];

function ManageAreasDialog({ tenantId, settings }: { tenantId: string, settings: RiskRegisterSettings | null }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [newArea, setNewArea] = React.useState('');
    const [areas, setAreas] = React.useState<string[]>([]);

    React.useEffect(() => {
        setAreas(settings?.hazardAreas || DEFAULT_HAZARD_AREAS);
    }, [settings]);

    const handleAdd = () => {
        if (newArea.trim() && !areas.includes(newArea.trim())) {
            const updated = [...areas, newArea.trim()];
            setAreas(updated);
            save(updated);
            setNewArea('');
        }
    };

    const handleRemove = (areaToRemove: string) => {
        const updated = areas.filter(a => a !== areaToRemove);
        setAreas(updated);
        save(updated);
    };

    const save = (updatedAreas: string[]) => {
        if (!firestore) return;
        const settingsRef = doc(firestore, `tenants/${tenantId}/settings`, 'risk-register-config');
        setDocumentNonBlocking(settingsRef, { id: 'risk-register-config', hazardAreas: updatedAreas }, { merge: true });
        toast({ title: 'Hazard Areas Updated' });
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-2">
                    <Settings2 className="h-3.5 w-3.5" />
                    Manage Areas
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Risk Register Categories</DialogTitle>
                    <DialogDescription>Add or remove the menu tabs used to organize your hazard register.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                        <Input 
                            placeholder="New area name..." 
                            value={newArea} 
                            onChange={(e) => setNewArea(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <Button size="icon" onClick={handleAdd} disabled={!newArea.trim()}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {areas.map(area => (
                            <div key={area} className="flex items-center justify-between p-2 rounded-md bg-muted/50 border">
                                <span className="text-sm font-medium">{area}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemove(area)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RiskRegisterPage() {
  const firestore = useFirestore();
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'risk-register-view' });

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);

  const canManageAll = hasPermission('risk-register-view');
  const canManageAreas = hasPermission('risk-register-manage-definitions');

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

  const registerSettingsRef = useMemoFirebase(
    () => (firestore && tenantId ? doc(firestore, `tenants/${tenantId}/settings`, 'risk-register-config') : null),
    [firestore, tenantId]
  );

  const { data: allRisks, isLoading: isLoadingRisks } = useCollection<Risk>(risksQuery);
  const { data: personnel, isLoading: isLoadingPersonnel } = useCollection<Personnel>(personnelQuery);
  const { data: organizations, isLoading: isLoadingOrgs } = useCollection<ExternalOrganization>(orgsQuery);
  const { data: visibilitySettings, isLoading: isLoadingVisibility } = useDoc<TabVisibilitySettings>(visibilitySettingsRef);
  const { data: registerSettings, isLoading: isLoadingSettings } = useDoc<RiskRegisterSettings>(registerSettingsRef);

  const hazardAreas = React.useMemo(() => {
      return registerSettings?.hazardAreas || DEFAULT_HAZARD_AREAS;
  }, [registerSettings]);

  const personnelMap = React.useMemo(() => {
    if (!personnel) return new Map<string, string>();
    return new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [personnel]);
  
  const isLoading = isLoadingRisks || isLoadingPersonnel || isLoadingOrgs || isLoadingVisibility || isLoadingSettings;
  
  const handleEditClick = (risk: Risk) => {
    setEditingRisk(risk);
    setIsDialogOpen(true);
  };

  const renderOrgCard = (orgId: string | 'internal') => {
    const orgRisks = (allRisks || []).filter(r => 
        orgId === 'internal' ? !r.organizationId : r.organizationId === orgId
    );

    const uncategorizedRisks = orgRisks.filter(r => !hazardAreas.includes(r.hazardArea) && r.status === 'Open');
    const displayAreas = uncategorizedRisks.length > 0 ? [...hazardAreas, 'Uncategorized'] : hazardAreas;
    const sectionTitle = orgId === 'internal' ? 'Internal Risk Register' : organizations?.find((o) => o.id === orgId)?.name;

    return (
        <Card className="min-h-[500px] flex flex-col shadow-none border">
            <CardHeader className="bg-muted/10 border-b">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>{sectionTitle}</CardTitle>
                        <CardDescription>Identified hazards and risk management status for this organization.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {canManageAreas && <ManageAreasDialog tenantId={tenantId!} settings={registerSettings} />}
                        <Button asChild size="sm">
                            <Link href={`/safety/risk-register/new?orgId=${orgId}`}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Hazard
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} />}
            <CardContent className="p-6">
                <Tabs defaultValue={displayAreas[0]}>
                    <TabsList className="bg-transparent h-auto p-0 gap-2 mb-6 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex">
                        {displayAreas.map(area => (
                            <TabsTrigger 
                                key={area} 
                                value={area} 
                                className="rounded-full px-6 py-2 border data-[state=active]:bg-button-primary data-[state=active]:text-button-primary-foreground text-xs shrink-0"
                            >
                                {area}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {displayAreas.map(area => {
                        const areaRisks = area === 'Uncategorized' 
                            ? uncategorizedRisks 
                            : orgRisks.filter(r => r.hazardArea === area && r.status === 'Open');
                            
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
        <div className="max-w-[1200px] mx-auto w-full space-y-6">
            <Skeleton className="h-10 w-[400px] rounded-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  const isTabEnabled = visibilitySettings?.visibilities?.['risk-register'] ?? true;
  const showTabs = isTabEnabled && shouldShowOrganizationTabs;

  return (
    <div className="max-w-[1200px] mx-auto w-full flex flex-col gap-6 h-full">
      {!showTabs ? (
          renderOrgCard(scopedOrganizationId)
      ) : (
          <Tabs defaultValue="internal" className="w-full flex flex-col h-full overflow-hidden">
              <TabsContent value="internal" className="mt-0">
                  {renderOrgCard('internal')}
              </TabsContent>
              
              {(organizations || []).map(org => (
                  <TabsContent key={org.id} value={org.id} className="mt-0">
                      {renderOrgCard(org.id)}
                  </TabsContent>
              ))}
          </Tabs>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 shrink-0 border-b bg-muted/5">
                <DialogTitle>Edit Hazard Details</DialogTitle>
                <DialogDescription>Update hazard descriptions and reassess associated risks.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                <div className="py-4">
                    <RiskForm
                        hideHeader
                        existingRisk={editingRisk}
                        personnel={personnel || []}
                        onCancel={() => setIsDialogOpen(false)}
                    />
                </div>
            </div>
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
              {risk.initialRiskAssessment?.likelihood !== undefined && risk.initialRiskAssessment?.severity !== undefined && (
                <Badge className="text-[10px] h-5 font-black" style={getRiskScoreStyle(risk.initialRiskAssessment.riskScore)}>
                  {getAlphanumericRisk(risk.initialRiskAssessment.likelihood, risk.initialRiskAssessment.severity)}
                </Badge>
              )}
            </TableCell>
          )}
          <TableCell className="text-xs">{mitigation.description}</TableCell>
          <TableCell>
            {mitigation.residualRiskAssessment?.likelihood !== undefined && mitigation.residualRiskAssessment?.severity !== undefined ? (
              <Badge className="text-[10px] h-5 font-black" style={getRiskScoreStyle(mitigation.residualRiskAssessment.riskScore)}>
                {getAlphanumericRisk(mitigation.residualRiskAssessment.likelihood, mitigation.residualRiskAssessment.severity)}
              </Badge>
            ) : <Badge variant="outline" className="text-[10px] h-5 opacity-50 font-black">N/A</Badge>}
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
