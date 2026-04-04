'use client';

import { CostPredictor } from '@/app/(app)/accounting/cost-predictor';

export default function DevelopmentCostPredictorPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="px-1">
        <h1 className="text-3xl font-bold tracking-tight">Cost Predictor</h1>
        <p className="text-muted-foreground">
          Model cloud operational costs based on company size and activity.
        </p>
      </div>
      <div className="border rounded-xl overflow-hidden shadow-sm">
        <CostPredictor />
      </div>
    </div>
  );
}
