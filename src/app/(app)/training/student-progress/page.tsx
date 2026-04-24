'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { GraduationCap, ArrowRight, Clock3, CalendarDays, Target, Star, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MainPageHeader } from '@/components/page-header';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PilotProfile } from '../../users/personnel/page';
import type { Booking } from '@/types/booking';
import type { StudentMilestoneSettings, StudentProgressReport, MilestoneWarning } from '@/types/training';
import { cn } from '@/lib/utils';

type StudentProgressRow = {
  id: string;
  name: string;
  email?: string;
  totalFlightHours: number;
  recentFlightHours: number;
  lastFlightDate: string | null;
  lastDebriefDate: string | null;
  daysSinceFlight: number | null;
  daysSinceDebrief: number | null;
  pacePerWeek: number;
  forecastDaysToNextMilestone: number | null;
  recommendedAction: string;
  milestoneHours: number | null;
  warningHours: number | null;
  status: 'safe' | 'watch' | 'over';
};

type SummaryPayload = {
  students?: PilotProfile[];
  bookings?: Array<Pick<Booking, 'studentId' | 'status'> & {
    date?: string;
    preFlightData?: { hobbs?: number };
    postFlightData?: { hobbs?: number };
  }>;
  studentProgressReports?: StudentProgressReport[];
  studentMilestones?: StudentMilestoneSettings | null;
};

type CompetencySignal = 'strength' | 'growth' | 'watch';

type CompetencyArea = {
  label: string;
  score: number;
  sampleCount: number;
  trend: number;
  signal: CompetencySignal;
};

const COMPETENCY_RULES: Array<{ key: string; label: string; keywords: string[]; strengthBias: number; growthBias: number }> = [
  { key: 'circuits', label: 'Circuits', keywords: ['circuit', 'circuits', 'traffic pattern', 'pattern'], strengthBias: 1.05, growthBias: 0.95 },
  { key: 'takeoff_landing', label: 'Takeoff & Landing', keywords: ['takeoff', 'landing', 'flare', 'roundout', 'touch and go'], strengthBias: 1, growthBias: 1 },
  { key: 'nav', label: 'Navigation', keywords: ['navigation', 'nav', 'map', 'route', 'waypoint', 'planning'], strengthBias: 1, growthBias: 1 },
  { key: 'radio', label: 'Radio Work', keywords: ['radio', 'comms', 'communication', 'phraseology', 'rt'], strengthBias: 1, growthBias: 1 },
  { key: 'airmanship', label: 'Airmanship', keywords: ['airmanship', 'lookout', 'situational awareness', 'awareness', 'scan'], strengthBias: 1.05, growthBias: 0.95 },
  { key: 'handling', label: 'Aircraft Handling', keywords: ['stall', 'stalls', 'turn', 'steep', 'climb', 'descent', 'handling'], strengthBias: 1, growthBias: 1 },
  { key: 'decision', label: 'Decision Making', keywords: ['decision', 'judgement', 'judgment', 'planning', 'situational', 'choice'], strengthBias: 0.95, growthBias: 1.05 },
];

const DEFAULT_STUDENT_MILESTONES: MilestoneWarning[] = [
  { milestone: 10, warningHours: 7 },
  { milestone: 20, warningHours: 17 },
  { milestone: 30, warningHours: 27 },
  { milestone: 40, warningHours: 37 },
];

const getPeriodDays = (period: 'week' | 'month' | 'all') => {
  if (period === 'week') return 7;
  if (period === 'month') return 30;
  return 90;
};

const getPeriodStart = (period: 'week' | 'month' | 'all', reference = new Date()) => {
  if (period === 'week') {
    const start = new Date(reference);
    start.setDate(reference.getDate() - 7);
    return start;
  }
  if (period === 'month') {
    const start = new Date(reference);
    start.setMonth(reference.getMonth() - 1);
    return start;
  }
  return null;
};

const getDaysSince = (date: Date | null, reference = new Date()) => {
  if (!date) return null;
  const diff = reference.getTime() - date.getTime();
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const formatDaysSince = (days: number | null) => {
  if (days === null) return 'N/A';
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
};

const formatHours = (hours: number) => `${hours.toFixed(1)}h`;
const formatPace = (hoursPerWeek: number) => `${hoursPerWeek.toFixed(1)}h/wk`;

const formatDateLabel = (date: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);

const getStudentRecommendation = (row: {
  status: 'safe' | 'watch' | 'over';
  daysSinceFlight: number | null;
  daysSinceDebrief: number | null;
  forecastDaysToNextMilestone: number | null;
}) => {
  if (row.daysSinceFlight === null) return 'Schedule first lesson';
  if (row.daysSinceFlight >= 30) return 'Re-engage student';
  if (row.daysSinceFlight >= 14) return 'Book refresher flight';
  if (row.daysSinceDebrief === null || row.daysSinceDebrief > row.daysSinceFlight) return 'Complete debrief';
  if (row.status !== 'safe') return 'Review milestone';
  if (row.forecastDaysToNextMilestone !== null && row.forecastDaysToNextMilestone <= 30) return 'Plan milestone check';
  return 'Keep current pace';
};

const resolveCompetencyRules = (entry: StudentProgressReport['entries'][number]) => {
  if (entry.competencyKey) {
    const normalized = entry.competencyKey.toLowerCase();
    const directMatch = COMPETENCY_RULES.filter(
      (rule) => rule.key === normalized || rule.label.toLowerCase() === normalized
    );
    if (directMatch.length > 0) {
      return directMatch;
    }
  }

  const text = `${entry.exercise || ''} ${entry.comment || ''}`.toLowerCase();
  return COMPETENCY_RULES.filter((rule) => rule.keywords.some((keyword) => text.includes(keyword)));
};

const buildCompetencyAreas = (reports: StudentProgressReport[]): CompetencyArea[] => {
  const buckets = new Map<string, { label: string; scoreTotal: number; sampleCount: number; trendTotal: number; signalVotes: Record<CompetencySignal, number> }>();

  COMPETENCY_RULES.forEach((rule) => {
    buckets.set(rule.key, {
      label: rule.label,
      scoreTotal: 0,
      sampleCount: 0,
      trendTotal: 0,
      signalVotes: { strength: 0, growth: 0, watch: 0 },
    });
  });

  const sortedReports = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  sortedReports.forEach((report, reportIndex) => {
    const reportWeight = Math.max(0.4, 1 - reportIndex * 0.12);
    report.entries.forEach((entry) => {
      const matches = resolveCompetencyRules(entry);
      if (matches.length === 0) return;
      matches.forEach((rule) => {
        const bucket = buckets.get(rule.key);
        if (!bucket) return;
        const normalizedRating = Math.max(0, Math.min(1, (entry.rating - 1) / 3));
        bucket.scoreTotal += normalizedRating * 100 * reportWeight * (entry.rating >= 3 ? rule.strengthBias : rule.growthBias);
        bucket.trendTotal += entry.rating;
        bucket.sampleCount += 1;
        const signal: CompetencySignal = entry.competencySignal || (entry.rating >= 3 ? 'strength' : entry.rating <= 2 ? 'growth' : 'watch');
        bucket.signalVotes[signal] += reportWeight;
      });
    });
  });

  return Array.from(buckets.values())
    .map((bucket) => {
      const averageScore = bucket.sampleCount > 0 ? bucket.scoreTotal / bucket.sampleCount : 0;
      const averageRating = bucket.sampleCount > 0 ? bucket.trendTotal / bucket.sampleCount : 0;
      const voteSignal = (Object.entries(bucket.signalVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || null) as CompetencySignal | null;
      const signal: CompetencySignal = voteSignal || (averageRating >= 3.4 ? 'strength' : averageRating <= 2.4 ? 'growth' : 'watch');
      return {
        label: bucket.label,
        score: parseFloat(averageScore.toFixed(1)),
        sampleCount: bucket.sampleCount,
        trend: parseFloat(averageRating.toFixed(1)),
        signal,
      };
    })
    .filter((area) => area.sampleCount > 0)
    .sort((a, b) => {
      if (a.signal !== b.signal) {
        if (a.signal === 'growth') return -1;
        if (b.signal === 'growth') return 1;
        if (a.signal === 'watch') return -1;
        if (b.signal === 'watch') return 1;
      }
      return a.score - b.score;
    });
};

const getCompetencySnapshot = (reports: StudentProgressReport[]) => {
  const areas = buildCompetencyAreas(reports);
  const strengths = areas.filter((area) => area.signal === 'strength').slice(0, 1);
  const growth = areas.filter((area) => area.signal === 'growth').slice(0, 1);
  const watch = areas.filter((area) => area.signal === 'watch').slice(0, 1);
  const signal: CompetencySignal = growth.length > 0 ? 'growth' : watch.length > 0 ? 'watch' : 'strength';
  const headline = growth[0]?.label || watch[0]?.label || strengths[0]?.label || 'No competency data yet';
  const score = areas.length > 0 ? areas.reduce((sum, area) => sum + area.score, 0) / areas.length : 0;
  const nextFocus = growth[0]
    ? `Next focus: ${growth[0].label}`
    : watch[0]
      ? `Next focus: ${watch[0].label}`
      : strengths[0]
        ? `Keep reinforcing ${strengths[0].label}`
        : 'Next focus: add debrief notes';

  return {
    signal,
    headline,
    score: parseFloat(score.toFixed(1)),
    nextFocus,
    strengths,
    growth,
    watch,
  };
};

const getCompetencyTone = (signal: CompetencySignal) => {
  if (signal === 'strength') {
    return {
      border: 'border-emerald-200',
      bg: 'bg-emerald-50',
      pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
      bar: 'bg-emerald-500',
      label: 'Strength',
    };
  }

  if (signal === 'growth') {
    return {
      border: 'border-rose-200',
      bg: 'bg-rose-50',
      pill: 'bg-rose-500/10 text-rose-700 border-rose-200',
      bar: 'bg-rose-500',
      label: 'Growth area',
    };
  }

  return {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    pill: 'bg-amber-500/10 text-amber-700 border-amber-200',
    bar: 'bg-amber-500',
    label: 'Watch',
  };
};

function CompetencyStrip({ reports }: { reports: StudentProgressReport[] }) {
  const snapshot = useMemo(() => getCompetencySnapshot(reports), [reports]);
  const tone = getCompetencyTone(snapshot.signal);

  return (
    <div className={cn('rounded-xl border p-3 space-y-3', tone.border, tone.bg)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {snapshot.signal === 'strength' ? (
              <Star className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-rose-600" />
            )}
            <p className="text-[10px] font-black uppercase tracking-[0.16em]">Strength / Growth</p>
          </div>
          <p className="mt-1 text-xs font-semibold">{snapshot.headline}</p>
        </div>
        <Badge variant="outline" className={cn('text-[10px] font-black uppercase tracking-[0.16em]', tone.pill)}>
          {tone.label}
        </Badge>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
          <span>Average skill score</span>
          <span>{Math.round(snapshot.score)} / 100</span>
        </div>
        <Progress value={Math.min(Math.max(snapshot.score, 0), 100)} indicatorClassName={tone.bar} className="h-1.5" />
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {snapshot.nextFocus}
        </p>
      </div>
    </div>
  );
}

export default function StudentProgressPage() {
  const [students, setStudents] = useState<PilotProfile[]>([]);
  const [summary, setSummary] = useState<SummaryPayload>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activePeriod, setActivePeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch('/api/dashboard-summary', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as SummaryPayload;
        if (!cancelled) {
          setStudents(Array.isArray(payload?.students) ? payload.students : []);
          setSummary(payload || {});
        }
      } catch (e) {
        console.error('Failed to load students', e);
        if (!cancelled) {
          setStudents([]);
          setSummary({});
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const studentMilestones = useMemo<MilestoneWarning[]>(() => {
    const settings = summary.studentMilestones;
    const milestones = settings && Array.isArray(settings.milestones) ? settings.milestones : DEFAULT_STUDENT_MILESTONES;
    return milestones
      .map((entry) => ({
        milestone: typeof entry.milestone === 'number' ? entry.milestone : Number(entry.milestone),
        warningHours: typeof entry.warningHours === 'number' ? entry.warningHours : Number(entry.warningHours),
      }))
      .filter((entry) => Number.isFinite(entry.milestone) && Number.isFinite(entry.warningHours) && entry.milestone > 0 && entry.warningHours >= 0 && entry.warningHours < entry.milestone)
      .sort((a, b) => a.milestone - b.milestone);
  }, [summary.studentMilestones]);

  const competencyReports = useMemo(() => (Array.isArray(summary.studentProgressReports) ? summary.studentProgressReports : []), [summary.studentProgressReports]);

  const studentRows = useMemo<StudentProgressRow[]>(() => {
    const bookings = Array.isArray(summary.bookings) ? summary.bookings : [];
    const reports = Array.isArray(summary.studentProgressReports) ? summary.studentProgressReports : [];
    const periodStart = getPeriodStart(activePeriod);
    const now = new Date();
    const periodDays = getPeriodDays(activePeriod);
    const periodBookings = periodStart
      ? bookings.filter((booking) => {
          if (!booking.date) return false;
          const bookingDate = new Date(booking.date);
          return !Number.isNaN(bookingDate.getTime()) && bookingDate >= periodStart && bookingDate <= now;
        })
      : bookings;

    return (students || []).map((student) => {
      const studentBookings = bookings.filter((booking) => booking.studentId === student.id);
      const periodStudentBookings = periodBookings.filter((booking) => booking.studentId === student.id);
      const studentReports = reports.filter((report) => report.studentId === student.id);
      const totalFlightHours = studentBookings.reduce((sum, booking) => {
        const pre = booking.preFlightData?.hobbs;
        const post = booking.postFlightData?.hobbs;
        if (pre === undefined || post === undefined) return sum;
        return sum + Math.max(0, post - pre);
      }, 0);
      const recentFlightHours = periodStudentBookings.reduce((sum, booking) => {
        const pre = booking.preFlightData?.hobbs;
        const post = booking.postFlightData?.hobbs;
        if (pre === undefined || post === undefined) return sum;
        return sum + Math.max(0, post - pre);
      }, 0);
      const lastFlightDate = studentBookings
        .map((booking) => booking.date ? new Date(booking.date) : null)
        .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;
      const lastDebriefDate = studentReports
        .map((report) => new Date(report.date))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime())[0] || null;
      const daysSinceFlight = getDaysSince(lastFlightDate, now);
      const daysSinceDebrief = getDaysSince(lastDebriefDate, now);
      const nextMilestone = studentMilestones.find((milestone) => totalFlightHours < milestone.milestone) || null;
      const pacePerWeek = periodDays > 0 ? parseFloat(((recentFlightHours / periodDays) * 7).toFixed(1)) : 0;
      const forecastDaysToNextMilestone = nextMilestone && recentFlightHours > 0
        ? Math.max(0, Math.ceil(((nextMilestone.milestone - totalFlightHours) / recentFlightHours) * periodDays))
        : null;
      const status: StudentProgressRow['status'] = !nextMilestone
        ? 'over'
        : totalFlightHours >= nextMilestone.warningHours
          ? 'watch'
          : 'safe';
      const recommendedAction = getStudentRecommendation({
        status,
        daysSinceFlight,
        daysSinceDebrief,
        forecastDaysToNextMilestone,
      });

      return {
        id: student.id,
        name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.id,
        email: student.email,
        totalFlightHours: parseFloat(totalFlightHours.toFixed(1)),
        recentFlightHours: parseFloat(recentFlightHours.toFixed(1)),
        lastFlightDate: lastFlightDate ? lastFlightDate.toISOString() : null,
        lastDebriefDate: lastDebriefDate ? lastDebriefDate.toISOString() : null,
        daysSinceFlight,
        daysSinceDebrief,
        pacePerWeek,
        forecastDaysToNextMilestone,
        recommendedAction,
        milestoneHours: nextMilestone ? nextMilestone.milestone : null,
        warningHours: nextMilestone ? nextMilestone.warningHours : null,
        status,
      };
    }).sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === 'over') return -1;
        if (b.status === 'over') return 1;
        if (a.status === 'watch') return -1;
        if (b.status === 'watch') return 1;
      }
      return b.recentFlightHours - a.recentFlightHours || b.totalFlightHours - a.totalFlightHours;
    });
  }, [activePeriod, studentMilestones, students, summary.bookings, summary.studentProgressReports]);

  const activeCount = studentRows.filter((row) => row.recentFlightHours > 0).length;
  const stagnatingCount = studentRows.filter((row) => row.daysSinceFlight !== null && row.daysSinceFlight >= 30).length;
  const forecastCount = studentRows.filter((row) => row.forecastDaysToNextMilestone !== null && row.forecastDaysToNextMilestone <= 30).length;

  if (isLoading) {
    return (
      <div className="max-w-[1100px] mx-auto w-full h-full overflow-hidden space-y-6 px-1">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto w-full h-full overflow-hidden flex flex-col gap-6 px-1">
      <Card className="flex min-h-0 flex-col overflow-hidden border border-card-border shadow-none">
        <MainPageHeader
          title="Student Progress"
          description="See student flight cadence, recency, and milestone pressure in one place."
          className="[&>div:first-child]:h-10 [&>div:first-child]:py-0 [&>div:first-child]:items-center"
        />

        <CardContent className="min-h-0 flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-4 lg:p-6">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <StatTile label="Active Students" value={String(activeCount)} hint="Students flown in the period" />
                <StatTile label="Stagnant" value={String(stagnatingCount)} hint="30+ days since last flight" />
                <StatTile label="Forecast Due" value={String(forecastCount)} hint="Next milestone within 30 days" />
                <StatTile label="Period" value={activePeriod === 'week' ? '7 Days' : activePeriod === 'month' ? '30 Days' : 'All Time'} hint="Current view window" />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <PeriodButton active={activePeriod === 'week'} label="7 Days" onClick={() => setActivePeriod('week')} />
                <PeriodButton active={activePeriod === 'month'} label="30 Days" onClick={() => setActivePeriod('month')} />
                <PeriodButton active={activePeriod === 'all'} label="All Time" onClick={() => setActivePeriod('all')} />
              </div>

              <div className="rounded-2xl border bg-muted/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">Student Competency Overview</p>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      A separate read on the current student pool, before you open any individual card.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.16em]">
                    {competencyReports.length} debrief{competencyReports.length === 1 ? '' : 's'}
                  </Badge>
                </div>
                {competencyReports.length > 0 ? (
                  <CompetencyStrip reports={competencyReports} />
                ) : (
                  <div className="rounded-xl border border-dashed bg-background p-4 text-sm text-muted-foreground">
                    No competency data has been captured yet. The overview will populate once instructors tag strengths and growth areas in the debrief form.
                  </div>
                )}
              </div>

              {studentRows.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {studentRows.map((student) => {
                    const reports = Array.isArray(summary.studentProgressReports)
                      ? summary.studentProgressReports.filter((report) => report.studentId === student.id)
                      : [];
                    const lastFlight = student.lastFlightDate ? new Date(student.lastFlightDate) : null;
                    const lastDebrief = student.lastDebriefDate ? new Date(student.lastDebriefDate) : null;
                    const statusClass = student.status === 'over'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : student.status === 'watch'
                        ? 'border-amber-200 bg-amber-50 text-amber-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

                    return (
                      <Link key={student.id} href={`/training/student-progress/${student.id}`}>
                        <Card className="h-full overflow-hidden border shadow-none transition-colors hover:bg-muted/40">
                          <CardHeader className="border-b bg-muted/5 px-4 py-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <CardTitle className="truncate text-sm font-black uppercase tracking-tight">{student.name}</CardTitle>
                                <CardDescription className="truncate text-[10px] font-bold uppercase tracking-[0.16em]">
                                  {student.email || 'No email on file'}
                                </CardDescription>
                              </div>
                              <Badge variant={student.status === 'over' ? 'destructive' : student.status === 'watch' ? 'secondary' : 'outline'} className="text-[10px] font-black uppercase">
                                {student.status === 'over' ? 'At risk' : student.status === 'watch' ? 'Watch' : 'Safe'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 p-4">
                            <CompetencyStrip reports={reports} />

                            <div className="grid gap-3 sm:grid-cols-2">
                              <InfoPill icon={<Clock3 className="h-3.5 w-3.5" />} label="Last Flight" value={lastFlight ? formatDateLabel(lastFlight) : 'None'} />
                              <InfoPill icon={<CalendarDays className="h-3.5 w-3.5" />} label="Days Since Flight" value={formatDaysSince(student.daysSinceFlight)} />
                              <InfoPill icon={<Target className="h-3.5 w-3.5" />} label="Pace" value={formatPace(student.pacePerWeek)} />
                              <InfoPill icon={<Clock3 className="h-3.5 w-3.5" />} label="Recent Hours" value={formatHours(student.recentFlightHours)} />
                            </div>

                            <div className="rounded-xl border bg-background px-3 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Last Debrief</p>
                              <p className="mt-1 text-sm font-semibold">{lastDebrief ? formatDateLabel(lastDebrief) : 'None'}</p>
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                                {student.daysSinceDebrief !== null ? `${student.daysSinceDebrief} days since debrief` : 'No debrief yet'}
                              </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3">
                              <div className="rounded-xl border bg-background px-3 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Total Hours</p>
                                <p className="mt-1 text-sm font-black">{formatHours(student.totalFlightHours)}</p>
                              </div>
                              <div className="rounded-xl border bg-background px-3 py-3">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Forecast</p>
                                <p className="mt-1 text-sm font-black">
                                  {student.forecastDaysToNextMilestone !== null ? `${student.forecastDaysToNextMilestone} days` : 'N/A'}
                                </p>
                              </div>
                              <div className={cn('rounded-xl border px-3 py-3', statusClass)}>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em]">Action</p>
                                <p className="mt-1 text-sm font-black">{student.recommendedAction}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <Card className="flex items-center justify-center h-64 shadow-none border bg-muted/5">
                  <div className="text-center space-y-4">
                    <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground opacity-20" />
                    <div className="space-y-1">
                      <h3 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">No Students Found</h3>
                      <p className="text-xs text-muted-foreground italic">Add students in the Users section to see their progress here.</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="flex min-h-[128px] flex-col justify-between rounded-2xl border bg-muted/5 p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="mt-2 text-[10px] font-medium uppercase text-muted-foreground">{hint}</p>
    </div>
  );
}

function InfoPill({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/5 px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function PeriodButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 rounded-md border px-3 text-[9px] font-black uppercase tracking-[0.08em] shadow-none transition-colors',
        active ? 'border-foreground text-foreground' : 'border-input bg-background text-muted-foreground'
      )}
    >
      {label}
    </button>
  );
}
