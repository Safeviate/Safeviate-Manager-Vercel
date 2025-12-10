
'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ServiceCountdownProps {
  label: string;
  currentTacho?: number | null;
  tachoAtNextInspection?: number | null;
  inspectionInterval: number;
}

export function ServiceCountdown({ 
  label, 
  currentTacho, 
  tachoAtNextInspection, 
  inspectionInterval 
}: ServiceCountdownProps) {
  const current = currentTacho ?? 0;
  const next = tachoAtNextInspection ?? 0;

  const hoursRemaining = Math.max(0, next - current);
  const progressPercentage = Math.max(0, (hoursRemaining / inspectionInterval) * 100);

  let progressColorClass = 'bg-primary'; // Default color
  if (progressPercentage <= 20) {
    progressColorClass = 'bg-destructive'; // e.g., Red for <= 10 hours on a 50hr inspection
  } else if (progressPercentage <= 50) {
    progressColorClass = 'bg-yellow-500'; // e.g., Yellow for <= 25 hours
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-base font-semibold">{hoursRemaining.toFixed(1)} hrs left</p>
      </div>
      <Progress value={progressPercentage} className="h-2" indicatorClassName={progressColorClass} />
    </div>
  );
}
