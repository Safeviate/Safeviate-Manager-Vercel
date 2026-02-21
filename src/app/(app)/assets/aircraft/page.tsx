
'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function AircraftPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aircraft Fleet</h1>
          <p className="text-muted-foreground">
            Manage all aircraft in your organization.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Aircraft
        </Button>
      </div>
      {/* Table or list of aircraft will go here */}
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No aircraft have been added yet.</p>
      </div>
    </div>
  );
}
