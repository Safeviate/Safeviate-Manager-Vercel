'use client';

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import type { SafetyReport } from '@/types/safety-report';

const reportDate = (report: SafetyReport) => new Date(`${(report.submittedAt || report.eventDate).slice(0, 10)}T12:00:00`);

export function SafetyReportingInsights({ reports }: { reports: SafetyReport[] }) {
  const trend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const label = date.toLocaleString('en-ZA', { month: 'short' });
      const monthReports = reports.filter((report) => { const reportAt = reportDate(report); return reportAt.getFullYear() === date.getFullYear() && reportAt.getMonth() === date.getMonth(); });
      return { label, reports: monthReports.length, incidents: monthReports.filter((report) => report.reportType === 'Incident').length, hazards: monthReports.filter((report) => report.reportType === 'Hazard').length };
    });
  }, [reports]);
  const byClassification = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach((report) => { const key = report.eventClassification || report.occurrenceCategory || 'Unclassified'; counts.set(key, (counts.get(key) || 0) + 1); });
    return [...counts.entries()].map(([classification, value]) => ({ classification, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [reports]);
  const ageing = useMemo(() => {
    const now = Date.now(); const buckets = [{ label: '0–7 days', value: 0 }, { label: '8–30 days', value: 0 }, { label: '31–60 days', value: 0 }, { label: '60+ days', value: 0 }];
    reports.filter((report) => report.status !== 'Closed').forEach((report) => { const age = Math.max(0, Math.floor((now - reportDate(report).getTime()) / 86_400_000)); if (age <= 7) buckets[0].value += 1; else if (age <= 30) buckets[1].value += 1; else if (age <= 60) buckets[2].value += 1; else buckets[3].value += 1; });
    return buckets;
  }, [reports]);
  return <div className="grid gap-4 xl:grid-cols-2"><Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Reports over time</h2><p className="text-xs text-muted-foreground">Six-month reporting trend, including incidents and hazards.</p></div><div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={trend}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="reports" fill="#2563eb" radius={[4, 4, 0, 0]} /><Bar dataKey="incidents" fill="#dc2626" radius={[4, 4, 0, 0]} /><Bar dataKey="hazards" fill="#d97706" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card><Card className="border shadow-none"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Report classification</h2><p className="text-xs text-muted-foreground">Current report distribution by classification or occurrence category.</p></div><div className="h-[240px]">{byClassification.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byClassification} layout="vertical"><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="classification" width={140} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No report classifications recorded.</div>}</div></CardContent></Card><Card className="border shadow-none xl:col-span-2"><CardContent className="p-4"><div className="mb-4"><h2 className="text-sm font-bold">Open report ageing</h2><p className="text-xs text-muted-foreground">Time since submission for reports that have not been closed.</p></div><div className="h-[200px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={ageing}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#d97706" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></CardContent></Card></div>;
}
