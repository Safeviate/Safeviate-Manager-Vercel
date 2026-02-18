
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
import { RiskForm, type RiskFormValues } from './risk-form';
import { useToast } from '@/hooks/use-toast';

const HAZARD_AREAS = [
    'Flight Operations', 
    'Ground Operations',
    'Maintenance', 
    'Cabin Safety', 
    'Occupational Safety', 
    'Security', 
    'Administration & Management'
];

function getRiskScoreColor(score: number): string {
    if (score <= 4) return 'bg-green-500';
    if (score <= 9) return 'bg-yellow-500';
    if (score <= 16) return 'bg-orange-500';
    return 'bg-red-500';
}

export default function RiskRegisterPage() {
  const firestore = useFirestore();
  const tenantId = 'safeviate';
  const { toast } = useToast();

  const [editingRisk, setEditingRisk] = React.useState<Risk | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);


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
  
  const handleUpdateRisk = async (data: RiskFormValues) => {
    if (!firestore || !editingRisk) return;

    setIsSubmitting(true);
    try {
      const riskRef = doc(firestore, `tenants/${tenantId}/risks`, editingRisk.id);
      
      const riskScore = (data.likelihood || 1) * (data.severity || 1);
      const residualRiskScore = (data.residualLikelihood || 1) * (data.residualSeverity || 1);
      
      const updatedRisk = {
        ...data,
        riskScore,
        residualRiskScore,
        reviewDate: data.reviewDate ? data.reviewDate.toISOString() : undefined,
      };

      // Clean up undefined values before sending to Firestore
      Object.keys(updatedRisk).forEach(key => updatedRisk[key as keyof typeof updatedRisk] === undefined && delete updatedRisk[key as keyof typeof updatedRisk]);

      await updateDoc(riskRef, updatedRisk);

      toast({
        title: "Risk Updated",
        description: "The risk has been updated in the register.",
      });
      setIsDialogOpen(false);
      setEditingRisk(null);
    } catch (error) {
      console.error("Error updating risk:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update the risk.",
      });
    } finally {
      setIsSubmitting(false);
    }
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
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Risk
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
                                <TableHead className="w-[20%]">Hazard</TableHead>
                                <TableHead className="w-[20%]">Risk</TableHead>
                                <TableHead>Score</TableHead>
                                <TableHead>Residual Score</TableHead>
                                <TableHead>Responsible Person</TableHead>
                                <TableHead>Review Date</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {areaRisks.length > 0 ? (
                                areaRisks.map(risk => (
                                  <TableRow key={risk.id}>
                                    <TableCell className="font-medium whitespace-normal">{risk.hazard}</TableCell>
                                    <TableCell className="whitespace-normal">{risk.risk}</TableCell>
                                    <TableCell>
                                      <Badge style={{ backgroundColor: getRiskScoreColor(risk.riskScore), color: 'white' }}>
                                        {risk.riskScore}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {risk.residualRiskScore !== undefined ? (
                                        <Badge style={{ backgroundColor: getRiskScoreColor(risk.residualRiskScore), color: 'white' }}>
                                          {risk.residualRiskScore}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline">N/A</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>{personnelMap.get(risk.responsiblePersonId || '') || 'N/A'}</TableCell>
                                    <TableCell>{risk.reviewDate ? format(new Date(risk.reviewDate), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(risk)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              ) : (
                                <TableRow>
                                  <TableCell colSpan={7} className="h-24 text-center">
                                    No open risks in this area.
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
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
                      onSubmit={handleUpdateRisk}
                      isSubmitting={isSubmitting}
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
