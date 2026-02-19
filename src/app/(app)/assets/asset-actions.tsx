
'use client';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AssetActions() {
    return (
        <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
        </Button>
    )
}
