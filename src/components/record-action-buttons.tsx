'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type ViewActionButtonProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
};

export function ViewActionButton({ href, onClick, label = 'View' }: ViewActionButtonProps) {
  const isMobile = useIsMobile();
  const content = (
    <>
      <Eye className="h-4 w-4" />
      {isMobile ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </>
  );

  if (href) {
    return (
      <Button
        asChild
        variant="outline"
        size={isMobile ? "icon" : "compact"}
        className={isMobile ? "h-8 w-8 border-slate-300 p-0" : "border-slate-300"}
      >
        <Link href={href}>{content}</Link>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size={isMobile ? "icon" : "compact"}
      className={isMobile ? "h-8 w-8 border-slate-300 p-0" : "border-slate-300"}
      onClick={onClick}
    >
      {content}
    </Button>
  );
}

type EditActionButtonProps = {
  onClick?: () => void;
  label?: string;
  className?: string;
};

export function EditActionButton({ onClick, label = 'Edit', className }: EditActionButtonProps) {
  const isMobile = useIsMobile();

  return (
    <Button
      variant="outline"
      size={isMobile ? "icon" : "icon"}
      className={`${isMobile ? "h-8 w-8 border-slate-300 p-0" : "h-8 w-8 border-slate-300 p-0"}${className ? ` ${className}` : ''}`}
      onClick={onClick}
    >
      <Pencil className="h-4 w-4" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}

type DeleteActionButtonProps = {
  title?: string;
  description: string;
  onDelete: () => void;
  srLabel?: string;
  iconOnly?: boolean;
};

export function DeleteActionButton({
  title = 'Are you sure?',
  description,
  onDelete,
  srLabel = 'Delete',
  iconOnly = true,
}: DeleteActionButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size={iconOnly ? "icon" : "compact"}
          className={iconOnly ? "h-8 w-8" : "h-8 gap-2"}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {iconOnly ? <span className="sr-only">{srLabel}</span> : <span>Delete</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
