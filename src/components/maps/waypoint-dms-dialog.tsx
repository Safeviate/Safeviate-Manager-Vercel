'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

type Hemisphere = 'N' | 'S' | 'E' | 'W';

type WaypointDmsDialogProps = {
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  triggerLabel?: string;
  triggerClassName?: string;
  triggerIconOnly?: boolean;
  defaultIdentifier?: string;
};

function buildDecimalFromParts(
  degreesInput: string,
  minutesInput: string,
  secondsInput: string,
  hemisphere: Hemisphere,
  axis: 'lat' | 'lon',
) {
  const degrees = Number(degreesInput);
  const minutes = Number(minutesInput);
  const seconds = Number(secondsInput);

  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || !Number.isFinite(seconds)) return null;

  const maxDegrees = axis === 'lat' ? 90 : 180;
  if (degrees < 0 || degrees > maxDegrees) return null;
  if (minutes < 0 || minutes >= 60) return null;
  if (seconds < 0 || seconds >= 60) return null;

  if (axis === 'lat' && !['N', 'S'].includes(hemisphere)) return null;
  if (axis === 'lon' && !['E', 'W'].includes(hemisphere)) return null;

  const decimal = degrees + minutes / 60 + seconds / 3600;
  return hemisphere === 'S' || hemisphere === 'W' ? -decimal : decimal;
}

function HemisphereToggle({
  value,
  axis,
  onChange,
}: {
  value: Hemisphere;
  axis: 'lat' | 'lon';
  onChange: (value: Hemisphere) => void;
}) {
  const options: Hemisphere[] = axis === 'lat' ? ['N', 'S'] : ['E', 'W'];

  return (
    <div className="flex items-center gap-1">
      {options.map((option) => (
        <Button
          key={option}
          type="button"
          size="sm"
          variant={value === option ? 'default' : 'outline'}
          className="h-9 px-3 text-[10px] font-black uppercase"
          onClick={() => onChange(option)}
        >
          {option}
        </Button>
      ))}
    </div>
  );
}

export function WaypointDmsDialog({
  onAddWaypoint,
  triggerLabel = 'Add DMS Waypoint',
  triggerClassName,
  triggerIconOnly = false,
  defaultIdentifier = 'PNT',
}: WaypointDmsDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState(defaultIdentifier);

  const [latDegrees, setLatDegrees] = useState('');
  const [latMinutes, setLatMinutes] = useState('');
  const [latSeconds, setLatSeconds] = useState('');
  const [latHemisphere, setLatHemisphere] = useState<Hemisphere>('S');

  const [lonDegrees, setLonDegrees] = useState('');
  const [lonMinutes, setLonMinutes] = useState('');
  const [lonSeconds, setLonSeconds] = useState('');
  const [lonHemisphere, setLonHemisphere] = useState<Hemisphere>('E');

  const reset = () => {
    setIdentifier(defaultIdentifier);
    setLatDegrees('');
    setLatMinutes('');
    setLatSeconds('');
    setLatHemisphere('S');
    setLonDegrees('');
    setLonMinutes('');
    setLonSeconds('');
    setLonHemisphere('E');
  };

  const handleSubmit = () => {
    const latitude = buildDecimalFromParts(latDegrees, latMinutes, latSeconds, latHemisphere, 'lat');
    const longitude = buildDecimalFromParts(lonDegrees, lonMinutes, lonSeconds, lonHemisphere, 'lon');

    if (latitude == null || longitude == null) {
      toast({
        variant: 'destructive',
        title: 'Invalid coordinates',
        description: 'Enter degrees, minutes, seconds, and a hemisphere for both latitude and longitude.',
      });
      return;
    }

    onAddWaypoint(latitude, longitude, identifier.trim() || defaultIdentifier);
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
          aria-label={triggerIconOnly ? triggerLabel : undefined}
          title={triggerIconOnly ? triggerLabel : undefined}
        >
          <Plus className={triggerIconOnly ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
          {triggerIconOnly ? <span className="sr-only">{triggerLabel}</span> : triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-black uppercase tracking-widest">Add Waypoint by DMS</DialogTitle>
          <DialogDescription className="text-xs">
            Enter latitude and longitude as separate aviation DMS parts. Hemisphere is selected manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Waypoint Label</label>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="PNT"
              className="h-9 text-sm font-bold uppercase"
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latitude</label>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto] gap-2">
                <Input value={latDegrees} onChange={(event) => setLatDegrees(event.target.value)} placeholder="25" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
                <Input value={latMinutes} onChange={(event) => setLatMinutes(event.target.value)} placeholder="45" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
                <Input value={latSeconds} onChange={(event) => setLatSeconds(event.target.value)} placeholder="42.49" inputMode="decimal" className="h-9 text-sm font-mono font-bold" />
                <HemisphereToggle axis="lat" value={latHemisphere} onChange={setLatHemisphere} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Longitude</label>
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto] gap-2">
                <Input value={lonDegrees} onChange={(event) => setLonDegrees(event.target.value)} placeholder="028" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
                <Input value={lonMinutes} onChange={(event) => setLonMinutes(event.target.value)} placeholder="48" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
                <Input value={lonSeconds} onChange={(event) => setLonSeconds(event.target.value)} placeholder="30.86" inputMode="decimal" className="h-9 text-sm font-mono font-bold" />
                <HemisphereToggle axis="lon" value={lonHemisphere} onChange={setLonHemisphere} />
              </div>
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
