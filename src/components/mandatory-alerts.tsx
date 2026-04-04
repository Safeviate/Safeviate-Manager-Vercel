'use client';

import type { Alert } from '@/types/alert';

interface MandatoryAlertsProps {
  alerts: Alert[];
  onAcknowledged: () => void;
}

export function MandatoryAlerts({ onAcknowledged }: MandatoryAlertsProps) {
  onAcknowledged();
  return null;
}
