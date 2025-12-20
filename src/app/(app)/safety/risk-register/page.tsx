'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function RiskRegisterPage() {
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
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <p>Risk register table will be displayed here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
