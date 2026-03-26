'use client';

import { doc } from 'firebase/firestore';
import { useFirestore, deleteDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { ManagementOfChange } from '@/types/moc';
import { usePermissions } from '@/hooks/use-permissions';
import { DeleteActionButton, ViewActionButton } from '@/components/record-action-buttons';

interface MocActionsProps {
  moc: ManagementOfChange;
  tenantId: string;
}

export function MocActions({ moc, tenantId }: MocActionsProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  
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
