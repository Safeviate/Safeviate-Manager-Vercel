'use client';

import { Wrench } from 'lucide-react';

export function ToolList() {
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-1 items-center justify-center px-6 py-20 text-center">
      <div className="space-y-4">
        <Wrench className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
        <div className="space-y-1">
          <p className="text-sm font-black uppercase tracking-widest text-foreground/70">
            Tool cards are temporarily removed
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            This section is being rebuilt to match the new card layout standard.
          </p>
        </div>
      </div>
    </div>
  );
}
