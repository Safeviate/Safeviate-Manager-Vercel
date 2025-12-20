'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { RiskAssessment } from '@/types/safety-report';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type Risk = {
    id: string;
    hazard: string;
    risk: string;
    hazardArea: string;
    process?: string;
    initialRiskAssessment: RiskAssessment;
    mitigationControls: string;
    mitigatedRiskAssessment: RiskAssessment;
    riskOwnerId: string;
    status: 'Open' | 'Mitigated' | 'Closed';
}

const getRiskLevelVariant = (level: Risk['initialRiskAssessment']['riskLevel']) => {
    switch (level) {
        case 'Critical':
        case 'High':
            return 'destructive';
        case 'Medium':
            return 'secondary';
        case 'Low':
            return 'default';
        default:
            return 'outline';
    }
}

const getStatusVariant = (status: Risk['status']) => {
    switch (status) {
        case 'Open':
            return 'destructive';
        case 'Mitigated':
            return 'secondary';
        case 'Closed':
            return 'default';
        default:
            return 'outline';
    }
}


export default function RiskRegisterPage() {
    const firestore = useFirestore();
    const tenantId = 'safeviate';

    const risksQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'tenants', tenantId, 'risks')) : null),
        [firestore, tenantId]
    );

    const { data: risks, isLoading, error } = useCollection<Risk>(risksQuery);

  return (
    <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Risk Register</h1>
                <p className="text-muted-foreground">
                    A central repository for all identified organizational risks.
                </p>
            </div>
            <Button asChild>
                <Link href="/safety/risk-register/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Risk
                </Link>
            </Button>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Organizational Risks</CardTitle>
          <CardDescription>
            A list of all ongoing hazards and their mitigation status.
          </CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading && <p>Loading risks...</p>}
            {error && <p className="text-destructive">Error loading risks: {error.message}</p>}
            {!isLoading && risks && (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Hazard</TableHead>
                            <TableHead>Risk</TableHead>
                            <TableHead>Initial Score</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {risks.length > 0 ? (
                            risks.map(risk => (
                                <TableRow key={risk.id}>
                                    <TableCell className="max-w-xs truncate">{risk.hazard}</TableCell>
                                    <TableCell className="max-w-xs truncate">{risk.risk}</TableCell>
                                    <TableCell>
                                        <Badge variant={getRiskLevelVariant(risk.initialRiskAssessment.riskLevel)}>
                                            {risk.initialRiskAssessment.riskLevel} ({risk.initialRiskAssessment.riskScore})
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getStatusVariant(risk.status)}>{risk.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/safety/risk-register/${risk.id}/edit`}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No risks have been added to the register.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
