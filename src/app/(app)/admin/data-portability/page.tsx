'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
    Download, 
    Upload, 
    Database, 
    AlertTriangle, 
    CheckCircle2, 
    FileJson, 
    HardDrive, 
    Trash2, 
    RefreshCw,
    ShieldCheck,
    Archive,
    History
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatBytes } from '@/lib/utils'; // Assuming this exists or I'll implement locally

export default function DataPortabilityPage() {
  const { toast } = useToast();
  const [stats, setStats] = useState<{ key: string; size: number; count: number }[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const calculateStats = () => {
    const newStats: { key: string; size: number; count: number }[] = [];
    let total = 0;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('safeviate')) {
            const value = localStorage.getItem(key) || '';
            const size = new Blob([value]).size;
            total += size;

            let count = 0;
            try {
                const parsed = JSON.parse(value);
                count = Array.isArray(parsed) ? parsed.length : (typeof parsed === 'object' ? Object.keys(parsed).length : 1);
            } catch {
                count = 1;
            }

            newStats.push({ key, size, count });
        }
    }
    setStats(newStats.sort((a, b) => b.size - a.size));
    setTotalSize(total);
  };

  useEffect(() => {
    calculateStats();
    window.addEventListener('storage', calculateStats);
    return () => window.removeEventListener('storage', calculateStats);
  }, []);

  const handleExport = () => {
    setIsExporting(true);
    try {
        const backup: Record<string, any> = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('safeviate')) {
                backup[key] = JSON.parse(localStorage.getItem(key) || 'null');
            }
        }

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safeviate-system-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({ title: 'System Backup Generated', description: 'Logical schematic exported to local filesystem.' });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Export Failure', description: 'System fault during backup synthesis.' });
    } finally {
        setIsExporting(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            Object.entries(data).forEach(([key, value]) => {
                if (key.startsWith('safeviate')) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
            });
            calculateStats();
            toast({ title: 'System Restored', description: 'Local registry synchronized with imported schematic.' });
            // Optional: Reload to ensure all components pick up new state
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            toast({ variant: 'destructive', title: 'Restoration Fault', description: 'Provided schematic is corrupted or invalid.' });
        } finally {
            setIsImporting(false);
        }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
      if (confirm('CRITICAL: This will purge all local data. Proceed?')) {
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key?.startsWith('safeviate')) {
                  localStorage.removeItem(key!);
                  i--; // Adjust index since we removed an item
              }
          }
          calculateStats();
          toast({ title: 'Registry Purged', description: 'All local system state removed.' });
          window.location.reload();
      }
  };

  return (
    <div className="p-8 space-y-12">
      <div className="flex items-center justify-between">
          <div className="space-y-4 text-left">
              <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/5 px-4 h-7 tracking-widest">
                  <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                  System Integrity & Portability
              </Badge>
              <div>
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">Safeviate Core Ledger</h1>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-2 opacity-70">
                      Manage local-first system state, execute backups, and perform schematic restoration.
                  </p>
              </div>
          </div>
          <div className="flex gap-4">
              <Button variant="outline" size="icon" onClick={calculateStats} className="h-14 w-14 rounded-2xl border-2">
                  <RefreshCw className="h-6 w-6" />
              </Button>
              <Button variant="destructive" size="icon" onClick={handleClear} className="h-14 w-14 rounded-2xl border-2 hover:bg-red-600">
                  <Trash2 className="h-6 w-6" />
              </Button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <Card className="lg:col-span-1 rounded-[2.5rem] border-0 shadow-2xl bg-background overflow-hidden flex flex-col">
            <CardHeader className="p-10 pb-4 bg-muted/5 border-b relative overflow-hidden">
                <div className="absolute right-0 top-0 p-8 opacity-5">
                    <HardDrive className="h-24 w-24" />
                </div>
                <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3 relative z-10">
                    <Database className="h-5 w-5 text-primary" />
                    Storage Analytics
                </CardTitle>
            </CardHeader>
            <CardContent className="p-10 space-y-8 flex-1">
                <div className="space-y-6">
                    <div className="flex items-end justify-between">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Total Payload</p>
                            <h2 className="text-5xl font-black font-mono tracking-tighter">{(totalSize / 1024).toFixed(1)}<span className="text-xl ml-1 opacity-40">KB</span></h2>
                        </div>
                        <Badge variant="outline" className="h-8 rounded-full border-2 font-black uppercase tracking-widest text-[9px] px-4">
                            {((totalSize / (5 * 1024 * 1024)) * 100).toFixed(1)}% Capacity
                        </Badge>
                    </div>
                    <Progress value={(totalSize / (5 * 1024 * 1024)) * 100} className="h-4 rounded-full bg-muted/10 border-2" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed">
                        Browser local storage is limited to approx. 5MB. Your current schema utilizes a fraction of this allocation.
                    </p>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Infrastructure Note
                    </h4>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase leading-relaxed">
                        Safeviate operates as a local-first application. No private data is transmitted to centralized cloud storage without explicit synchronization commands.
                    </p>
                </div>
            </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-[2.5rem] border-0 shadow-2xl bg-background overflow-hidden">
            <CardHeader className="p-10 pb-4 bg-muted/5 border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
                        <History className="h-5 w-5 text-primary" />
                        Vector Matrix
                    </CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] mt-1 opacity-50">Local Registry Modules</CardDescription>
                </div>
                <div className="flex gap-4">
                    <Button onClick={handleExport} disabled={isExporting} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg px-6">
                        <Download className="h-4 w-4" /> Export Schematic
                    </Button>
                    <div className="relative">
                        <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        <Button variant="outline" disabled={isImporting} className="h-12 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 border-2 px-6">
                            <Upload className="h-4 w-4" /> Restore Logistic
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <ScrollArea className="h-[500px]">
                <div className="p-10 space-y-4">
                    {stats.map((stat) => (
                        <div key={stat.key} className="flex items-center justify-between p-6 rounded-3xl border-2 bg-muted/5 hover:bg-muted/10 hover:border-primary/30 transition-all group">
                            <div className="flex items-center gap-6">
                                <div className="h-14 w-14 rounded-2xl bg-background border-2 shadow-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                    <FileJson className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-black uppercase tracking-tight text-base text-slate-800">{stat.key.replace('safeviate.', '').replace('-', ' ')}</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <Badge variant="outline" className="text-[9px] font-black border-2 px-2 h-5 rounded-md uppercase tracking-widest opacity-60">{(stat.size / 1024).toFixed(1)} KB</Badge>
                                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-30">{stat.count} Records</span>
                                    </div>
                                </div>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-green-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                    {stats.length === 0 && (
                        <div className="py-20 text-center opacity-30">
                            <Archive className="h-16 w-16 mx-auto mb-6" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Registry Zero. All Modules Offline.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
