
'use client';

import * as React from 'react';
import { collection, query } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk, RiskItem, Mitigation } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RiskForm } from '../risk-form';
import { getRiskScoreStyle } from './utils';
import { cn } from '@/lib/utils';

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
  const tenantId = 'safeviate';

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);

  React.useEffect(() => {
    if (!isDialogOpen) {
      setEditingRisk(null);
    }
  }, [isDialogOpen]);

  const risksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/risks`)) : null),
    [firestore, tenantId]
  );
  
  const personnelQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/personnel`)) : null),
    [firestore, tenantId]
  );

  const { data: risks, isLoading: isLoadingRisks, error: risksError } = useCollection<Risk>(risksQuery);
  const { data: personnel, isLoading: isLoadingPersonnel, error: personnelError } = useCollection<Personnel>(personnelQuery);

  const personnelMap = React.useMemo(() => {
    if (!personnel) return new Map<string, string>();
    return new Map(personnel.map(p => [p.id, `${p.firstName} ${p.lastName}`]));
  }, [personnel]);
  
  const isLoading = isLoadingRisks || isLoadingPersonnel;
  const error = risksError || personnelError;
  
  const handleEditClick = (risk: Risk) => {
    setEditingRisk(risk);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organizational Risk Register</h1>
            <p className="text-muted-foreground">A live register of all identified organizational risks.</p>
          </div>
          <Button asChild>
            <Link href="/safety/risk-register/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Hazard
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading && (
              <div className="p-6 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            )}
            {error && <p className="p-6 text-destructive text-center">Error loading risks: {error.message}</p>}
            {!isLoading && !error && risks && (
              <Tabs defaultValue={HAZARD_AREAS[0]} className="p-6">
                <ScrollArea className="w-full whitespace-nowrap">
                  <TabsList>
                    {HAZARD_AREAS.map(area => <TabsTrigger key={area} value={area}>{area}</TabsTrigger>)}
                  </TabsList>
                </ScrollArea>
                {HAZARD_AREAS.map(area => {
                  const areaRisks = risks.filter(r => r.hazardArea === area && r.status === 'Open');
                  return (
                    <TabsContent key={area} value={area} className="mt-4">
                      <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-[15%]">Hazard</TableHead>
                                <TableHead className="w-[15%]">Risk</TableHead>
                                <TableHead>Initial Score</TableHead>
                                <TableHead className="w-[20%]">Mitigation</TableHead>
                                <TableHead>Residual Score</TableHead>
                                <TableHead>Responsible</TableHead>
                                <TableHead>Next Review</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            {areaRisks.length > 0 ? (
                              areaRisks.map(hazard => (
                                <tbody key={hazard.id} className='border-b-2'>
                                  <RiskGroup hazard={hazard} personnelMap={personnelMap} onEditClick={handleEditClick} />
                                </tbody>
                              ))
                            ) : (
                               <tbody>
                                  <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
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
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl">
            {isDialogOpen && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Hazard</DialogTitle>
                  <DialogDescription>
                    Update the details for the selected hazard and its associated risks.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[80vh]">
                  <div className="p-1">
                      <RiskForm
                        hideHeader
                        existingRisk={editingRisk}
                        personnel={personnel || []}
                        onCancel={() => setIsDialogOpen(false)}
                      />
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
      </Dialog>
    </>
  );
}


function RiskGroup({ hazard, personnelMap, onEditClick }: { hazard: Risk; personnelMap: Map<string, string>; onEditClick: (risk: Risk) => void; }) {
  const hazardRisks = hazard.risks || [];
  const totalRowsForHazard = hazardRisks.reduce((acc, r) => acc + Math.max(1, (r.mitigations || []).length), 0);

  if (hazardRisks.length === 0) {
    return (
      <TableRow>
        <TableCell className="font-medium whitespace-normal align-top">{hazard.hazard}</TableCell>
        <TableCell colSpan={6} className="text-center text-muted-foreground">No risks defined for this hazard.</TableCell>
        <TableCell className="text-right align-top">
          <Button variant="ghost" size="icon" onClick={() => onEditClick(hazard)}>
            <Edit className="h-4 w-4" />
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
          {showHazardCell && <TableCell rowSpan={totalRowsForHazard} className="font-medium whitespace-normal align-top">{hazard.hazard}</TableCell>}
          {isFirstRowOfRisk && <TableCell rowSpan={riskRowSpan} className={cn("whitespace-normal align-top", isLastRowOfRisk ? "" : "border-b")}>{risk.description}</TableCell>}
          {isFirstRowOfRisk && (
            <TableCell rowSpan={riskRowSpan} className={cn("align-top", isLastRowOfRisk ? "" : "border-b")}>
              {risk.initialRiskAssessment?.riskScore !== undefined && (
                <Badge style={getRiskScoreStyle(risk.initialRiskAssessment.riskScore)}>
                  {risk.initialRiskAssessment.riskScore}
                </Badge>
              )}
            </TableCell>
          )}
          <TableCell>{mitigation.description}</TableCell>
          <TableCell>
            {mitigation.residualRiskAssessment?.riskScore !== undefined ? (
              <Badge style={getRiskScoreStyle(mitigation.residualRiskAssessment.riskScore)}>
                {mitigation.residualRiskAssessment.riskScore}
              </Badge>
            ) : <Badge variant="outline">N/A</Badge>}
          </TableCell>
          <TableCell>{personnelMap.get(mitigation.responsiblePersonId) || 'N/A'}</TableCell>
          <TableCell>{mitigation.reviewDate ? format(new Date(mitigation.reviewDate), 'PPP') : 'N/A'}</TableCell>
          {showHazardCell && (
            <TableCell rowSpan={totalRowsForHazard} className="text-right align-top">
              <Button variant="ghost" size="icon" onClick={() => onEditClick(hazard)}>
                <Edit className="h-4 w-4" />
              </Button>
            </TableCell>
          )}
        </TableRow>
      );
    });
  });
}
