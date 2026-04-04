'use client';

import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PlusCircle, Edit, Settings2, Trash2, Plus, LayoutGrid, MoreHorizontal, ChevronDown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk, Mitigation } from '@/types/risk';
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { MainPageHeader } from '@/components/page-header';
import { useIsMobile } from '@/hooks/use-mobile';
import { OrganizationTabsRow, ResponsiveTabRow } from '@/components/responsive-tab-row';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const DEFAULT_HAZARD_AREAS = [
  'Flight Operations',
  'Ground Operations',
  'Maintenance',
  'Cabin Safety',
  'Occupational Safety',
  'Security',
  'Administration & Management',
];

function ManageAreasDialog({ settings, trigger }: { settings: string[]; trigger?: ReactNode }) {
  const { toast } = useToast();
  const [newArea, setNewArea] = useState('');
  const [areas, setAreas] = useState<string[]>(settings);

  useEffect(() => {
    setAreas(settings);
  }, [settings]);

  const save = (updatedAreas: string[]) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('safeviate:risk-register-areas', JSON.stringify(updatedAreas));
    toast({ title: 'Hazard Areas Updated' });
  };

  const handleAdd = () => {
    if (newArea.trim() && !areas.includes(newArea.trim())) {
      const updated = [...areas, newArea.trim()];
      setAreas(updated);
      save(updated);
      setNewArea('');
    }
  };

  const handleRemove = (areaToRemove: string) => {
    const updated = areas.filter((a) => a !== areaToRemove);
    setAreas(updated);
    save(updated);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-9 px-3 sm:px-4 gap-2 rounded-md border-slate-300 text-xs font-black uppercase shadow-sm">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Areas</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Risk Register Categories</DialogTitle>
          <DialogDescription>Add or remove the menu tabs used to organize your hazard register.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <input
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
            {areas.map((area) => (
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
  const { tenantId } = useUserProfile();
  const { hasPermission } = usePermissions();
  const { scopedOrganizationId, shouldShowOrganizationTabs } = useOrganizationScope({ viewAllPermissionId: 'risk-register-view' });
  const isMobile = useIsMobile();

  const [activeOrgTab, setActiveOrgTab] = useState('internal');
  const [activeAreaTab, setActiveAreaTab] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [allRisks, setAllRisks] = useState<Risk[]>([]);
  const [organizations, setOrganizations] = useState<ExternalOrganization[]>([]);
  const [hazardAreas, setHazardAreas] = useState<string[]>(DEFAULT_HAZARD_AREAS);
  const [isLoading, setIsLoading] = useState(true);

  const canManageAreas = hasPermission('risk-register-manage-definitions');
  const [visibilitySettings, setVisibilitySettings] = useState<{ visibilities?: Record<string, boolean> } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedAreas = window.localStorage.getItem('safeviate:risk-register-areas');
    if (storedAreas) {
      try {
        setHazardAreas(JSON.parse(storedAreas));
      } catch {}
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      try {
        const personnelResponse = await fetch('/api/personnel', { cache: 'no-store' });
        const personnelPayload = await personnelResponse.json();
        const registerData = typeof window !== 'undefined' ? window.localStorage.getItem('safeviate:risk-register-data') : null;
        if (!cancelled) {
          setPersonnel(personnelPayload?.personnel ?? []);
          setOrganizations([]);
          setAllRisks(registerData ? (JSON.parse(registerData) as Risk[]) : []);
          setVisibilitySettings({ visibilities: { 'risk-register': true } });
        }
      } catch {
        if (!cancelled) {
          setPersonnel([]);
          setAllRisks([]);
          setOrganizations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  const personnelMap = useMemo(() => {
    if (!personnel) return new Map<string, string>();
    return new Map(personnel.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [personnel]);

  const handleEditClick = (risk: Risk) => setEditingRisk(risk);
  const isTabEnabled = visibilitySettings?.visibilities?.['risk-register'] ?? true;
  const showTabs = isTabEnabled && shouldShowOrganizationTabs;

  const renderOrgCard = (orgId: string | 'internal') => {
    const orgRisks = (allRisks || []).filter((r) => (orgId === 'internal' ? !r.organizationId : r.organizationId === orgId));
    const uncategorizedRisks = orgRisks.filter((r) => !hazardAreas.includes(r.hazardArea) && r.status === 'Open');
    const displayAreas = uncategorizedRisks.length > 0 ? [...hazardAreas, 'Uncategorized'] : hazardAreas;

    return (
      <Card className="flex-1 flex flex-col overflow-hidden shadow-none border rounded-xl">
        <div className="sticky top-0 z-30 bg-card">
          <MainPageHeader
            title="Risk Register"
            description="Central log for identifying, assessing, and mitigating operational hazards."
            actions={
              isMobile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-full justify-between bg-white px-3 text-[10px] font-bold uppercase text-slate-900 shadow-sm border-slate-200 hover:bg-slate-50">
                      <span className="flex items-center gap-2">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                        Actions
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canManageAreas && <ManageAreasDialog settings={hazardAreas} trigger={<DropdownMenuItem onSelect={(e) => e.preventDefault()}><Settings2 className="mr-2 h-4 w-4" />Manage Areas</DropdownMenuItem>} />}
                    <DropdownMenuItem asChild>
                      <Link href={`/safety/risk-register/new?orgId=${orgId}`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Hazard
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex w-full items-center gap-3 sm:w-auto">
                  {canManageAreas && <ManageAreasDialog settings={hazardAreas} />}
                  <Button asChild size="sm" className="h-9 px-6 text-xs font-black uppercase tracking-tight bg-emerald-700 hover:bg-emerald-800 text-white shadow-md gap-2">
                    <Link href={`/safety/risk-register/new?orgId=${orgId}`}>
                      <PlusCircle className="h-4 w-4" />
                      Add Hazard
                    </Link>
                  </Button>
                </div>
              )
            }
          />
        </div>
        <CardContent className="flex-1 p-0 overflow-hidden bg-background">
          <Tabs value={activeAreaTab} onValueChange={setActiveAreaTab} className="h-full flex flex-col">
            <ResponsiveTabRow
              value={activeAreaTab}
              onValueChange={setActiveAreaTab}
              placeholder="Select Area"
              className="border-b bg-muted/5 px-4 py-3 shrink-0"
              options={displayAreas.map((area) => ({ value: area, label: area, icon: LayoutGrid }))}
            />
            <div className="flex-1 overflow-auto">
              {displayAreas.map((area) => {
                const areaRisks = area === 'Uncategorized' ? uncategorizedRisks : orgRisks.filter((r) => r.hazardArea === area && r.status === 'Open');
                return (
                  <TabsContent key={area} value={area} className="mt-0 h-full">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-muted/30 sticky top-0 z-10">
                          <TableRow>
                            <TableHead className="w-[15%] text-[10px] uppercase font-bold tracking-wider">Hazard</TableHead>
                            <TableHead className="w-[15%] text-[10px] uppercase font-bold tracking-wider">Risk</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Initial</TableHead>
                            <TableHead className="w-[20%] text-[10px] uppercase font-bold tracking-wider">Mitigation</TableHead>
                            <TableHead className="text-[10px] uppercase font-bold tracking-wider">Residual</TableHead>
                            <TableHead className={cn('text-[10px] uppercase font-bold tracking-wider', isMobile && 'hidden')}>Responsible</TableHead>
                            <TableHead className={cn('text-[10px] uppercase font-bold tracking-wider', isMobile && 'hidden')}>Review</TableHead>
                            <TableHead className="text-right text-[10px] uppercase font-bold tracking-wider">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        {areaRisks.length > 0 ? (
                          areaRisks.map((hazard) => (
                            <tbody key={hazard.id} className="border-b">
                              <RiskGroup hazard={hazard} personnelMap={personnelMap} onEditClick={handleEditClick} isMobile={isMobile} />
                            </tbody>
                          ))
                        ) : (
                          <tbody>
                            <TableRow>
                              <TableCell colSpan={isMobile ? 6 : 8} className="h-48 text-center text-muted-foreground italic text-sm">
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

  return (
    <div className="max-w-[1400px] mx-auto w-full flex flex-col gap-6 h-full overflow-hidden pt-2 px-1">
      {!showTabs ? (
        renderOrgCard(scopedOrganizationId)
      ) : (
        <Tabs value={activeOrgTab} onValueChange={setActiveOrgTab} className="w-full flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="internal" className="mt-0 h-full">{renderOrgCard('internal')}</TabsContent>
            {(organizations || []).map((org) => (
              <TabsContent key={org.id} value={org.id} className="mt-0 h-full">{renderOrgCard(org.id)}</TabsContent>
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
              <RiskForm hideHeader existingRisk={editingRisk} personnel={personnel || []} onCancel={() => setIsDialogOpen(false)} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RiskGroup({ hazard, personnelMap, onEditClick, isMobile }: { hazard: Risk; personnelMap: Map<string, string>; onEditClick: (risk: Risk) => void; isMobile?: boolean }) {
  const hazardRisks = hazard.risks || [];
  const totalRowsForHazard = hazardRisks.reduce((acc, r) => acc + Math.max(1, (r.mitigations || []).length), 0);

  if (hazardRisks.length === 0) {
    return (
      <TableRow>
        <TableCell className="font-bold text-sm text-primary whitespace-normal align-top">{hazard.hazard}</TableCell>
        <TableCell colSpan={isMobile ? 4 : 6} className="text-center text-muted-foreground text-xs italic">No risks defined.</TableCell>
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
          {isFirstRowOfRisk && <TableCell rowSpan={riskRowSpan} className={cn('whitespace-normal align-top text-sm font-medium pt-4', isLastRowOfRisk ? '' : 'border-b')}>{risk.description}</TableCell>}
          {isFirstRowOfRisk && (
            <TableCell rowSpan={riskRowSpan} className={cn('align-top pt-4', isLastRowOfRisk ? '' : 'border-b')}>
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
          <TableCell className={cn('text-xs font-bold whitespace-nowrap py-4', isMobile && 'hidden')}>{personnelMap.get(mitigation.responsiblePersonId) || 'N/A'}</TableCell>
          <TableCell className={cn('text-xs font-bold whitespace-nowrap py-4', isMobile && 'hidden')}>{mitigation.reviewDate ? format(new Date(mitigation.reviewDate), 'dd MMM yy') : 'N/A'}</TableCell>
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
