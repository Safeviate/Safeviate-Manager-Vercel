
'use client';

import { Progress } from '@/components/ui/progress';

interface ServiceCountdownProps {
  label: string;
  hoursRemaining?: number | null;
  totalHours: number;
}

export function ServiceCountdown({ label, hoursRemaining, totalHours }: ServiceCountdownProps) {
  const remaining = hoursRemaining ?? 0;
  const progressPercentage = (remaining / totalHours) * 100;

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
        <p className="text-base font-semibold">{remaining.toFixed(1)} hrs left</p>
      </div>
      <Progress value={progressPercentage} className="h-2 [&>div]:bg-primary" />
    </div>
  );
}
