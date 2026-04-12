'use client';

import { CostPredictor } from '@/app/(app)/accounting/cost-predictor';

export default function UsageEstimatorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="px-1">
        <h1 className="text-3xl font-bold tracking-tight">Vercel + Prisma Estimator</h1>
        <p className="text-muted-foreground">
          Estimate Vercel traffic, database usage, and Prisma cost from your current user mix.
        </p>
      </div>
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <CostPredictor />
      </div>
    </div>
  );
}
