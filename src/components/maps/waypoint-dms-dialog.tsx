'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

type WaypointDmsFormProps = {
  onAddWaypoint: (lat: number, lon: number, identifier?: string, frequencies?: string, layerInfo?: string) => void;
  defaultIdentifier?: string;
  submitLabel?: string;
  onCancel?: () => void;
  showCancel?: boolean;
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

type WaypointDmsFormState = {
  identifier: string;
  latDegrees: string;
  latMinutes: string;
  latSeconds: string;
  latHemisphere: Hemisphere;
  lonDegrees: string;
  lonMinutes: string;
  lonSeconds: string;
  lonHemisphere: Hemisphere;
};

function createInitialDmsState(defaultIdentifier: string): WaypointDmsFormState {
  return {
    identifier: defaultIdentifier,
    latDegrees: '',
    latMinutes: '',
    latSeconds: '',
    latHemisphere: 'S',
    lonDegrees: '',
    lonMinutes: '',
    lonSeconds: '',
    lonHemisphere: 'E',
  };
}

export function WaypointDmsForm({
  onAddWaypoint,
  defaultIdentifier = 'PNT',
  submitLabel = 'Add Waypoint',
  onCancel,
  showCancel = true,
}: WaypointDmsFormProps) {
  const { toast } = useToast();
  const [state, setState] = useState<WaypointDmsFormState>(() => createInitialDmsState(defaultIdentifier));

  const reset = () => {
    setState(createInitialDmsState(defaultIdentifier));
  };

  const handleSubmit = () => {
    const latitude = buildDecimalFromParts(state.latDegrees, state.latMinutes, state.latSeconds, state.latHemisphere, 'lat');
    const longitude = buildDecimalFromParts(state.lonDegrees, state.lonMinutes, state.lonSeconds, state.lonHemisphere, 'lon');

    if (latitude == null || longitude == null) {
      toast({
        variant: 'destructive',
        title: 'Invalid coordinates',
        description: 'Enter degrees, minutes, seconds, and a hemisphere for both latitude and longitude.',
      });
      return;
    }

    onAddWaypoint(latitude, longitude, state.identifier.trim() || defaultIdentifier);
    reset();
  };

  const updateState = (patch: Partial<WaypointDmsFormState>) => setState((current) => ({ ...current, ...patch }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Waypoint Label</label>
        <Input
          value={state.identifier}
          onChange={(event) => updateState({ identifier: event.target.value })}
          placeholder="PNT"
          className="h-9 text-sm font-bold uppercase"
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Latitude</label>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto] gap-2">
            <Input value={state.latDegrees} onChange={(event) => updateState({ latDegrees: event.target.value })} placeholder="25" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
            <Input value={state.latMinutes} onChange={(event) => updateState({ latMinutes: event.target.value })} placeholder="45" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
            <Input value={state.latSeconds} onChange={(event) => updateState({ latSeconds: event.target.value })} placeholder="42.49" inputMode="decimal" className="h-9 text-sm font-mono font-bold" />
            <HemisphereToggle axis="lat" value={state.latHemisphere} onChange={(value) => updateState({ latHemisphere: value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Longitude</label>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1fr)_auto] gap-2">
            <Input value={state.lonDegrees} onChange={(event) => updateState({ lonDegrees: event.target.value })} placeholder="028" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
            <Input value={state.lonMinutes} onChange={(event) => updateState({ lonMinutes: event.target.value })} placeholder="48" inputMode="numeric" className="h-9 text-sm font-mono font-bold" />
            <Input value={state.lonSeconds} onChange={(event) => updateState({ lonSeconds: event.target.value })} placeholder="30.86" inputMode="decimal" className="h-9 text-sm font-mono font-bold" />
            <HemisphereToggle axis="lon" value={state.lonHemisphere} onChange={(value) => updateState({ lonHemisphere: value })} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
        {showCancel && onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onCancel();
              reset();
            }}
          >
            Cancel
          </Button>
        ) : null}
        <Button type="button" onClick={handleSubmit}>
          {submitLabel}
        </Button>
      </div>
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
  const [open, setOpen] = useState(false);
  const [formNonce, setFormNonce] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setFormNonce((current) => current + 1);
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
        <WaypointDmsForm
          key={formNonce}
          onAddWaypoint={onAddWaypoint}
          defaultIdentifier={defaultIdentifier}
          submitLabel="Add Waypoint"
          onCancel={() => {
            setOpen(false);
            setFormNonce((current) => current + 1);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
