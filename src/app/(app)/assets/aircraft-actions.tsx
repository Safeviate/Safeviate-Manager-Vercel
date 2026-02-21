'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import type { Aircraft } from '@/types/aircraft';
import { usePermissions } from '@/hooks/use-permissions';

interface AircraftActionsProps {
  aircraft: Aircraft;
  onEdit: (aircraft: Aircraft) => void;
  onDelete: (aircraft: Aircraft) => void;
}

export function AircraftActions({ aircraft, onEdit, onDelete }: AircraftActionsProps) {
  const { hasPermission } = usePermissions();
  const canEdit = hasPermission('assets-edit');
  const canDelete = hasPermission('assets-delete');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canEdit && (
          <DropdownMenuItem onClick={() => onEdit(aircraft)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem
            onClick={() => onDelete(aircraft)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
