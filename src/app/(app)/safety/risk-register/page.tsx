'use client';

import * as React from 'react';
import { collection, query, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit, ShieldAlert, Settings2, Trash2, Plus, ShieldCheck } from 'lucide-react';
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
import { MainPageHeader } from '@/components/page-header';

function CompanyTabsRow({ organizations }: { organizations: ExternalOrganization[] }) {
    return (
        <div className="border-b bg-muted/5 px-6 py-2 shrink-0">
            <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                <TabsTrigger 
                    value="internal" 
                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                >
                    Internal
                </TabsTrigger>
                {organizations.map((organization) => (
                    <TabsTrigger
                        key={organization.id}
                        value={organization.id}
                        className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
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
                <Button variant="outline" size="sm" className="h-9 px-4 gap-2 rounded-md border-slate-300 text-xs font-black uppercase shadow-sm">
                    <Settings2 className="h-4 w-4" />
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
                        <Button size="icon" onClick={handleAdd} disabled={!newArea.trim()} className="bg-emerald-700">
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

    return (
        <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
            <div className="sticky top-0 z-30 bg-card">
                <MainPageHeader 
                    title="Risk Register"
                    description="Central log for identifying, assessing, and mitigating operational hazards."
                    actions={
                        <div className="flex items-center gap-3">
                            {canManageAreas && <ManageAreasDialog tenantId={tenantId!} settings={registerSettings} />}
                            <Button asChild size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2">
                                <Link href={`/safety/risk-register/new?orgId=${orgId}`}>
                                    <PlusCircle className="h-4 w-4" />
                                    Add Hazard
                                </Link>
                            </Button>
                        </div>
                    }
                />
                {shouldShowOrganizationTabs && <CompanyTabsRow organizations={organizations || []} />}
            </div>

            <CardContent className="flex-1 p-0 overflow-hidden bg-background">
                <Tabs defaultValue={displayAreas[0]} className="h-full flex flex-col">
                    <div className="border-b bg-muted/5 px-6 py-2 shrink-0">
                        <TabsList className="bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center">
                            {displayAreas.map(area => (
                                <TabsTrigger 
                                    key={area} 
                                    value={area} 
                                    className="rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0"
                                >
                                    {area}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                        {displayAreas.map(area => {
                            const areaRisks = area === 'Uncategorized' 
                                ? uncategorizedRisks 
                                : orgRisks.filter(r => r.hazardArea === area && r.status === 'Open');
                                
                            return (
                                <TabsContent key={area} value={area} className="mt-0 h-full">
                                    <Table>
                                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                                            <TableRow>
                                                <TableHead className="w-[15%] text-[10px] uppercase font-bold tracking-wider">Hazard</TableHead>
                                                <TableHead className="w-[15%] text-[10px] uppercase font-bold tracking-wider">Risk</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Initial</TableHead>
                                                <TableHead className="w-[20%] text-[10px] uppercase font-bold tracking-wider">Mitigation</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Residual</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Responsible</TableHead>
                                                <TableHead className="text-[10px] uppercase font-bold tracking-wider">Review</TableHead>
                                                <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
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
                                                    <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic text-sm">
                                                        No open risks in this area.
                                                    </TableCell>
                                                </TableRow>
                                            </tbody>
                                        )}
                                    </Table>
                                </TabsContent>
                            );
                        })}
                    </div>
                </Tabs>
            </CardContent>
        </Card>
    );
  };

  if (isLoading) {
    return (
        <div className="max-w-[1400px] mx-auto w-full space-y-6 pt-4 px-1">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[500px] w-full" />
        </div>
    );
  }

  const isTabEnabled = visibilitySettings?.visibilities?.['risk-register'] ?? true;
  const showTabs = isTabEnabled && shouldShowOrganizationTabs;

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
      {!showTabs ? (
          renderOrgCard(scopedOrganizationId)
      ) : (
          <Tabs defaultValue="internal" className="w-full flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <TabsContent value="internal" className="mt-0 h-full">
                    {renderOrgCard('internal')}
                </TabsContent>
                
                {(organizations || []).map(org => (
                    <TabsContent key={org.id} value={org.id} className="mt-0 h-full">
                        {renderOrgCard(org.id)}
                    </TabsContent>
                ))}
              </div>
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
        <TableCell className="font-bold text-sm text-primary whitespace-normal align-top">{hazard.hazard}</TableCell>
        <TableCell colSpan={6} className="text-center text-muted-foreground text-xs italic">No risks defined.</TableCell>
        <TableCell className="text-right align-top">
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => onEditClick(hazard)}>
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
          {showHazardCell && <TableCell rowSpan={totalRowsForHazard} className="font-bold text-sm text-primary whitespace-normal align-top pt-4">{hazard.hazard}</TableCell>}
          {isFirstRowOfRisk && <TableCell rowSpan={riskRowSpan} className={cn("whitespace-normal align-top text-sm font-medium pt-4", isLastRowOfRisk ? "" : "border-b")}>{risk.description}</TableCell>}
          {isFirstRowOfRisk && (
            <TableCell rowSpan={riskRowSpan} className={cn("align-top pt-4", isLastRowOfRisk ? "" : "border-b")}>
              {risk.initialRiskAssessment?.likelihood !== undefined && risk.initialRiskAssessment?.severity !== undefined && (
                <Badge className="text-[10px] h-5 font-black" style={getRiskScoreStyle(risk.initialRiskAssessment.riskScore)}>
                  {getAlphanumericRisk(risk.initialRiskAssessment.likelihood, risk.initialRiskAssessment.severity)}
                </Badge>
              )}
            </TableCell>
          )}
          <TableCell className="text-xs font-medium py-4">{mitigation.description}</TableCell>
          <TableCell className="py-4">
            {mitigation.residualRiskAssessment?.likelihood !== undefined && mitigation.residualRiskAssessment?.severity !== undefined ? (
              <Badge className="text-[10px] h-5 font-black" style={getRiskScoreStyle(mitigation.residualRiskAssessment.riskScore)}>
                {getAlphanumericRisk(mitigation.residualRiskAssessment.likelihood, mitigation.residualRiskAssessment.severity)}
              </Badge>
            ) : <Badge variant="outline" className="text-[10px] h-5 opacity-50 font-black">N/A</Badge>}
          </TableCell>
          <TableCell className="text-xs font-bold whitespace-nowrap py-4">{personnelMap.get(mitigation.responsiblePersonId) || 'N/A'}</TableCell>
          <TableCell className="text-xs font-bold whitespace-nowrap py-4">{mitigation.reviewDate ? format(new Date(mitigation.reviewDate), 'dd MMM yy') : 'N/A'}</TableCell>
          {showHazardCell && (
            <TableCell rowSpan={totalRowsForHazard} className="text-right align-top pt-4">
              <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-muted" onClick={() => onEditClick(hazard)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </TableCell>
          )}
        </TableRow>
      );
    });
  });
}
