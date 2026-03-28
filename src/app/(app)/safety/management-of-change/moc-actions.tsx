'use client';

import { doc } from 'firebase/firestore';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange } from '@/types/moc';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface MocActionsProps {
  moc: ManagementOfChange;
  tenantId: string;
}

export function MocActions({ moc, tenantId }: MocActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const isMobile = useIsMobile();
  
  const canManage = hasPermission('moc-manage');

  const handleDelete = () => {
    if (!firestore) return;
    const mocRef = doc(firestore, `tenants/${tenantId}/management-of-change`, moc.id);
    deleteDocumentNonBlocking(mocRef);
    toast({
        title: "MOC Deleted",
        description: `MOC #${moc.mocNumber} is being deleted.`
    });
  };

  if (isMobile) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="w-32 h-9 flex justify-between items-center px-3 border-slate-200 bg-white font-black uppercase text-[10px] tracking-tight shadow-sm"
                >
                    <span>Actions</span>
                    <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                    <Link href={`/safety/management-of-change/${moc.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View MOC
                    </Link>
                </DropdownMenuItem>
                {canManage && (
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete MOC
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <ViewActionButton href={`/safety/management-of-change/${moc.id}`} />
      {canManage && (
        <DeleteActionButton
          description={`This will permanently delete the MOC "${moc.mocNumber}: ${moc.title}". This action cannot be undone.`}
          onDelete={handleDelete}
          srLabel="Delete MOC"
        />
      )}
    </div>
  );
}