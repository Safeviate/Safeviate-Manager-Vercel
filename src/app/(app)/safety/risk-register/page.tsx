
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
import { PlusCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { Risk } from '@/types/risk';

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

  const risksQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, `tenants/${tenantId}/risks`)) : null),
    [firestore, tenantId]
  );
  
  const { data: risks, isLoading, error } = useCollection<Risk>(risksQuery);

  return (
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
                              <TableHead className="w-[30%]">Hazard</TableHead>
                              <TableHead className="w-[30%]">Risk</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Residual Score</TableHead>
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
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
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
  );
}
