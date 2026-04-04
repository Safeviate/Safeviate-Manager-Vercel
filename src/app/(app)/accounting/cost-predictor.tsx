'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Info, AlertCircle, TrendingUp, Calculator, Users, Plane, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Legacy cloud pricing constants (reference only)
const COST_PER_100K_READS = 0.06;
const COST_PER_100K_WRITES = 0.18;
const FREE_READS_DAILY = 50000;
const FREE_WRITES_DAILY = 20000;

export function CostPredictor() {
  // --- Input State ---
  const [numPilots, setNumPilots] = useState([50]);
  const [numAircraft, setNumAircraft] = useState([10]);
  const [numAdmin, setNumAdmin] = useState([5]);
  const [dailySessionsPerUser, setDailySessionsPerUser] = useState([3]);
  const [growthFactor, setGrowthFactor] = useState([20]); // % projected growth

  // --- Calculation Logic ---
  const stats = useMemo(() => {
    const pilots = Math.round(numPilots[0] * (1 + growthFactor[0] / 100));
    const totalUsers = pilots + numAdmin[0];
    const totalSessionsDaily = totalUsers * dailySessionsPerUser[0];

    // READS ESTIMATION:
    // Based on Dashboard/Schedule page analysis, an average session fetches ~200 docs 
    // (Aircraft, Personnel, Bookings, Safety Reports, Audits etc)
    const avgReadsPerSession = 200; 
    const totalReadsDaily = totalSessionsDaily * avgReadsPerSession;

    // WRITES ESTIMATION:
    // Avg 5 writes per active flight/booking lifecycle.
    // Assume 40% of sessions involve a data mutation (booking/report/log).
    const activeMutationsDaily = totalSessionsDaily * 0.4;
    const avgWritesPerMutation = 5;
    const totalWritesDaily = activeMutationsDaily * avgWritesPerMutation;

    const daysInMonth = 30;
    
    // Monthly aggregates & Costing
    const monthlyReads = totalReadsDaily * daysInMonth;
    // Free tier is daily, so we calculate excess daily and then sum for the month
    const billableReadsDaily = Math.max(0, totalReadsDaily - FREE_READS_DAILY);
    const billableWritesDaily = Math.max(0, totalWritesDaily - FREE_WRITES_DAILY);

    const costReads = (billableReadsDaily * daysInMonth / 100000) * COST_PER_100K_READS;
    const costWrites = (billableWritesDaily * daysInMonth / 100000) * COST_PER_100K_WRITES;

    const totalMonthlyCost = costReads + costWrites;

    return {
      projectedPilots: pilots,
      totalUsers,
      totalReadsDaily,
      totalWritesDaily,
      monthlyReads,
      costReads: parseFloat(costReads.toFixed(2)),
      costWrites: parseFloat(costWrites.toFixed(2)),
      totalMonthlyCost: parseFloat(totalMonthlyCost.toFixed(2)),
      isFreeTier: totalMonthlyCost === 0,
      readsUtilization: (totalReadsDaily / FREE_READS_DAILY) * 100,
      writesUtilization: (totalWritesDaily / FREE_WRITES_DAILY) * 100,
    };
  }, [numPilots, numAdmin, dailySessionsPerUser, growthFactor]);

  // --- Visualization Data ---
  const utilizationData = [
    { 
        name: 'Daily Reads', 
        current: stats.totalReadsDaily, 
        limit: FREE_READS_DAILY,
        percent: Math.min(100, stats.readsUtilization),
        color: stats.readsUtilization > 100 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
    },
    { 
        name: 'Daily Writes', 
        current: stats.totalWritesDaily, 
        limit: FREE_WRITES_DAILY,
        percent: Math.min(100, stats.writesUtilization),
        color: stats.writesUtilization > 100 ? 'hsl(var(--destructive))' : 'hsl(var(--primary))'
    },
  ];

  const costBreakdown = [
    { name: 'Reads', value: stats.costReads, fill: 'hsl(var(--chart-1))' },
    { name: 'Writes', value: stats.costWrites, fill: 'hsl(var(--chart-2))' },
  ].filter(d => d.value > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr] p-6 bg-background rounded-b-xl border-t-0">
      
      {/* Controls Section */}
      <div className="space-y-8 pr-4 border-r border-slate-100">
        <div className="space-y-2">
            <h3 className="text-lg font-bold flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Parameters
            </h3>
            <p className="text-xs text-muted-foreground">Adjust these values to model your growth.</p>
        </div>

        <div className="space-y-6">
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> Pilots
                    </Label>
                    <span className="text-sm font-bold bg-muted px-2 py-0.5 rounded">{numPilots[0]}</span>
                </div>
                <Slider 
                    value={numPilots} 
                    onValueChange={setNumPilots} 
                    max={500} 
                    step={5} 
                    className="cursor-pointer"
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <Plane className="h-3.5 w-3.5" /> Fleet Size
                    </Label>
                    <span className="text-sm font-bold bg-muted px-2 py-0.5 rounded">{numAircraft[0]} Aircraft</span>
                </div>
                <Slider 
                    value={numAircraft} 
                    onValueChange={setNumAircraft} 
                    max={100} 
                    step={1} 
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <MousePointer2 className="h-3.5 w-3.5" /> Activity Level
                    </Label>
                    <span className="text-sm font-bold bg-muted px-2 py-0.5 rounded">{dailySessionsPerUser[0]} Sessions/Day</span>
                </div>
                <Slider 
                    value={dailySessionsPerUser} 
                    onValueChange={setDailySessionsPerUser} 
                    max={10} 
                    step={1} 
                />
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5" /> Market Growth
                    </Label>
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">+{growthFactor[0]}% Pilots</span>
                </div>
                <Slider 
                    value={growthFactor} 
                    onValueChange={setGrowthFactor} 
                    max={500} 
                    step={10} 
                />
            </div>
        </div>

        <div className="p-4 bg-muted/30 rounded-lg border border-slate-200/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                <Info className="h-3.5 w-3.5" />
                Pricing Context
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
Estimates based on the previous cloud pricing model. Standard document-store behavior
                retrieving full fleet/personnel data on load is accounted for.
            </p>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-none border-2 border-primary/20 bg-primary/[0.02]">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase text-primary tracking-widest">
                        Estimated Monthly Cost
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-black tracking-tight flex items-baseline gap-1">
                        ${stats.totalMonthlyCost}
                        <span className="text-sm font-normal text-muted-foreground tracking-normal">/mo</span>
                    </div>
                    {stats.isFreeTier && (
                        <Badge variant="secondary" className="mt-2 bg-green-500/10 text-green-700 hover:bg-green-500/10 border-green-500/20">
                            Entirely within Free Tier
                        </Badge>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-none border bg-muted/5">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-black uppercase text-muted-foreground tracking-widest">
                        Projected Scale
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.projectedPilots} Pilots</div>
                    <div className="text-xs text-muted-foreground mt-1">
                        Generating {stats.monthlyReads.toLocaleString()} reads monthly
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Limits Card */}
            <Card className="shadow-none border">
                <CardHeader>
                    <CardTitle className="text-sm font-bold">Daily Free Tier Utilization</CardTitle>
                    <CardDescription className="text-xs">Limits reset every 24 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {utilizationData.map((usage) => (
                        <div key={usage.name} className="space-y-2">
                            <div className="flex justify-between text-xs font-bold">
                                <span>{usage.name}</span>
                                <span className={cn(usage.percent >= 100 ? "text-destructive" : "text-muted-foreground")}>
                                    {usage.current.toLocaleString()} / {usage.limit.toLocaleString()}
                                </span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div 
                                    className="h-full transition-all duration-500"
                                    style={{ 
                                        width: `${usage.percent}%`, 
                                        backgroundColor: usage.color 
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Cost Distribution */}
            <Card className="shadow-none border">
                <CardHeader>
                    <CardTitle className="text-sm font-bold">Cost Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[180px] p-0">
                    {costBreakdown.length > 0 ? (
                        <ChartContainer config={{ 
                            Reads: { label: 'Reads', color: 'hsl(var(--chart-1))' },
                            Writes: { label: 'Writes', color: 'hsl(var(--chart-2))' }
                        }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={costBreakdown}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={65}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {costBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                            </PieChart>
                        </ResponsiveContainer>
                        </ChartContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-xs text-muted-foreground italic">
                            No billing generated.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* Warning/Insight */}
        {stats.totalMonthlyCost > 50 && (
            <div className="flex gap-3 p-4 border border-destructive/20 bg-destructive/[0.02] rounded-lg">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                <div className="space-y-1">
                    <p className="text-xs font-bold text-destructive italic underline">Optimization Insight</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                        At this scale, you should consider implementing local caching (TanStack Query) or 
                        indexing strategies to reduce doc reads which occur on every page navigation.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
