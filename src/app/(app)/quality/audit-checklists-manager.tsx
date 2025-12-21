
'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function AuditChecklistsManager() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Checklist Template
        </Button>
      </div>
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">Checklist templates will be displayed here, grouped by department.</p>
      </div>
    </div>
  );
}
