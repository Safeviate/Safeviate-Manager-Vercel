'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlaskConical, Play, Trash2, Database, PlaneTakeoff, ShieldAlert, ClipboardCheck, Users, Activity, HardDrive, ServerCog, Square, Download } from 'lucide-react';
import { MainPageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

type SimulationLabSettings = {
  name: string;
  note: string;
  autoExerciseEnabled: boolean;
  autoExerciseProfile: 'core' | 'extended' | 'full';
  studentCount: number;
  instructorCount: number;
  personnelCount: number;
  aircraftCount: number;
  vehicleCount: number;
  briefingRoomCount: number;
  simulationDays: number;
  flightBookingsPerDay: number;
  roomBookingsPerDay: number;
  vehicleBookingsPerDay: number;
  studentReportsPerStudent: number;
  meetingCount: number;
  safetyReportCount: number;
  qualityAuditCount: number;
};

type SimulationRunSummary = {
  id: string;
  label: string;
  note: string;
  tenantId: string;
  createdAt: string;
  generatedBy: string;
  settings: SimulationLabSettings;
  writes: {
    users: number;
    personnel: number;
    aircraft: number;
    vehicles: number;
    bookings: number;
    studentReports: number;
    meetings: number;
    safetyReports: number;
    qualityAudits: number;
    correctiveActionPlans: number;
    risks: number;
    total: number;
  };
  totals: {
    simulatedFlightHours: number;
    simulatedDutyHours: number;
    simulatedActions: number;
  };
  telemetry: {
    estimatedApiRequests: number;
    estimatedDbReads: number;
    estimatedDbWrites: number;
    estimatedDashboardRefreshes: number;
    estimatedStorageMb: number;
    actualDbOperations: number;
    actualDbReads: number;
    actualDbWrites: number;
    actualDurationMs: number;
    stages: Array<{
      label: string;
      durationMs: number;
      reads: number;
      writes: number;
      operations: number;
    }>;
    observedRoutes?: Array<{
      routeKey: string;
      requestCount: number;
      readCount: number;
      writeCount: number;
      errorCount: number;
      totalDurationMs: number;
      lastSeenAt: string;
    }>;
  };
  assertions: Array<{
    id: string;
    label: string;
    status: 'pass' | 'watch' | 'fail';
    detail: string;
  }>;
};

type SimulationLabResponse = {
  settings: SimulationLabSettings;
  runs: SimulationRunSummary[];
  presets: Array<{ id: string; label: string; settings: SimulationLabSettings; isCustom?: boolean }>;
  activeRunId: string | null;
};

const EMPTY_SETTINGS: SimulationLabSettings = {
  name: 'Busy ATO Month',
  note: '',
  autoExerciseEnabled: true,
  autoExerciseProfile: 'core',
  studentCount: 30,
  instructorCount: 6,
  personnelCount: 4,
  aircraftCount: 5,
  vehicleCount: 2,
  briefingRoomCount: 3,
  simulationDays: 30,
  flightBookingsPerDay: 12,
  roomBookingsPerDay: 5,
  vehicleBookingsPerDay: 2,
  studentReportsPerStudent: 3,
  meetingCount: 6,
  safetyReportCount: 8,
  qualityAuditCount: 4,
};

function toIsoDateStamp(value: Date) {
  return value.toISOString().slice(0, 10);
}

function escapeCsvCell(value: string | number) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const SIMULATION_RUN_CSV_HEADERS = [
  'runId',
  'label',
  'note',
  'tenantId',
  'createdAt',
  'generatedBy',
  'activeTracker',
  'students',
  'instructors',
  'personnel',
  'aircraft',
  'vehicles',
  'briefingRooms',
  'simulationDays',
  'flightBookingsPerDay',
  'roomBookingsPerDay',
  'vehicleBookingsPerDay',
  'studentReportsPerStudent',
  'meetingCount',
  'safetyReportCount',
  'qualityAuditCount',
  'usersWritten',
  'personnelWritten',
  'aircraftWritten',
  'vehiclesWritten',
  'bookingsWritten',
  'studentReportsWritten',
  'meetingsWritten',
  'safetyReportsWritten',
  'qualityAuditsWritten',
  'correctiveActionPlansWritten',
  'risksWritten',
  'totalWrites',
  'simulatedFlightHours',
  'simulatedDutyHours',
  'simulatedActions',
  'estimatedApiRequests',
  'estimatedDbReads',
  'estimatedDbWrites',
  'estimatedDashboardRefreshes',
  'estimatedStorageMb',
  'actualDbOperations',
  'actualDbReads',
  'actualDbWrites',
  'actualDurationMs',
  'observedRouteCount',
  'observedRequestCount',
  'observedReadCount',
  'observedWriteCount',
  'observedErrorCount',
  'observedTotalDurationMs',
];

function buildSimulationRunCsvRow(run: SimulationRunSummary, isActiveTracker: boolean) {
  const observedRoutes = run.telemetry.observedRoutes || [];

  return [
    run.id,
    run.label,
    run.note,
    run.tenantId,
    run.createdAt,
    run.generatedBy,
    isActiveTracker ? 'yes' : 'no',
    run.settings.studentCount,
    run.settings.instructorCount,
    run.settings.personnelCount,
    run.settings.aircraftCount,
    run.settings.vehicleCount,
    run.settings.briefingRoomCount,
    run.settings.simulationDays,
    run.settings.flightBookingsPerDay,
    run.settings.roomBookingsPerDay,
    run.settings.vehicleBookingsPerDay,
    run.settings.studentReportsPerStudent,
    run.settings.meetingCount,
    run.settings.safetyReportCount,
    run.settings.qualityAuditCount,
    run.writes.users,
    run.writes.personnel,
    run.writes.aircraft,
    run.writes.vehicles,
    run.writes.bookings,
    run.writes.studentReports,
    run.writes.meetings,
    run.writes.safetyReports,
    run.writes.qualityAudits,
    run.writes.correctiveActionPlans,
    run.writes.risks,
    run.writes.total,
    run.totals.simulatedFlightHours,
    run.totals.simulatedDutyHours,
    run.totals.simulatedActions,
    run.telemetry.estimatedApiRequests,
    run.telemetry.estimatedDbReads,
    run.telemetry.estimatedDbWrites,
    run.telemetry.estimatedDashboardRefreshes,
    run.telemetry.estimatedStorageMb,
    run.telemetry.actualDbOperations,
    run.telemetry.actualDbReads,
    run.telemetry.actualDbWrites,
    run.telemetry.actualDurationMs,
    observedRoutes.length,
    observedRoutes.reduce((sum, route) => sum + route.requestCount, 0),
    observedRoutes.reduce((sum, route) => sum + route.readCount, 0),
    observedRoutes.reduce((sum, route) => sum + route.writeCount, 0),
    observedRoutes.reduce((sum, route) => sum + route.errorCount, 0),
    observedRoutes.reduce((sum, route) => sum + route.totalDurationMs, 0),
  ].map(escapeCsvCell).join(',');
}

function buildSimulationRunCsv(run: SimulationRunSummary, isActiveTracker: boolean) {
  return [SIMULATION_RUN_CSV_HEADERS.join(','), buildSimulationRunCsvRow(run, isActiveTracker)].join('\n');
}

function buildComparisonCsv(left: SimulationRunSummary, right: SimulationRunSummary) {
  const leftObservedRequests = left.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
  const rightObservedRequests = right.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;

  const headers = ['metric', 'runA', 'runB', 'delta'];
  const rows = [
    ['runLabel', left.label, right.label, ''],
    ['runNote', left.note, right.note, ''],
    ['runId', left.id, right.id, ''],
    ['createdAt', left.createdAt, right.createdAt, ''],
    ['totalWrites', left.writes.total, right.writes.total, left.writes.total - right.writes.total],
    ['simulatedFlightHours', left.totals.simulatedFlightHours, right.totals.simulatedFlightHours, left.totals.simulatedFlightHours - right.totals.simulatedFlightHours],
    ['simulatedDutyHours', left.totals.simulatedDutyHours, right.totals.simulatedDutyHours, left.totals.simulatedDutyHours - right.totals.simulatedDutyHours],
    ['simulatedActions', left.totals.simulatedActions, right.totals.simulatedActions, left.totals.simulatedActions - right.totals.simulatedActions],
    ['estimatedApiRequests', left.telemetry.estimatedApiRequests, right.telemetry.estimatedApiRequests, left.telemetry.estimatedApiRequests - right.telemetry.estimatedApiRequests],
    ['estimatedDbReads', left.telemetry.estimatedDbReads, right.telemetry.estimatedDbReads, left.telemetry.estimatedDbReads - right.telemetry.estimatedDbReads],
    ['estimatedDbWrites', left.telemetry.estimatedDbWrites, right.telemetry.estimatedDbWrites, left.telemetry.estimatedDbWrites - right.telemetry.estimatedDbWrites],
    ['actualDbOperations', left.telemetry.actualDbOperations, right.telemetry.actualDbOperations, left.telemetry.actualDbOperations - right.telemetry.actualDbOperations],
    ['actualDbReads', left.telemetry.actualDbReads, right.telemetry.actualDbReads, left.telemetry.actualDbReads - right.telemetry.actualDbReads],
    ['actualDbWrites', left.telemetry.actualDbWrites, right.telemetry.actualDbWrites, left.telemetry.actualDbWrites - right.telemetry.actualDbWrites],
    ['actualDurationMs', left.telemetry.actualDurationMs, right.telemetry.actualDurationMs, left.telemetry.actualDurationMs - right.telemetry.actualDurationMs],
    ['observedRequests', leftObservedRequests, rightObservedRequests, leftObservedRequests - rightObservedRequests],
    ['observedRouteCount', left.telemetry.observedRoutes?.length || 0, right.telemetry.observedRoutes?.length || 0, (left.telemetry.observedRoutes?.length || 0) - (right.telemetry.observedRoutes?.length || 0)],
  ];

  return [headers.join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\n');
}

function getRunHealth(run: SimulationRunSummary) {
  if (run.assertions.some((assertion) => assertion.status === 'fail')) return 'fail' as const;
  if (run.assertions.some((assertion) => assertion.status === 'watch')) return 'watch' as const;
  return 'pass' as const;
}

function getObservedRequests(run: SimulationRunSummary) {
  return run.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
}

function getDecodedAnalysis(run: SimulationRunSummary) {
  const observedRequests = getObservedRequests(run);
  const observedErrors = run.telemetry.observedRoutes?.reduce((sum, route) => sum + route.errorCount, 0) || 0;
  const hottestRoute = [...(run.telemetry.observedRoutes || [])].sort((left, right) => right.requestCount - left.requestCount)[0] || null;
  const health = getRunHealth(run);
  const insights: string[] = [];

  if (run.writes.total > 500) {
    insights.push(`This is a heavy seed run with ${run.writes.total} records written, so it is a strong pressure test for booking, reporting, and dashboard flows.`);
  } else if (run.writes.total > 200) {
    insights.push(`This run created a moderate tenant footprint with ${run.writes.total} records, which is useful for realistic day-to-day validation.`);
  } else {
    insights.push(`This is a lighter seed run with ${run.writes.total} records, which is best suited to baseline smoke and functional checks.`);
  }

  if (observedRequests === 0) {
    insights.push('No downstream route traffic has been observed yet, so this run mainly tells us about seeding cost rather than live app usage.');
  } else if (hottestRoute) {
    insights.push(`Observed usage is active, and ${hottestRoute.routeKey} is currently the hottest route with ${hottestRoute.requestCount} requests.`);
  }

  if (observedErrors > 0) {
    insights.push(`Observed telemetry captured ${observedErrors} downstream API errors, so this run should be investigated before performance tuning.`);
  } else if (observedRequests > 0) {
    insights.push('No downstream API errors were observed during the tracked usage for this run.');
  }

  if (run.telemetry.actualDbWrites > run.writes.total * 1.4) {
    insights.push('Generator write pressure is running higher than expected for the seeded footprint, which makes this a good candidate for query or persistence review.');
  } else {
    insights.push('Generator write pressure looks proportionate to the size of the seeded dataset.');
  }

  if (health === 'fail') {
    insights.push('Overall run health is failing, so fix the broken telemetry or route behavior before drawing optimization conclusions.');
  } else if (health === 'watch') {
    insights.push('Overall run health is on watch, which means the run is usable but should be reviewed before it becomes the benchmark scenario.');
  } else {
    insights.push('Overall run health is healthy, so this run is a good candidate to use as a baseline for future before/after comparisons.');
  }

  return insights;
}

function getComparisonInterpretation(left: SimulationRunSummary, right: SimulationRunSummary) {
  const statements: string[] = [];
  const writeDelta = left.writes.total - right.writes.total;
  const flightDelta = left.totals.simulatedFlightHours - right.totals.simulatedFlightHours;
  const observedDelta = getObservedRequests(left) - getObservedRequests(right);

  if (writeDelta !== 0) {
    statements.push(
      writeDelta > 0
        ? `Run A seeded ${writeDelta} more records than Run B, so it places more write pressure on the tenant.`
        : `Run B seeded ${Math.abs(writeDelta)} more records than Run A, so it is the heavier write scenario.`,
    );
  }

  if (flightDelta !== 0) {
    statements.push(
      flightDelta > 0
        ? `Run A generated ${flightDelta.toFixed(1)} more simulated flight hours than Run B.`
        : `Run B generated ${Math.abs(flightDelta).toFixed(1)} more simulated flight hours than Run A.`,
    );
  }

  if (observedDelta !== 0) {
    statements.push(
      observedDelta > 0
        ? `Run A drove ${observedDelta} more observed downstream requests than Run B.`
        : `Run B drove ${Math.abs(observedDelta)} more observed downstream requests than Run A.`,
    );
  } else {
    statements.push('Both runs currently show the same level of observed downstream traffic.');
  }

  if (getRunHealth(left) !== getRunHealth(right)) {
    statements.push(
      `Run A is currently ${getRunHealth(left)}, while Run B is ${getRunHealth(right)}, so they are not equally suitable as baseline scenarios.`,
    );
  } else {
    statements.push(`Both runs currently sit at the same overall health state: ${getRunHealth(left)}.`);
  }

  return statements;
}

export default function SimulationLabPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<SimulationLabSettings>(EMPTY_SETTINGS);
  const [runs, setRuns] = useState<SimulationRunSummary[]>([]);
  const [presets, setPresets] = useState<Array<{ id: string; label: string; settings: SimulationLabSettings; isCustom?: boolean }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [deletingPresetId, setDeletingPresetId] = useState<string | null>(null);
  const [isStoppingTracking, setIsStoppingTracking] = useState(false);
  const [resumingRunId, setResumingRunId] = useState<string | null>(null);
  const [deletingRunId, setDeletingRunId] = useState<string | null>(null);
  const [isClearingRuns, setIsClearingRuns] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [compareLeftId, setCompareLeftId] = useState<string | null>(null);
  const [compareRightId, setCompareRightId] = useState<string | null>(null);
  const [runSearch, setRunSearch] = useState('');
  const [runFilter, setRunFilter] = useState<'all' | 'active' | 'observed' | 'quiet' | 'attention'>('all');
  const [runSort, setRunSort] = useState<'newest' | 'writes' | 'flightHours' | 'observed' | 'health'>('newest');

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/development/simulation-lab', { cache: 'no-store' });
      const payload = (await response.json().catch(() => ({}))) as SimulationLabResponse;
      setSettings(payload.settings || EMPTY_SETTINGS);
      setRuns(Array.isArray(payload.runs) ? payload.runs : []);
      setPresets(Array.isArray(payload.presets) ? payload.presets : []);
      setActiveRunId(typeof payload.activeRunId === 'string' ? payload.activeRunId : null);
      const nextRuns = Array.isArray(payload.runs) ? payload.runs : [];
      setCompareLeftId((current) => current ?? nextRuns[0]?.id ?? null);
      setCompareRightId((current) => current ?? nextRuns[1]?.id ?? nextRuns[0]?.id ?? null);
    } catch (error) {
      console.error('Failed to load simulation lab', error);
      toast({
        variant: 'destructive',
        title: 'Simulation Lab Unavailable',
        description: 'The simulation configuration could not be loaded.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChange = (field: keyof SimulationLabSettings, value: string) => {
    setSettings((current) => ({
      ...current,
      [field]: typeof current[field] === 'number' ? Number(value) : value,
    }));
  };

  const handleRun = async () => {
    await runSimulationWithSettings(settings);
  };

  const runSimulationWithSettings = useCallback(async (nextSettings: SimulationLabSettings) => {
    setIsRunning(true);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: nextSettings }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to run simulation.');
      }

      const run = payload.run as SimulationRunSummary;
      const autoExercise = payload.autoExercise as { profile: string; routeCount: number; requestCount: number; failed?: boolean } | undefined;
      setRuns((current) => [run, ...current].slice(0, 25));
      setActiveRunId(run.id);
      setCompareLeftId(run.id);
      setCompareRightId((current) => current ?? run.id);
      toast({
        title: 'Simulation Run Complete',
        description: autoExercise?.failed
          ? `${run.writes.total} live records were written, but the auto-exercise step could not complete cleanly. You can still use the seeded app manually to accumulate telemetry.`
          : autoExercise && autoExercise.profile !== 'disabled'
          ? `${run.writes.total} live records were written, then ${autoExercise.requestCount} auto-exercise requests were recorded across ${autoExercise.routeCount} routes.`
          : `${run.writes.total} live records were written to the database for ${run.label}.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: error instanceof Error ? error.message : 'The simulation run failed.',
      });
    } finally {
      setIsRunning(false);
    }
  }, [toast]);

  const applyPreset = (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    setSettings(preset.settings);
  };

  const handleRunPreset = async (presetId: string) => {
    const preset = presets.find((item) => item.id === presetId);
    if (!preset) return;
    await runSimulationWithSettings(preset.settings);
  };

  const handleSavePreset = async () => {
    setIsSavingPreset(true);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'savePreset', label: settings.name, settings }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to save preset.');
      }

      const preset = payload.preset as { id: string; label: string; settings: SimulationLabSettings; isCustom?: boolean };
      setPresets((current) => [preset, ...current.filter((item) => item.id !== preset.id)]);
      toast({
        title: 'Preset Saved',
        description: `${preset.label} is now available as a reusable simulation template.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Preset Save Failed',
        description: error instanceof Error ? error.message : 'The preset could not be saved.',
      });
    } finally {
      setIsSavingPreset(false);
    }
  };

  const handleDeletePreset = async (presetId: string) => {
    setDeletingPresetId(presetId);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deletePreset', presetId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete preset.');
      }

      setPresets((current) => current.filter((preset) => preset.id !== presetId));
      toast({
        title: 'Preset Removed',
        description: 'The saved simulation template was removed from this tenant.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Preset Delete Failed',
        description: error instanceof Error ? error.message : 'The preset could not be deleted.',
      });
    } finally {
      setDeletingPresetId(null);
    }
  };

  const handleStopTracking = async () => {
    setIsStoppingTracking(true);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stopTracking' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to stop tracking.');
      }

      setActiveRunId(null);
      toast({
        title: 'Tracking Stopped',
        description: 'Observed route telemetry has been paused. Existing simulation data remains in the database.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Stop Tracking Failed',
        description: error instanceof Error ? error.message : 'Tracking could not be stopped.',
      });
    } finally {
      setIsStoppingTracking(false);
    }
  };

  const handleResumeTracking = async (runId: string) => {
    setResumingRunId(runId);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resumeTracking', runId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to resume tracking.');
      }

      setActiveRunId(runId);
      toast({
        title: 'Tracking Resumed',
        description: 'Observed route telemetry will now be attributed to the selected simulation run.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Resume Tracking Failed',
        description: error instanceof Error ? error.message : 'Tracking could not be resumed.',
      });
    } finally {
      setResumingRunId(null);
    }
  };

  const handleDeleteRun = async (runId: string) => {
    setDeletingRunId(runId);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to delete simulation run.');
      }

      setRuns((current) => current.filter((run) => run.id !== runId));
      toast({
        title: 'Simulation Run Removed',
        description: 'The generated DB records for that run were cleaned up.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'The simulation run could not be deleted.',
      });
    } finally {
      setDeletingRunId(null);
    }
  };

  const handleClearResults = async () => {
    if (runs.length === 0) return;

    setIsClearingRuns(true);
    try {
      const response = await fetch('/api/development/simulation-lab', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearAll: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to clear simulation results.');
      }

      setRuns([]);
      setActiveRunId(null);
      setCompareLeftId(null);
      setCompareRightId(null);
      toast({
        title: 'Results Cleared',
        description: 'All simulation runs and their seeded DB records were removed from this tenant.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Clear Results Failed',
        description: error instanceof Error ? error.message : 'The simulation results could not be cleared.',
      });
    } finally {
      setIsClearingRuns(false);
    }
  };

  const summary = useMemo(() => {
    return {
      totalRuns: runs.length,
      totalWrites: runs.reduce((sum, run) => sum + run.writes.total, 0),
      totalFlightHours: runs.reduce((sum, run) => sum + run.totals.simulatedFlightHours, 0),
      totalEstimatedRequests: runs.reduce((sum, run) => sum + run.telemetry.estimatedApiRequests, 0),
      latestRun: runs[0] || null,
    };
  }, [runs]);

  const comparison = useMemo(() => {
    const left = runs.find((run) => run.id === compareLeftId) || null;
    const right = runs.find((run) => run.id === compareRightId) || null;
    return { left, right };
  }, [compareLeftId, compareRightId, runs]);

  const trendRuns = useMemo(() => runs.slice(0, 6).reverse(), [runs]);

  const filteredRuns = useMemo(() => {
    const search = runSearch.trim().toLowerCase();
    const nextRuns = runs.filter((run) => {
      const observedCount = run.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
      const matchesSearch =
        !search ||
        run.label.toLowerCase().includes(search) ||
        run.note.toLowerCase().includes(search) ||
        run.generatedBy.toLowerCase().includes(search);

      if (!matchesSearch) return false;
      if (runFilter === 'active') return activeRunId === run.id;
      if (runFilter === 'observed') return observedCount > 0;
      if (runFilter === 'quiet') return observedCount === 0;
      if (runFilter === 'attention') return getRunHealth(run) !== 'pass';
      return true;
    });

    nextRuns.sort((left, right) => {
      const leftObserved = left.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
      const rightObserved = right.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
      const healthWeight = { fail: 3, watch: 2, pass: 1 } as const;

      if (runSort === 'writes') {
        return right.writes.total - left.writes.total;
      }
      if (runSort === 'flightHours') {
        return right.totals.simulatedFlightHours - left.totals.simulatedFlightHours;
      }
      if (runSort === 'observed') {
        return rightObserved - leftObserved;
      }
      if (runSort === 'health') {
        return healthWeight[getRunHealth(right)] - healthWeight[getRunHealth(left)];
      }
      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
    });

    return nextRuns;
  }, [activeRunId, runFilter, runSearch, runSort, runs]);

  const filteredSummary = useMemo(() => {
    return {
      runCount: filteredRuns.length,
      totalWrites: filteredRuns.reduce((sum, run) => sum + run.writes.total, 0),
      totalFlightHours: filteredRuns.reduce((sum, run) => sum + run.totals.simulatedFlightHours, 0),
      totalEstimatedApi: filteredRuns.reduce((sum, run) => sum + run.telemetry.estimatedApiRequests, 0),
      totalObservedRequests: filteredRuns.reduce(
        (sum, run) => sum + (run.telemetry.observedRoutes?.reduce((routeSum, route) => routeSum + route.requestCount, 0) || 0),
        0,
      ),
      passCount: filteredRuns.filter((run) => getRunHealth(run) === 'pass').length,
      attentionCount: filteredRuns.filter((run) => getRunHealth(run) !== 'pass').length,
    };
  }, [filteredRuns]);

  const telemetryOverview = useMemo(() => {
    const sourceRuns = filteredRuns.length > 0 ? filteredRuns : runs;
    return {
      estimatedApiRequests: sourceRuns.reduce((sum, run) => sum + run.telemetry.estimatedApiRequests, 0),
      estimatedDbReads: sourceRuns.reduce((sum, run) => sum + run.telemetry.estimatedDbReads, 0),
      estimatedDbWrites: sourceRuns.reduce((sum, run) => sum + run.telemetry.estimatedDbWrites, 0),
      actualDbOperations: sourceRuns.reduce((sum, run) => sum + run.telemetry.actualDbOperations, 0),
      actualDbReads: sourceRuns.reduce((sum, run) => sum + run.telemetry.actualDbReads, 0),
      actualDbWrites: sourceRuns.reduce((sum, run) => sum + run.telemetry.actualDbWrites, 0),
      observedRequests: sourceRuns.reduce(
        (sum, run) => sum + (run.telemetry.observedRoutes?.reduce((routeSum, route) => routeSum + route.requestCount, 0) || 0),
        0,
      ),
      observedErrors: sourceRuns.reduce(
        (sum, run) => sum + (run.telemetry.observedRoutes?.reduce((routeSum, route) => routeSum + route.errorCount, 0) || 0),
        0,
      ),
      observedRoutes: sourceRuns.reduce((sum, run) => sum + (run.telemetry.observedRoutes?.length || 0), 0),
      scopeLabel: filteredRuns.length > 0 ? 'Current filtered runs' : 'All runs',
    };
  }, [filteredRuns, runs]);

  const comparisonSummary = useMemo(() => {
    if (!comparison.left || !comparison.right) return null;
    const leftObserved = comparison.left.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
    const rightObserved = comparison.right.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;

    return {
      writeDelta: comparison.left.writes.total - comparison.right.writes.total,
      flightHourDelta: comparison.left.totals.simulatedFlightHours - comparison.right.totals.simulatedFlightHours,
      estimatedApiDelta: comparison.left.telemetry.estimatedApiRequests - comparison.right.telemetry.estimatedApiRequests,
      observedDelta: leftObserved - rightObserved,
    };
  }, [comparison.left, comparison.right]);

  const downloadFile = useCallback((filename: string, content: string, mimeType: string) => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, []);

  const buildRunsCsv = useCallback(() => {
    const rows = runs.map((run) => buildSimulationRunCsvRow(run, activeRunId === run.id));
    return [SIMULATION_RUN_CSV_HEADERS.join(','), ...rows].join('\n');
  }, [activeRunId, runs]);

  const handleExportJson = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeRunId,
      runCount: runs.length,
      runs,
    };

    downloadFile(
      `simulation-lab-runs-${toIsoDateStamp(new Date())}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    );
  }, [activeRunId, downloadFile, runs]);

  const handleExportCsv = useCallback(() => {
    downloadFile(
      `simulation-lab-runs-${toIsoDateStamp(new Date())}.csv`,
      buildRunsCsv(),
      'text/csv;charset=utf-8',
    );
  }, [buildRunsCsv, downloadFile]);

  const handleExportSingleRunJson = useCallback((run: SimulationRunSummary) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      activeRunId,
      run,
    };

    downloadFile(
      `simulation-run-${run.id}-${toIsoDateStamp(new Date())}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    );
  }, [activeRunId, downloadFile]);

  const handleExportSingleRunCsv = useCallback((run: SimulationRunSummary) => {
    downloadFile(
      `simulation-run-${run.id}-${toIsoDateStamp(new Date())}.csv`,
      buildSimulationRunCsv(run, activeRunId === run.id),
      'text/csv;charset=utf-8',
    );
  }, [activeRunId, downloadFile]);

  const handleExportComparisonJson = useCallback(() => {
    if (!comparison.left || !comparison.right) return;

    const payload = {
      exportedAt: new Date().toISOString(),
      left: comparison.left,
      right: comparison.right,
      deltas: {
        totalWrites: comparison.left.writes.total - comparison.right.writes.total,
        simulatedFlightHours: comparison.left.totals.simulatedFlightHours - comparison.right.totals.simulatedFlightHours,
        estimatedApiRequests: comparison.left.telemetry.estimatedApiRequests - comparison.right.telemetry.estimatedApiRequests,
        observedRequests:
          (comparison.left.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0) -
          (comparison.right.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0),
      },
    };

    downloadFile(
      `simulation-comparison-${comparison.left.id}-vs-${comparison.right.id}-${toIsoDateStamp(new Date())}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8',
    );
  }, [comparison.left, comparison.right, downloadFile]);

  const handleExportComparisonCsv = useCallback(() => {
    if (!comparison.left || !comparison.right) return;

    downloadFile(
      `simulation-comparison-${comparison.left.id}-vs-${comparison.right.id}-${toIsoDateStamp(new Date())}.csv`,
      buildComparisonCsv(comparison.left, comparison.right),
      'text/csv;charset=utf-8',
    );
  }, [comparison.left, comparison.right, downloadFile]);

  const handleSwapComparison = useCallback(() => {
    setCompareLeftId(compareRightId);
    setCompareRightId(compareLeftId);
  }, [compareLeftId, compareRightId]);

  const handleClearComparison = useCallback(() => {
    setCompareLeftId(null);
    setCompareRightId(null);
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1220px] flex-col gap-6 px-1">
        <Skeleton className="h-14 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1220px] flex-col gap-6 px-1">
      <Card className="flex min-h-0 flex-col overflow-hidden border border-card-border shadow-none">
        <MainPageHeader
          title="Simulation Lab"
          description="Seed a live tenant with synthetic school activity. Everything generated here is written to the DB, tagged by simulation run, and can be cleaned back out later."
          actions={
            <div className="flex w-full flex-wrap items-center justify-end gap-2">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                Live DB writes
              </Badge>
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => void handleClearResults()}
                disabled={isClearingRuns || runs.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                {isClearingRuns ? 'Clearing Results...' : 'Clear Results'}
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handleExportJson} disabled={runs.length === 0}>
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={handleExportCsv} disabled={runs.length === 0}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button type="button" variant="outline" className="gap-2" onClick={() => void load()}>
                Refresh
              </Button>
            </div>
          }
        />

        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-4 md:p-6">
              <div className="rounded-2xl border bg-muted/5 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Telemetry Tracking</p>
                    <p className="mt-1 text-sm font-semibold">
                      {activeRunId ? `Active run: ${activeRunId}` : 'No simulation run is currently collecting downstream route telemetry.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={activeRunId ? 'default' : 'outline'} className="text-[10px] font-black uppercase tracking-[0.16em]">
                      {activeRunId ? 'Tracking live' : 'Tracking stopped'}
                    </Badge>
                    <Button type="button" variant="outline" className="gap-2" onClick={handleStopTracking} disabled={!activeRunId || isStoppingTracking}>
                      <Square className="h-4 w-4" />
                      {isStoppingTracking ? 'Stopping...' : 'Stop Tracking'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile icon={<Database className="h-4 w-4 text-blue-600" />} label="Persisted Runs" value={String(summary.totalRuns)} hint="Simulation runs still on the tenant" />
                <MetricTile icon={<Users className="h-4 w-4 text-emerald-600" />} label="DB Writes" value={String(summary.totalWrites)} hint="Total records created across runs" />
                <MetricTile icon={<PlaneTakeoff className="h-4 w-4 text-amber-600" />} label="Flight Hours" value={`${summary.totalFlightHours.toFixed(1)}h`} hint="Completed simulated training hours" />
                <MetricTile
                  icon={<Activity className="h-4 w-4 text-purple-600" />}
                  label="Est. API Hits"
                  value={String(summary.totalEstimatedRequests)}
                  hint={summary.latestRun ? `Latest: ${summary.latestRun.label}` : 'No runs written yet'}
                />
              </div>

              <Card className="border shadow-none">
                <CardHeader className="border-b bg-muted/5">
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Telemetry Overview</CardTitle>
                  <CardDescription>
                    Read the simulation in three layers: projected load, actual generator activity, and downstream route traffic after you use the seeded app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-muted/5 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Telemetry Scope</p>
                      <p className="mt-1 text-sm font-semibold">{telemetryOverview.scopeLabel}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                      Estimated vs Actual vs Observed
                    </Badge>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-3">
                    <TelemetrySection
                      title="Estimated Load"
                      description="Modeled pressure based on the generated scenario footprint."
                      metrics={[
                        { label: 'API Requests', value: String(telemetryOverview.estimatedApiRequests) },
                        { label: 'DB Reads', value: String(telemetryOverview.estimatedDbReads) },
                        { label: 'DB Writes', value: String(telemetryOverview.estimatedDbWrites) },
                      ]}
                    />
                    <TelemetrySection
                      title="Generator Actuals"
                      description="Real DB activity recorded while the simulation itself wrote the tenant data."
                      metrics={[
                        { label: 'DB Ops', value: String(telemetryOverview.actualDbOperations) },
                        { label: 'DB Reads', value: String(telemetryOverview.actualDbReads) },
                        { label: 'DB Writes', value: String(telemetryOverview.actualDbWrites) },
                      ]}
                    />
                    <TelemetrySection
                      title="Observed Usage"
                      description="Downstream request traffic captured after you browse the seeded app while tracking is active."
                      metrics={[
                        { label: 'Requests', value: String(telemetryOverview.observedRequests) },
                        { label: 'Errors', value: String(telemetryOverview.observedErrors) },
                        { label: 'Routes Hit', value: String(telemetryOverview.observedRoutes) },
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border shadow-none">
                <CardHeader className="border-b bg-muted/5">
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Run Trends</CardTitle>
                  <CardDescription>
                    Scan the most recent runs before you export or compare them in detail.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                  <TrendMetricCard
                    title="Writes"
                    runs={trendRuns}
                    getValue={(run) => run.writes.total}
                    valueFormatter={(value) => String(Math.round(value))}
                    tone="emerald"
                  />
                  <TrendMetricCard
                    title="Flight Hours"
                    runs={trendRuns}
                    getValue={(run) => run.totals.simulatedFlightHours}
                    valueFormatter={(value) => `${value.toFixed(1)}h`}
                    tone="amber"
                  />
                  <TrendMetricCard
                    title="Estimated API"
                    runs={trendRuns}
                    getValue={(run) => run.telemetry.estimatedApiRequests}
                    valueFormatter={(value) => String(Math.round(value))}
                    tone="violet"
                  />
                  <TrendMetricCard
                    title="Observed Requests"
                    runs={trendRuns}
                    getValue={(run) => run.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0}
                    valueFormatter={(value) => String(Math.round(value))}
                    tone="sky"
                  />
                </CardContent>
              </Card>

              <Card className="border shadow-none">
                <CardHeader className="border-b bg-muted/5">
                  <CardTitle className="text-sm font-black uppercase tracking-tight">Preset Launchpad</CardTitle>
                  <CardDescription>
                    Launch repeatable school shapes directly from saved templates, or load one back into the form before you fine-tune it.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                  {presets.map((preset) => (
                    <div key={preset.id} className="rounded-2xl border bg-background p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase tracking-tight">{preset.label}</p>
                          <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {preset.isCustom ? 'Custom tenant preset' : 'Built-in scenario'}
                          </p>
                          {preset.settings.note ? (
                            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{preset.settings.note}</p>
                          ) : null}
                        </div>
                        <Badge variant={preset.isCustom ? 'default' : 'outline'} className="text-[10px] font-black uppercase tracking-[0.16em]">
                          {preset.isCustom ? 'Custom' : 'Built-in'}
                        </Badge>
                      </div>
                      <div className="mt-4 grid gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        <span>{preset.settings.studentCount} students</span>
                        <span>{preset.settings.instructorCount} instructors</span>
                        <span>{preset.settings.aircraftCount} aircraft</span>
                        <span>{preset.settings.simulationDays} day window</span>
                      </div>
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button type="button" variant="outline" className="w-full gap-2" onClick={() => applyPreset(preset.id)}>
                          Load To Form
                        </Button>
                        <Button type="button" className="w-full gap-2" disabled={isRunning} onClick={() => void handleRunPreset(preset.id)}>
                          <Play className="h-4 w-4" />
                          {isRunning ? 'Running...' : 'Run Preset'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border shadow-none">
                <CardHeader className="border-b bg-muted/5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <CardTitle className="text-sm font-black uppercase tracking-tight">Run Comparison</CardTitle>
                      <CardDescription>
                        Compare two seeded runs side by side for writes, flight hours, estimated pressure, and observed route activity.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={handleSwapComparison}
                        disabled={!comparison.left || !comparison.right}
                      >
                        Swap A/B
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={handleClearComparison}
                        disabled={!compareLeftId && !compareRightId}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportComparisonJson}
                        disabled={!comparison.left || !comparison.right}
                      >
                        <Download className="h-4 w-4" />
                        Export Comparison JSON
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={handleExportComparisonCsv}
                        disabled={!comparison.left || !comparison.right}
                      >
                        <Download className="h-4 w-4" />
                        Export Comparison CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-4">
                  {comparisonSummary ? (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <ComparisonSummaryBadge label="Write Edge" value={comparisonSummary.writeDelta} suffix="" />
                      <ComparisonSummaryBadge label="Flight Edge" value={comparisonSummary.flightHourDelta} suffix="h" />
                      <ComparisonSummaryBadge label="API Edge" value={comparisonSummary.estimatedApiDelta} suffix="" />
                      <ComparisonSummaryBadge label="Observed Edge" value={comparisonSummary.observedDelta} suffix="" />
                    </div>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Compare Run A">
                      <select
                        value={compareLeftId ?? ''}
                        onChange={(event) => setCompareLeftId(event.target.value || null)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select a run</option>
                        {runs.map((run) => (
                          <option key={run.id} value={run.id}>
                            {run.label} - {new Date(run.createdAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Compare Run B">
                      <select
                        value={compareRightId ?? ''}
                        onChange={(event) => setCompareRightId(event.target.value || null)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">Select a run</option>
                        {runs.map((run) => (
                          <option key={run.id} value={run.id}>
                            {run.label} - {new Date(run.createdAt).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  {comparison.left && comparison.right ? (
                    <>
                      <div className="rounded-2xl border bg-muted/5 p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Comparison Interpretation</p>
                        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                          {getComparisonInterpretation(comparison.left, comparison.right).map((statement, index) => (
                            <p key={`comparison-interpretation-${index}`}>{statement}</p>
                          ))}
                        </div>
                      </div>
                      <div className="grid gap-4 xl:grid-cols-2">
                        <ComparisonRunCard title="Run A" run={comparison.left} />
                        <ComparisonRunCard title="Run B" run={comparison.right} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <DeltaTile
                          label="Write Delta"
                          left={comparison.left.writes.total}
                          right={comparison.right.writes.total}
                          suffix=""
                        />
                        <DeltaTile
                          label="Flight Hour Delta"
                          left={comparison.left.totals.simulatedFlightHours}
                          right={comparison.right.totals.simulatedFlightHours}
                          suffix="h"
                        />
                        <DeltaTile
                          label="Estimated API Delta"
                          left={comparison.left.telemetry.estimatedApiRequests}
                          right={comparison.right.telemetry.estimatedApiRequests}
                          suffix=""
                        />
                        <DeltaTile
                          label="Observed Route Delta"
                          left={comparison.left.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0}
                          right={comparison.right.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0}
                          suffix=""
                        />
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed bg-muted/5 px-4 py-6 text-sm text-muted-foreground">
                      Choose two runs to compare them side by side.
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Card className="border shadow-none">
                  <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Simulation Parameters</CardTitle>
                    <CardDescription>
                      Build a real tenant footprint. Created users are stored with no password setup so they do not need to log in.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 p-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Scenario Presets</Label>
                      <div className="flex flex-wrap gap-2">
                        {presets.map((preset) => (
                          <div key={preset.id} className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 px-3 text-[9px] font-black uppercase tracking-[0.12em]"
                              onClick={() => applyPreset(preset.id)}
                            >
                              {preset.label}
                            </Button>
                            {preset.isCustom ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 px-2 text-[9px] font-black uppercase tracking-[0.12em]"
                                disabled={deletingPresetId === preset.id}
                                onClick={() => void handleDeletePreset(preset.id)}
                              >
                                {deletingPresetId === preset.id ? '...' : 'X'}
                              </Button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <Field label="Scenario Name">
                      <Input value={settings.name} onChange={(event) => handleChange('name', event.target.value)} />
                    </Field>

                    <Field label="Run Notes">
                      <Input
                        value={settings.note}
                        onChange={(event) => handleChange('note', event.target.value)}
                        placeholder="post-booking-refactor, mobile QA seed, ATO load test..."
                        maxLength={240}
                      />
                    </Field>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field label="Auto Exercise">
                        <select
                          value={settings.autoExerciseEnabled ? 'enabled' : 'disabled'}
                          onChange={(event) => setSettings((current) => ({
                            ...current,
                            autoExerciseEnabled: event.target.value === 'enabled',
                          }))}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="enabled">Enabled</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </Field>
                      <Field label="Exercise Depth">
                        <select
                          value={settings.autoExerciseProfile}
                          onChange={(event) => setSettings((current) => ({
                            ...current,
                            autoExerciseProfile: event.target.value as SimulationLabSettings['autoExerciseProfile'],
                          }))}
                          disabled={!settings.autoExerciseEnabled}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="core">Core</option>
                          <option value="extended">Extended</option>
                          <option value="full">Full</option>
                        </select>
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <NumberField label="Students" value={settings.studentCount} onChange={(value) => handleChange('studentCount', value)} />
                      <NumberField label="Instructors" value={settings.instructorCount} onChange={(value) => handleChange('instructorCount', value)} />
                      <NumberField label="Personnel" value={settings.personnelCount} onChange={(value) => handleChange('personnelCount', value)} />
                      <NumberField label="Aircraft" value={settings.aircraftCount} onChange={(value) => handleChange('aircraftCount', value)} />
                      <NumberField label="Vehicles" value={settings.vehicleCount} onChange={(value) => handleChange('vehicleCount', value)} />
                      <NumberField label="Briefing Rooms" value={settings.briefingRoomCount} onChange={(value) => handleChange('briefingRoomCount', value)} />
                      <NumberField label="Simulation Days" value={settings.simulationDays} onChange={(value) => handleChange('simulationDays', value)} />
                      <NumberField label="Flight Bookings / Day" value={settings.flightBookingsPerDay} onChange={(value) => handleChange('flightBookingsPerDay', value)} />
                      <NumberField label="Room Bookings / Day" value={settings.roomBookingsPerDay} onChange={(value) => handleChange('roomBookingsPerDay', value)} />
                      <NumberField label="Vehicle Bookings / Day" value={settings.vehicleBookingsPerDay} onChange={(value) => handleChange('vehicleBookingsPerDay', value)} />
                      <NumberField label="Debriefs / Student" value={settings.studentReportsPerStudent} onChange={(value) => handleChange('studentReportsPerStudent', value)} />
                      <NumberField label="Meetings" value={settings.meetingCount} onChange={(value) => handleChange('meetingCount', value)} />
                      <NumberField label="Safety Reports" value={settings.safetyReportCount} onChange={(value) => handleChange('safetyReportCount', value)} />
                      <NumberField label="Quality Audits" value={settings.qualityAuditCount} onChange={(value) => handleChange('qualityAuditCount', value)} />
                    </div>

                    <div className="rounded-2xl border bg-muted/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">What gets written</p>
                      <div className="mt-3 grid gap-2 text-sm font-medium text-muted-foreground md:grid-cols-2">
                        <span>Users + personnel records</span>
                        <span>Aircraft and optional vehicles</span>
                        <span>Daily bookings and room activity</span>
                        <span>Student debrief reports</span>
                        <span>Meetings and follow-up actions</span>
                        <span>Safety, quality, CAP, and risk records</span>
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-muted/5 p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Auto Exercise</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {settings.autoExerciseEnabled
                          ? `After seeding, the simulation will immediately record downstream telemetry using the ${settings.autoExerciseProfile} route pack.`
                          : 'After seeding, no downstream routes will be exercised automatically. Use the app manually to accumulate observed telemetry.'}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 md:flex-row">
                      <Button type="button" variant="outline" className="w-full gap-2 md:w-auto" onClick={handleSavePreset} disabled={isSavingPreset}>
                        <FlaskConical className="h-4 w-4" />
                        {isSavingPreset ? 'Saving Preset...' : 'Save As Preset'}
                      </Button>
                      <Button type="button" className="w-full gap-2 md:w-auto" onClick={handleRun} disabled={isRunning}>
                        <Play className="h-4 w-4" />
                        {isRunning ? 'Writing Simulation...' : 'Run Live Simulation'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border shadow-none">
                  <CardHeader className="border-b bg-muted/5">
                    <CardTitle className="text-sm font-black uppercase tracking-tight">Run Ledger</CardTitle>
                    <CardDescription>
                      Every run below already wrote to the tenant database. Use delete only when you want that simulation footprint removed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4">
                    <div className="grid gap-3 rounded-2xl border bg-muted/5 p-4 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
                      <Field label="Search Runs">
                        <Input
                          value={runSearch}
                          onChange={(event) => setRunSearch(event.target.value)}
                          placeholder="Filter by run name, note, or generator..."
                        />
                      </Field>
                      <Field label="Run Filter">
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'all', label: 'All' },
                            { id: 'active', label: 'Active' },
                            { id: 'observed', label: 'Observed' },
                            { id: 'quiet', label: 'Quiet' },
                            { id: 'attention', label: 'Attention' },
                          ].map((option) => (
                            <Button
                              key={option.id}
                              type="button"
                              variant={runFilter === option.id ? 'default' : 'outline'}
                              className="h-10 px-3 text-[10px] font-black uppercase tracking-[0.16em]"
                              onClick={() => setRunFilter(option.id as typeof runFilter)}
                            >
                              {option.label}
                            </Button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Sort Runs">
                        <select
                          value={runSort}
                          onChange={(event) => setRunSort(event.target.value as typeof runSort)}
                          className="h-10 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="newest">Newest</option>
                          <option value="writes">Most Writes</option>
                          <option value="flightHours">Most Flight Hours</option>
                          <option value="observed">Most Observed Traffic</option>
                          <option value="health">Needs Attention First</option>
                        </select>
                      </Field>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                      <MiniMetric label="Filtered Runs" value={String(filteredSummary.runCount)} />
                      <MiniMetric label="Filtered Writes" value={String(filteredSummary.totalWrites)} />
                      <MiniMetric label="Flight Hours" value={`${filteredSummary.totalFlightHours.toFixed(1)}h`} />
                      <MiniMetric label="Est. API" value={String(filteredSummary.totalEstimatedApi)} />
                      <MiniMetric label="Observed Requests" value={String(filteredSummary.totalObservedRequests)} />
                      <MiniMetric label="Passing Runs" value={String(filteredSummary.passCount)} />
                      <MiniMetric label="Attention Runs" value={String(filteredSummary.attentionCount)} />
                    </div>
                    {filteredRuns.length > 0 ? (
                      filteredRuns.map((run) => (
                        <div key={run.id} className="rounded-2xl border bg-background">
                          <div className="flex flex-col gap-3 border-b bg-muted/5 px-4 py-3 md:flex-row md:items-start md:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black uppercase tracking-tight">{run.label}</p>
                              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {new Date(run.createdAt).toLocaleString()} - {run.generatedBy}
                              </p>
                              {run.note ? (
                                <p className="mt-2 text-xs text-muted-foreground">{run.note}</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {activeRunId === run.id ? (
                                <Badge variant="default" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                  Active tracker
                                </Badge>
                              ) : null}
                              <RunHealthBadge status={getRunHealth(run)} />
                              {compareLeftId === run.id ? (
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                  Run A
                                </Badge>
                              ) : null}
                              {compareRightId === run.id ? (
                                <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                  Run B
                                </Badge>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => setCompareLeftId(run.id)}
                              >
                                Run A
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => setCompareRightId(run.id)}
                              >
                                Run B
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => handleExportSingleRunJson(run)}
                              >
                                <Download className="h-4 w-4" />
                                JSON
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2"
                                onClick={() => handleExportSingleRunCsv(run)}
                              >
                                <Download className="h-4 w-4" />
                                CSV
                              </Button>
                              {activeRunId !== run.id ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="gap-2"
                                  disabled={resumingRunId === run.id}
                                  onClick={() => void handleResumeTracking(run.id)}
                                >
                                  <Activity className="h-4 w-4" />
                                  {resumingRunId === run.id ? 'Resuming...' : 'Resume Tracking'}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
                                disabled={deletingRunId === run.id}
                                onClick={() => void handleDeleteRun(run.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingRunId === run.id ? 'Deleting...' : 'Delete Run'}
                              </Button>
                            </div>
                          </div>
                          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
                            <MiniMetric label="Users" value={String(run.writes.users)} />
                            <MiniMetric label="Aircraft" value={String(run.writes.aircraft)} />
                            <MiniMetric label="Bookings" value={String(run.writes.bookings)} />
                            <MiniMetric label="Debriefs" value={String(run.writes.studentReports)} />
                            <MiniMetric label="Meetings" value={String(run.writes.meetings)} />
                            <MiniMetric label="Total Writes" value={String(run.writes.total)} />
                          </div>
                          <div className="grid gap-3 border-t px-4 py-4 md:grid-cols-3">
                            <SignalTile icon={<PlaneTakeoff className="h-4 w-4 text-amber-600" />} label="Flight Hours" value={`${run.totals.simulatedFlightHours.toFixed(1)}h`} />
                            <SignalTile icon={<ShieldAlert className="h-4 w-4 text-rose-600" />} label="Safety Records" value={String(run.writes.safetyReports + run.writes.risks)} />
                            <SignalTile icon={<ClipboardCheck className="h-4 w-4 text-blue-600" />} label="Quality Records" value={String(run.writes.qualityAudits + run.writes.correctiveActionPlans)} />
                          </div>
                          <div className="grid gap-3 border-t px-4 py-4 md:grid-cols-2 xl:grid-cols-5">
                            <SignalTile icon={<Activity className="h-4 w-4 text-violet-600" />} label="Est. API" value={String(run.telemetry.estimatedApiRequests)} />
                            <SignalTile icon={<Database className="h-4 w-4 text-sky-600" />} label="Est. DB Reads" value={String(run.telemetry.estimatedDbReads)} />
                            <SignalTile icon={<ServerCog className="h-4 w-4 text-indigo-600" />} label="Est. DB Writes" value={String(run.telemetry.estimatedDbWrites)} />
                            <SignalTile icon={<Users className="h-4 w-4 text-emerald-600" />} label="Dash Refreshes" value={String(run.telemetry.estimatedDashboardRefreshes)} />
                            <SignalTile icon={<HardDrive className="h-4 w-4 text-slate-600" />} label="Est. Storage" value={`${run.telemetry.estimatedStorageMb.toFixed(1)} MB`} />
                          </div>
                          <div className="grid gap-3 border-t px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
                            <SignalTile icon={<Database className="h-4 w-4 text-cyan-700" />} label="Actual DB Ops" value={String(run.telemetry.actualDbOperations)} />
                            <SignalTile icon={<Database className="h-4 w-4 text-cyan-700" />} label="Actual Reads" value={String(run.telemetry.actualDbReads)} />
                            <SignalTile icon={<ServerCog className="h-4 w-4 text-cyan-700" />} label="Actual Writes" value={String(run.telemetry.actualDbWrites)} />
                            <SignalTile icon={<Activity className="h-4 w-4 text-cyan-700" />} label="Run Time" value={`${run.telemetry.actualDurationMs} ms`} />
                          </div>
                          <div className="border-t px-4 py-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Decoded Analysis</p>
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                Plain English
                              </Badge>
                            </div>
                            <div className="space-y-2 text-sm text-muted-foreground">
                              {getDecodedAnalysis(run).map((line, index) => (
                                <p key={`${run.id}-decoded-${index}`}>{line}</p>
                              ))}
                            </div>
                          </div>
                          <div className="border-t px-4 py-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Scenario Assertions</p>
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                {run.assertions.filter((assertion) => assertion.status === 'pass').length}/{run.assertions.length} pass
                              </Badge>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {run.assertions.map((assertion) => (
                                <AssertionTile key={`${run.id}-${assertion.id}`} assertion={assertion} />
                              ))}
                            </div>
                          </div>
                          <div className="border-t px-4 py-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Server Stage Telemetry</p>
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                {run.telemetry.stages.length} stages
                              </Badge>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {run.telemetry.stages.map((stage) => (
                                <div key={`${run.id}-${stage.label}`} className="rounded-xl border bg-muted/5 px-3 py-3">
                                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{stage.label}</p>
                                  <p className="mt-1 text-sm font-black">{stage.durationMs} ms</p>
                                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                    Reads {stage.reads} - Writes {stage.writes} - Ops {stage.operations}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="border-t px-4 py-4">
                            <div className="mb-3 flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Observed Route Usage</p>
                              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                                {run.telemetry.observedRoutes?.length || 0} routes
                              </Badge>
                            </div>
                            {run.telemetry.observedRoutes && run.telemetry.observedRoutes.length > 0 ? (
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {run.telemetry.observedRoutes.map((route) => (
                                  <div key={`${run.id}-${route.routeKey}`} className="rounded-xl border bg-muted/5 px-3 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{route.routeKey}</p>
                                    <p className="mt-1 text-sm font-black">{route.requestCount} requests</p>
                                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                      Reads {route.readCount} - Writes {route.writeCount} - Errors {route.errorCount}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                      {route.totalDurationMs} ms total
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed bg-muted/5 px-4 py-6 text-sm text-muted-foreground">
                                No downstream route activity has been observed for this run yet. Open dashboard, schedule, aircraft, meetings, or training pages to accumulate live telemetry.
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed bg-muted/5 px-4 py-10 text-center text-sm text-muted-foreground">
                        {runs.length > 0 ? 'No runs match the current filter.' : 'No simulation runs have been written yet.'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <Input type="number" min={0} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  );
}

function MetricTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="flex min-h-[132px] flex-col justify-between rounded-2xl border bg-muted/5 p-4">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <div>
        <p className="mt-4 text-2xl font-black tracking-tight">{value}</p>
        <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function TrendMetricCard({
  title,
  runs,
  getValue,
  valueFormatter,
  tone,
}: {
  title: string;
  runs: SimulationRunSummary[];
  getValue: (run: SimulationRunSummary) => number;
  valueFormatter: (value: number) => string;
  tone: 'emerald' | 'amber' | 'violet' | 'sky';
}) {
  const maxValue = Math.max(...runs.map((run) => getValue(run)), 0);
  const latest = runs[runs.length - 1];
  const toneClassMap = {
    emerald: 'bg-emerald-500/85',
    amber: 'bg-amber-500/85',
    violet: 'bg-violet-500/85',
    sky: 'bg-sky-500/85',
  } satisfies Record<typeof tone, string>;

  return (
    <div className="rounded-2xl border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
          <p className="mt-2 text-xl font-black tracking-tight">
            {latest ? valueFormatter(getValue(latest)) : '-'}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
          {runs.length} runs
        </Badge>
      </div>
      {runs.length > 0 ? (
        <div className="mt-4 flex h-28 items-end gap-2">
          {runs.map((run) => {
            const value = getValue(run);
            const height = maxValue > 0 ? Math.max((value / maxValue) * 100, 10) : 10;
            return (
              <div key={`${title}-${run.id}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-full w-full items-end rounded-xl bg-muted/30 p-1">
                  <div
                    className={`w-full rounded-lg ${toneClassMap[tone]}`}
                    style={{ height: `${height}%` }}
                    title={`${run.label}: ${valueFormatter(value)}`}
                  />
                </div>
                <div className="w-full text-center">
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                    {run.label}
                  </p>
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {new Date(run.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed bg-muted/5 px-4 py-6 text-sm text-muted-foreground">
          No runs available yet.
        </div>
      )}
    </div>
  );
}

function TelemetrySection({
  title,
  description,
  metrics,
}: {
  title: string;
  description: string;
  metrics: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="rounded-2xl border bg-background p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 grid gap-3">
        {metrics.map((metric) => (
          <div key={`${title}-${metric.label}`} className="rounded-xl border bg-muted/5 px-3 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{metric.label}</p>
            <p className="mt-1 text-lg font-black">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/5 px-3 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-black">{value}</p>
    </div>
  );
}

function SignalTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function AssertionTile({
  assertion,
}: {
  assertion: {
    id: string;
    label: string;
    status: 'pass' | 'watch' | 'fail';
    detail: string;
  };
}) {
  const tone =
    assertion.status === 'pass' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
    assertion.status === 'fail' ? 'border-rose-200 bg-rose-50 text-rose-700' :
    'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className={`rounded-xl border px-3 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em]">{assertion.label}</p>
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">{assertion.status}</span>
      </div>
      <p className="mt-2 text-xs">{assertion.detail}</p>
    </div>
  );
}

function RunHealthBadge({ status }: { status: 'pass' | 'watch' | 'fail' }) {
  const tone =
    status === 'pass' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
    status === 'fail' ? 'border-rose-200 bg-rose-50 text-rose-700' :
    'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>
      {status === 'pass' ? 'Healthy' : status === 'fail' ? 'Failing' : 'Watch'}
    </span>
  );
}

function ComparisonSummaryBadge({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const rounded = Number.isInteger(value) ? value : parseFloat(value.toFixed(1));
  const tone =
    value > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' :
    value < 0 ? 'border-rose-200 bg-rose-50 text-rose-700' :
    'border-input bg-muted/5 text-muted-foreground';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-lg font-black">
        {value > 0 ? '+' : ''}{rounded}{suffix}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em]">Run A minus Run B</p>
    </div>
  );
}

function ComparisonRunCard({ title, run }: { title: string; run: SimulationRunSummary }) {
  const observedRequests = run.telemetry.observedRoutes?.reduce((sum, route) => sum + route.requestCount, 0) || 0;
  return (
    <div className="rounded-2xl border bg-background">
      <div className="border-b bg-muted/5 px-4 py-3">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
        <p className="mt-1 text-sm font-black uppercase tracking-tight">{run.label}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {new Date(run.createdAt).toLocaleString()}
        </p>
        {run.note ? (
          <p className="mt-2 text-xs text-muted-foreground">{run.note}</p>
        ) : null}
      </div>
      <div className="grid gap-3 p-4 md:grid-cols-2">
        <MiniMetric label="Writes" value={String(run.writes.total)} />
        <MiniMetric label="Flight Hours" value={`${run.totals.simulatedFlightHours.toFixed(1)}h`} />
        <MiniMetric label="Estimated API" value={String(run.telemetry.estimatedApiRequests)} />
        <MiniMetric label="Observed Requests" value={String(observedRequests)} />
      </div>
    </div>
  );
}

function DeltaTile({ label, left, right, suffix }: { label: string; left: number; right: number; suffix: string }) {
  const delta = parseFloat((left - right).toFixed(1));
  const tone =
    delta > 0 ? 'text-emerald-700 border-emerald-200 bg-emerald-50' :
    delta < 0 ? 'text-rose-700 border-rose-200 bg-rose-50' :
    'text-muted-foreground border-input bg-muted/5';

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-3 text-2xl font-black">
        {delta > 0 ? '+' : ''}{delta}{suffix}
      </p>
      <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em]">
        Run A minus Run B
      </p>
    </div>
  );
}
