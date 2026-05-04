'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { parseWaypointCoordinatesDms } from '@/components/maps/waypoint-coordinate-utils';

type WaypointDmsDialogProps = {
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  triggerLabel?: string;
  triggerClassName?: string;
  defaultIdentifier?: string;
};

export function WaypointDmsDialog({
  onAddWaypoint,
  triggerLabel = 'Add DMS Waypoint',
  triggerClassName,
  defaultIdentifier = 'PNT',
}: WaypointDmsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState(defaultIdentifier);
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');

  const reset = () => {
    setIdentifier(defaultIdentifier);
    setLatitudeInput('');
    setLongitudeInput('');
  };

  const handleSubmit = () => {
    const coordinates = parseWaypointCoordinatesDms(latitudeInput, longitudeInput);
    if (!coordinates) {
      toast({
        variant: 'destructive',
        title: 'Invalid coordinates',
        description: 'Enter latitude and longitude in aviation DMS format, for example 25°56\'00"S and 027°50\'00"E.',
      });
      return;
    }

    onAddWaypoint(
      coordinates.latitude,
      coordinates.longitude,
      identifier.trim() || defaultIdentifier,
    );
    setOpen(false);
    reset();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={triggerClassName}
        >
          <Plus className="mr-2 h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest">Add Waypoint by DMS</DialogTitle>
          <DialogDescription className="text-xs">
            Enter standard aviation degrees, minutes, and seconds. Example: 25°56&apos;00&quot;S and 027°50&apos;00&quot;E.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Waypoint Label</label>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="PNT"
              className="h-9 text-sm font-bold uppercase"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latitude</label>
              <Input
                value={latitudeInput}
                onChange={(event) => setLatitudeInput(event.target.value)}
                placeholder={`25°56'00"S`}
                className="h-9 text-sm font-mono font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Longitude</label>
              <Input
                value={longitudeInput}
                onChange={(event) => setLongitudeInput(event.target.value)}
                placeholder={`027°50'00"E`}
                className="h-9 text-sm font-mono font-bold"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Add Waypoint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
