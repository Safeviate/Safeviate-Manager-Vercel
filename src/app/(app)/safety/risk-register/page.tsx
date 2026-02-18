
'use client';

import * as React from 'react';
import { collection, query, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Edit } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk } from '@/types/risk';
import type { Personnel } from '@/app/(app)/users/personnel/page';
import { format } from 'date-fns';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { RiskForm } from './risk-form';
import { useToast } from '@/hooks/use-toast';
import { getRiskScoreColor } from './utils';
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

  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

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
                            {areaRisks.map((hazard) => {
                              const hazardRisks = hazard.risks || [];
                              const totalRowsForHazard = hazardRisks.reduce((acc, r) => acc + Math.max(1, (r.mitigations || []).length), 0);
                              let isFirstRowOfHazard = true;

                              return (
                                <TableBody key={hazard.id} className="border-b-2 last:border-b-0">
                                  {hazardRisks.flatMap((risk) => {
                                    const mitigations = risk.mitigations || [];
                                    const riskRowSpan = Math.max(1, mitigations.length);

                                    if (mitigations.length === 0) {
                                      const showHazardCell = isFirstRowOfHazard;
                                      isFirstRowOfHazard = false;
                                      return (
                                        <TableRow key={`${risk.id}-no-mit`} className="border-0">
                                          {showHazardCell && <TableCell rowSpan={totalRowsForHazard} className="font-medium whitespace-normal align-top">{hazard.hazard}</TableCell>}
                                          <TableCell className="whitespace-normal align-top">{risk.description}</TableCell>
                                          <TableCell className="align-top">
                                            {risk.initialRiskAssessment?.riskScore !== undefined && (
                                              <Badge style={{ backgroundColor: getRiskScoreColor(risk.initialRiskAssessment.riskScore), color: 'white' }}>
                                                {risk.initialRiskAssessment.riskScore}
                                              </Badge>
                                            )}
                                          </TableCell>
                                          <TableCell className="whitespace-normal">N/A</TableCell>
                                          <TableCell><Badge variant="outline">N/A</Badge></TableCell>
                                          <TableCell>N/A</TableCell>
                                          <TableCell>N/A</TableCell>
                                          {showHazardCell && (
                                            <TableCell rowSpan={totalRowsForHazard} className="text-right align-top">
                                              <Button variant="ghost" size="icon" onClick={() => handleEditClick(hazard)}>
                                                <Edit className="h-4 w-4" />
                                              </Button>
                                            </TableCell>
                                          )}
                                        </TableRow>
                                      );
                                    }

                                    return mitigations.map((mitigation, mitigationIndex) => {
                                      const showHazardCell = isFirstRowOfHazard;
                                      isFirstRowOfHazard = false;
                                      const showRiskCell = mitigationIndex === 0;
                                      const isLastMitigationInRisk = mitigationIndex === mitigations.length - 1;

                                      return (
                                        <TableRow key={mitigation.id} className="border-0">
                                          {showHazardCell && <TableCell rowSpan={totalRowsForHazard} className="font-medium whitespace-normal align-top">{hazard.hazard}</TableCell>}
                                          {showRiskCell && (
                                            <>
                                              <TableCell rowSpan={riskRowSpan} className="whitespace-normal align-top">{risk.description}</TableCell>
                                              <TableCell rowSpan={riskRowSpan} className="align-top">
                                                {risk.initialRiskAssessment?.riskScore !== undefined && (
                                                  <Badge style={{ backgroundColor: getRiskScoreColor(risk.initialRiskAssessment.riskScore), color: 'white' }}>
                                                    {risk.initialRiskAssessment.riskScore}
                                                  </Badge>
                                                )}
                                              </TableCell>
                                            </>
                                          )}
                                          <TableCell className={cn("whitespace-normal", !isLastMitigationInRisk && "border-b")}>{mitigation.description}</TableCell>
                                          <TableCell className={cn(!isLastMitigationInRisk && "border-b")}>
                                              {mitigation.residualRiskAssessment?.riskScore !== undefined ? (
                                                <Badge style={{ backgroundColor: getRiskScoreColor(mitigation.residualRiskAssessment.riskScore), color: 'white' }}>
                                                    {mitigation.residualRiskAssessment.riskScore}
                                                </Badge>
                                              ) : <Badge variant="outline">N/A</Badge>}
                                          </TableCell>
                                          <TableCell className={cn(!isLastMitigationInRisk && "border-b")}>{personnelMap.get(mitigation.responsiblePersonId) || 'N/A'}</TableCell>
                                          <TableCell className={cn(!isLastMitigationInRisk && "border-b")}>{mitigation.reviewDate ? format(new Date(mitigation.reviewDate), 'PPP') : 'N/A'}</TableCell>
                                          {showHazardCell && (
                                              <TableCell rowSpan={totalRowsForHazard} className="text-right align-top">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(hazard)}>
                                                  <Edit className="h-4 w-4" />
                                                </Button>
                                              </TableCell>
                                          )}
                                        </TableRow>
                                      );
                                    });
                                  })}
                                </TableBody>
                              )
                            })}
                            {areaRisks.length === 0 && (
                                <TableBody>
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No open risks in this area.
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
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
              <ScrollArea className="max-h-[80vh]">
                <div className="p-1">
                    <RiskForm
                      existingRisk={editingRisk}
                      personnel={personnel || []}
                      onCancel={() => setIsDialogOpen(false)}
                    />
                </div>
              </ScrollArea>
          </DialogContent>
      </Dialog>
    </>
  );
}
