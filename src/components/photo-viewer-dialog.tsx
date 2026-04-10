'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export type PhotoViewerItem = {
  url: string;
  name: string;
};

type PhotoViewerDialogProps = {
  photos: PhotoViewerItem[];
  emptyLabel?: string;
  title?: string;
};

export function PhotoViewerDialog({
  photos,
  emptyLabel = 'No photos available.',
  title = 'Photo Viewer',
}: PhotoViewerDialogProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoViewerItem | null>(null);

  if (!photos.length) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {photos.map((photo) => (
          <Button
            key={photo.url}
            type="button"
            variant="ghost"
            className="h-auto p-0"
            onClick={() => setSelectedPhoto(photo)}
          >
            <span className="block w-full overflow-hidden rounded-md border bg-background">
              <img src={photo.url} alt={photo.name} className="h-28 w-full object-cover" />
              <span className="block px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                {photo.name}
              </span>
            </span>
          </Button>
        ))}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhoto(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{selectedPhoto?.name}</DialogDescription>
          </DialogHeader>
          {selectedPhoto ? (
            <div className="overflow-hidden rounded-md border bg-background">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="max-h-[60vh] w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
