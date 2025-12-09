'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function DepartmentPage() {
  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex justify-end">
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Department
        </Button>
      </div>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl font-bold tracking-tight">
            You have no departments
          </h3>
          <p className="text-sm text-muted-foreground">
            You can start by adding a new department.
          </p>
        </div>
      </div>
    </div>
  );
}
