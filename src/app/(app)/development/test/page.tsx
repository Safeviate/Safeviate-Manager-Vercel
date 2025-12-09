'use client';

import * as React from 'react';
import { CustomCalendar } from '@/components/ui/custom-calendar';

export default function TestPage() {
  return (
    <div className="p-4">
      <div className="flex justify-center">
        <CustomCalendar />
      </div>
    </div>
  );
}
