'use client';

import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PLATFORM_USAGE_INPUT,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLE_ORDER,
  estimatePlatformUsage,
  type PlatformUsageInput,
  type PrismaMode,
  type PrismaPostgresPlan,
} from '@/lib/platform-usage-estimator';
import { Database, DollarSign, GaugeCircle, Network, Repeat2, Server, Users } from 'lucide-react';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactNumber = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 2,
});

const integerNumber = new Intl.NumberFormat('en-US');

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'default',
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof DollarSign;
  tone?: 'default' | 'success' | 'warning';
}) {
  const toneClasses = {
    default: 'bg-slate-950 text-slate-100 border-slate-200',
    success: 'bg-emerald-50 text-emerald-950 border-emerald-200',
    warning: 'bg-amber-50 text-amber-950 border-amber-200',
  }[tone];

  return (
    <Card className={cn('shadow-none border', toneClasses)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-current/70">
          <Icon className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-black tracking-tight">{value}</div>
        <p className="text-[11px] leading-relaxed text-current/70">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ControlSlider({
  label,
  value,
  onValueChange,
  min,
  max,
  step,
  suffix,
  hint,
}: {
  label: string;
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step: number;
  suffix: string;
  hint?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</Label>
        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-800">
          {value[0]} {suffix}
        </span>
      </div>
      <Slider value={value} onValueChange={onValueChange} min={min} max={max} step={step} className="cursor-pointer" />
      {hint ? <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function CostPredictor() {
  const [crewUsers, setCrewUsers] = useState([DEFAULT_PLATFORM_USAGE_INPUT.crewUsers]);
  const [opsUsers, setOpsUsers] = useState([DEFAULT_PLATFORM_USAGE_INPUT.opsUsers]);
  const [viewerUsers, setViewerUsers] = useState([DEFAULT_PLATFORM_USAGE_INPUT.viewerUsers]);
  const [activityIntensity, setActivityIntensity] = useState([DEFAULT_PLATFORM_USAGE_INPUT.activityIntensityPercent]);
  const [trackingMinutes, setTrackingMinutes] = useState([DEFAULT_PLATFORM_USAGE_INPUT.trackingMinutesPerCrewUserPerDay]);
  const [trackingInterval, setTrackingInterval] = useState([DEFAULT_PLATFORM_USAGE_INPUT.trackingWriteIntervalSeconds]);
  const [prismaMode, setPrismaMode] = useState<PrismaMode>(DEFAULT_PLATFORM_USAGE_INPUT.prismaMode);
  const [prismaPlan, setPrismaPlan] = useState<PrismaPostgresPlan>(DEFAULT_PLATFORM_USAGE_INPUT.prismaPlan);

  const estimate = useMemo(
    () =>
      estimatePlatformUsage({
        crewUsers: crewUsers[0],
        opsUsers: opsUsers[0],
        viewerUsers: viewerUsers[0],
        activityIntensityPercent: activityIntensity[0],
        trackingMinutesPerCrewUserPerDay: trackingMinutes[0],
        trackingWriteIntervalSeconds: trackingInterval[0],
        prismaMode,
        prismaPlan,
      } satisfies PlatformUsageInput),
    [activityIntensity, crewUsers, opsUsers, prismaMode, prismaPlan, trackingInterval, trackingMinutes, viewerUsers],
  );

  const totalCost = estimate.vercel.totalCost + estimate.prisma.totalCost;
  const totalUsers = estimate.totals.users;
  const monthlyDataGb = estimate.totals.monthlyBandwidthGb;

  return (
    <div className="grid gap-6 bg-background p-6 lg:grid-cols-[0.95fr_1.3fr]">
      <div className="space-y-6">
        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Usage Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ControlSlider
              label={PLATFORM_ROLE_LABELS.crew}
              value={crewUsers}
              onValueChange={setCrewUsers}
              min={0}
              max={250}
              step={1}
              suffix="users"
              hint="Models pilots, instructors, and students that use live flight tracking and route screens."
            />
            <ControlSlider
              label={PLATFORM_ROLE_LABELS.ops}
              value={opsUsers}
              onValueChange={setOpsUsers}
              min={0}
              max={120}
              step={1}
              suffix="users"
              hint="Models dispatch, admin, and fleet-tracker users that keep refreshing operational screens."
            />
            <ControlSlider
              label={PLATFORM_ROLE_LABELS.viewer}
              value={viewerUsers}
              onValueChange={setViewerUsers}
              min={0}
              max={250}
              step={1}
              suffix="users"
              hint="Models read-only or management users that mostly browse data and dashboards."
            />
            <ControlSlider
              label="Activity Intensity"
              value={activityIntensity}
              onValueChange={setActivityIntensity}
              min={50}
              max={250}
              step={10}
              suffix="%"
              hint="Raises sessions, API usage, and database operations across every user group."
            />
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Live Tracking Load
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <ControlSlider
              label="Tracking Minutes / Crew / Day"
              value={trackingMinutes}
              onValueChange={setTrackingMinutes}
              min={0}
              max={180}
              step={5}
              suffix="min"
              hint="Each active flight writes one GPS sample every few seconds while tracking is running."
            />
            <ControlSlider
              label="Tracking Write Interval"
              value={trackingInterval}
              onValueChange={setTrackingInterval}
              min={2}
              max={15}
              step={1}
              suffix="sec"
              hint="Safeviate currently writes about every 5 seconds, but this lets you model tighter or looser cadences."
            />
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <GaugeCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">Assumption</p>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    This models the real app pattern: authenticated page views hit Vercel, live-flight writes hit the API,
                    and Prisma ORM only becomes billable if you move to Prisma Postgres.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Database Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Mode</Label>
              <Select value={prismaMode} onValueChange={(value) => setPrismaMode(value as PrismaMode)}>
                <SelectTrigger className="h-10 border-slate-200 bg-white text-sm font-semibold">
                  <SelectValue placeholder="Select database mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">Current setup - Prisma ORM only</SelectItem>
                  <SelectItem value="prisma-postgres">Prisma Postgres</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cn('space-y-2', prismaMode === 'external' && 'opacity-50')}>
              <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Prisma Postgres Plan</Label>
              <Select
                value={prismaPlan}
                onValueChange={(value) => setPrismaPlan(value as PrismaPostgresPlan)}
                disabled={prismaMode === 'external'}
              >
                <SelectTrigger className="h-10 border-slate-200 bg-white text-sm font-semibold">
                  <SelectValue placeholder="Select Prisma plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Database className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">Current Setup</p>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    This repository currently uses PostgreSQL through Prisma ORM, so Prisma itself is free unless you
                    switch to Prisma Postgres.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Pricing Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[11px] leading-relaxed text-slate-600">
            <p>
              The Vercel estimate assumes a Pro workspace with one developer seat, then adds usage overages for
              invocations, edge requests, and fast data transfer.
            </p>
            <p>
              External map tile traffic is excluded because those requests go directly to the tile provider rather than
              Vercel.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Vercel Monthly"
            value={currency.format(estimate.vercel.totalCost)}
            subtitle={`$${estimate.vercel.baseCost.toFixed(0)} base + usage overages`}
            icon={Server}
            tone="default"
          />
          <MetricCard
            title="Prisma Monthly"
            value={currency.format(estimate.prisma.totalCost)}
            subtitle={
              prismaMode === 'external'
                ? 'Current Prisma ORM setup'
                : `${estimate.prisma.baseCost.toFixed(0)} base + selected Prisma Postgres usage`
            }
            icon={Database}
            tone={prismaMode === 'external' ? 'success' : 'default'}
          />
          <MetricCard
            title="Combined Monthly"
            value={currency.format(totalCost)}
            subtitle={`${integerNumber.format(totalUsers)} users across the model`}
            icon={DollarSign}
            tone={totalCost > 250 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Monthly Data"
            value={`${monthlyDataGb.toFixed(2)} GB`}
            subtitle={`${integerNumber.format(estimate.totals.monthlyFunctionInvocations)} function invocations`}
            icon={Network}
            tone="default"
          />
        </div>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              User Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Role</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Users</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Sessions / Mo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Invocations / Mo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">DB Ops / Mo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Bandwidth / Mo</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Storage / Mo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLATFORM_ROLE_ORDER.map((key) => {
                  const role = estimate.groups[key];
                  return (
                    <TableRow key={key}>
                      <TableCell className="font-black text-slate-900">{role.label}</TableCell>
                      <TableCell>{integerNumber.format(role.users)}</TableCell>
                      <TableCell>{compactNumber.format(role.monthlySessions)}</TableCell>
                      <TableCell>{compactNumber.format(role.monthlyFunctionInvocations)}</TableCell>
                      <TableCell>{compactNumber.format(role.monthlyDbOps)}</TableCell>
                      <TableCell>{role.monthlyBandwidthGb.toFixed(2)} GB</TableCell>
                      <TableCell>{role.monthlyStorageGb.toFixed(2)} GB</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-slate-50">
                  <TableCell className="font-black uppercase tracking-[0.16em] text-slate-700">Tracking writes</TableCell>
                  <TableCell className="font-semibold text-slate-600" colSpan={2}>
                    Active flights writing every {trackingInterval[0]} sec
                  </TableCell>
                  <TableCell>{compactNumber.format(estimate.totals.monthlyFunctionInvocations - estimate.groups.crew.monthlyFunctionInvocations - estimate.groups.ops.monthlyFunctionInvocations - estimate.groups.viewer.monthlyFunctionInvocations)}</TableCell>
                  <TableCell>{compactNumber.format(estimate.totals.monthlyDbOps - estimate.groups.crew.monthlyDbOps - estimate.groups.ops.monthlyDbOps - estimate.groups.viewer.monthlyDbOps)}</TableCell>
                  <TableCell>{(estimate.totals.monthlyBandwidthGb - estimate.groups.crew.monthlyBandwidthGb - estimate.groups.ops.monthlyBandwidthGb - estimate.groups.viewer.monthlyBandwidthGb).toFixed(2)} GB</TableCell>
                  <TableCell>{(estimate.totals.monthlyStorageGb - estimate.groups.crew.monthlyStorageGb - estimate.groups.ops.monthlyStorageGb - estimate.groups.viewer.monthlyStorageGb).toFixed(2)} GB</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-none border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
                Vercel Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Pro workspace seat</span>
                <span className="font-black text-slate-900">{currency.format(estimate.vercel.baseCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Function invocations</span>
                <span className="font-black text-slate-900">{currency.format(estimate.vercel.invocationCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Edge requests</span>
                <span className="font-black text-slate-900">{currency.format(estimate.vercel.edgeRequestCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Fast data transfer</span>
                <span className="font-black text-slate-900">{currency.format(estimate.vercel.bandwidthCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-white">
                <span className="font-black uppercase tracking-[0.16em]">Total Vercel</span>
                <span className="font-black">{currency.format(estimate.vercel.totalCost)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
                Prisma Cost Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">
                  {prismaMode === 'external' ? 'Current Prisma ORM setup' : 'Prisma Postgres base'}
                </span>
                <span className="font-black text-slate-900">{currency.format(estimate.prisma.baseCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Operations</span>
                <span className="font-black text-slate-900">{currency.format(estimate.prisma.operationCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Storage</span>
                <span className="font-black text-slate-900">{currency.format(estimate.prisma.storageCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3 text-white">
                <span className="font-black uppercase tracking-[0.16em]">Total Prisma</span>
                <span className="font-black">{currency.format(estimate.prisma.totalCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Threshold Check
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Vercel Invocations</span>
                <Badge variant={estimate.totals.monthlyFunctionInvocations > estimate.vercel.includedInvocations ? 'destructive' : 'secondary'}>
                  {estimate.totals.monthlyFunctionInvocations > estimate.vercel.includedInvocations ? 'Over' : 'Within'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-black text-slate-900">
                {compactNumber.format(estimate.totals.monthlyFunctionInvocations)} / {compactNumber.format(estimate.vercel.includedInvocations)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Edge Requests</span>
                <Badge variant={estimate.totals.monthlyEdgeRequests > estimate.vercel.includedEdgeRequests ? 'destructive' : 'secondary'}>
                  {estimate.totals.monthlyEdgeRequests > estimate.vercel.includedEdgeRequests ? 'Over' : 'Within'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-black text-slate-900">
                {compactNumber.format(estimate.totals.monthlyEdgeRequests)} / {compactNumber.format(estimate.vercel.includedEdgeRequests)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Prisma Ops {prismaMode === 'external' ? '(free)' : ''}
                </span>
                <Badge variant={prismaMode === 'external' ? 'secondary' : estimate.totals.monthlyDbOps > estimate.prisma.includedOperations ? 'destructive' : 'secondary'}>
                  {prismaMode === 'external' ? 'Free' : estimate.totals.monthlyDbOps > estimate.prisma.includedOperations ? 'Over' : 'Within'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-black text-slate-900">
                {compactNumber.format(estimate.totals.monthlyDbOps)} / {prismaMode === 'external' ? 'N/A' : compactNumber.format(estimate.prisma.includedOperations)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Estimated Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[11px] leading-relaxed text-slate-600">
            {estimate.notes.map((note) => (
              <div key={note} className="flex gap-2">
                <Repeat2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <p>{note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
