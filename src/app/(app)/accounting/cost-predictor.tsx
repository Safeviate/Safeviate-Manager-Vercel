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
  AZURE_APP_SERVICE_PLAN_OPTIONS,
  AZURE_POSTGRES_PLAN_OPTIONS,
  DEFAULT_PLATFORM_USAGE_INPUT,
  PLATFORM_ROLE_LABELS,
  PLATFORM_ROLE_ORDER,
  estimatePlatformUsage,
  type AzureAppServicePlan,
  type AzurePostgresPlan,
  type PlatformUsageInput,
} from '@/lib/platform-usage-estimator';
import { Cloud, Database, DollarSign, GaugeCircle, Network, Repeat2, Server, Users } from 'lucide-react';

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
  const [appServicePlan, setAppServicePlan] = useState<AzureAppServicePlan>(DEFAULT_PLATFORM_USAGE_INPUT.appServicePlan);
  const [postgresPlan, setPostgresPlan] = useState<AzurePostgresPlan>(DEFAULT_PLATFORM_USAGE_INPUT.postgresPlan);

  const estimate = useMemo(
    () =>
      estimatePlatformUsage({
        crewUsers: crewUsers[0],
        opsUsers: opsUsers[0],
        viewerUsers: viewerUsers[0],
        activityIntensityPercent: activityIntensity[0],
        trackingMinutesPerCrewUserPerDay: trackingMinutes[0],
        trackingWriteIntervalSeconds: trackingInterval[0],
        appServicePlan,
        postgresPlan,
      } satisfies PlatformUsageInput),
    [activityIntensity, appServicePlan, crewUsers, opsUsers, postgresPlan, trackingInterval, trackingMinutes, viewerUsers],
  );

  const totalCost = estimate.azure.appService.totalCost + estimate.azure.postgres.totalCost;
  const totalUsers = estimate.totals.users;
  const monthlyDataGb = estimate.totals.monthlyBandwidthGb;
  const trackingApiRequests = estimate.totals.monthlyTrackingWrites;
  const groupApiRequests = estimate.groups.crew.monthlyApiRequests + estimate.groups.ops.monthlyApiRequests + estimate.groups.viewer.monthlyApiRequests;
  const groupDbOps = estimate.groups.crew.monthlyDbOps + estimate.groups.ops.monthlyDbOps + estimate.groups.viewer.monthlyDbOps;
  const groupBandwidthGb = estimate.groups.crew.monthlyBandwidthGb + estimate.groups.ops.monthlyBandwidthGb + estimate.groups.viewer.monthlyBandwidthGb;
  const groupStorageGb = estimate.groups.crew.monthlyStorageGb + estimate.groups.ops.monthlyStorageGb + estimate.groups.viewer.monthlyStorageGb;

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
              hint="Raises sessions, API usage, database work, and outbound data across every user group."
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
                    Authenticated pages and API routes run through Azure App Service, while live-flight writes land in
                    Azure Database for PostgreSQL through Prisma ORM.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Azure Hosting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">App Service Plan</Label>
              <Select value={appServicePlan} onValueChange={(value) => setAppServicePlan(value as AzureAppServicePlan)}>
                <SelectTrigger className="h-10 border-slate-200 bg-white text-sm font-semibold">
                  <SelectValue placeholder="Select App Service plan" />
                </SelectTrigger>
                <SelectContent>
                  {AZURE_APP_SERVICE_PLAN_OPTIONS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label} - {currency.format(plan.baseCost)} / mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">PostgreSQL Flexible Server</Label>
              <Select value={postgresPlan} onValueChange={(value) => setPostgresPlan(value as AzurePostgresPlan)}>
                <SelectTrigger className="h-10 border-slate-200 bg-white text-sm font-semibold">
                  <SelectValue placeholder="Select PostgreSQL plan" />
                </SelectTrigger>
                <SelectContent>
                  {AZURE_POSTGRES_PLAN_OPTIONS.map((plan) => (
                    <SelectItem key={plan.value} value={plan.value}>
                      {plan.label} - {currency.format(plan.computeCost)} compute / mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-700">Current Target</p>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    This estimate is tuned for Azure App Service hosting with Azure Database for PostgreSQL Flexible
                    Server and Prisma as the ORM layer.
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
              App Service is estimated as a fixed monthly plan with public internet egress after the first 100 GB.
            </p>
            <p>
              PostgreSQL is estimated from compute, provisioned storage, and backup storage. Use the Azure Pricing
              Calculator for a final regional quote before committing spend.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="App Service"
            value={currency.format(estimate.azure.appService.totalCost)}
            subtitle={`${estimate.azure.appService.planLabel} plus bandwidth`}
            icon={Server}
            tone="default"
          />
          <MetricCard
            title="PostgreSQL"
            value={currency.format(estimate.azure.postgres.totalCost)}
            subtitle={`${estimate.azure.postgres.planLabel} compute and storage`}
            icon={Database}
            tone="success"
          />
          <MetricCard
            title="Azure Monthly"
            value={currency.format(totalCost)}
            subtitle={`${integerNumber.format(totalUsers)} users across the model`}
            icon={DollarSign}
            tone={totalCost > 250 ? 'warning' : 'default'}
          />
          <MetricCard
            title="Monthly Data"
            value={`${monthlyDataGb.toFixed(2)} GB`}
            subtitle={`${integerNumber.format(estimate.totals.monthlyApiRequests)} API requests`}
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
                  <TableHead className="text-[10px] font-black uppercase tracking-[0.18em]">Requests / Mo</TableHead>
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
                      <TableCell>{compactNumber.format(role.monthlyRequests)}</TableCell>
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
                  <TableCell>{compactNumber.format(trackingApiRequests)}</TableCell>
                  <TableCell>{compactNumber.format(estimate.totals.monthlyDbOps - groupDbOps)}</TableCell>
                  <TableCell>{(estimate.totals.monthlyBandwidthGb - groupBandwidthGb).toFixed(2)} GB</TableCell>
                  <TableCell>{(estimate.totals.monthlyStorageGb - groupStorageGb).toFixed(2)} GB</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="shadow-none border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
                App Service Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">{estimate.azure.appService.planLabel}</span>
                <span className="font-black text-slate-900">{currency.format(estimate.azure.appService.baseCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Public egress</span>
                <span className="font-black text-slate-900">{currency.format(estimate.azure.appService.bandwidthCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-white">
                <span className="font-black uppercase tracking-[0.16em]">Total App Service</span>
                <span className="font-black">{currency.format(estimate.azure.appService.totalCost)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
                PostgreSQL Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">{estimate.azure.postgres.planLabel} compute</span>
                <span className="font-black text-slate-900">{currency.format(estimate.azure.postgres.computeCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">{estimate.azure.postgres.provisionedStorageGb} GB storage</span>
                <span className="font-black text-slate-900">{currency.format(estimate.azure.postgres.storageCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="font-semibold text-slate-700">Backup storage</span>
                <span className="font-black text-slate-900">{currency.format(estimate.azure.postgres.backupCost)}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-emerald-900 bg-emerald-950 px-4 py-3 text-white">
                <span className="font-black uppercase tracking-[0.16em]">Total PostgreSQL</span>
                <span className="font-black">{currency.format(estimate.azure.postgres.totalCost)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-none border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">
              Capacity Check
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">App Requests</span>
                <Badge variant={estimate.totals.computeLoadPercent > 80 ? 'destructive' : 'secondary'}>
                  {estimate.totals.computeLoadPercent > 80 ? 'Watch' : 'OK'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-black text-slate-900">
                {compactNumber.format(estimate.totals.monthlyRequests)} / {compactNumber.format(estimate.azure.appService.estimatedRequestCapacity)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Postgres Ops</span>
                <Badge variant={estimate.azure.postgres.opsLoadPercent > 80 ? 'destructive' : 'secondary'}>
                  {estimate.azure.postgres.opsLoadPercent > 80 ? 'Watch' : 'OK'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-black text-slate-900">
                {compactNumber.format(estimate.totals.monthlyDbOps)} / {compactNumber.format(estimate.azure.postgres.estimatedOpsCapacity)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Outbound Data</span>
                <Badge variant={estimate.totals.monthlyBandwidthGb > estimate.azure.appService.includedBandwidthGb ? 'destructive' : 'secondary'}>
                  {estimate.totals.monthlyBandwidthGb > estimate.azure.appService.includedBandwidthGb ? 'Billable' : 'Free'}
                </Badge>
              </div>
              <p className="mt-2 text-sm font-black text-slate-900">
                {estimate.totals.monthlyBandwidthGb.toFixed(2)} GB / {estimate.azure.appService.includedBandwidthGb} GB
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
            <div className="flex gap-2">
              <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p>
                The model counted {compactNumber.format(groupApiRequests)} role-driven API requests before live tracking writes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
