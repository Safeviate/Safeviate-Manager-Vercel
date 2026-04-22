import { Suspense } from 'react';
import { ShieldCheck } from 'lucide-react';
import BetaNdaClient from './beta-nda-client';

function BetaNdaFallback() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100 backdrop-blur">
          <ShieldCheck className="h-4 w-4" />
          Beta NDA
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="min-h-[28rem] rounded-3xl border border-white/15 bg-slate-900/75 backdrop-blur-xl" />
          <div className="min-h-[28rem] rounded-3xl border border-white/15 bg-slate-900/75 backdrop-blur-xl" />
        </div>
      </div>
    </div>
  );
}

export default function BetaNdaPage() {
  return (
    <Suspense fallback={<BetaNdaFallback />}>
      <BetaNdaClient />
    </Suspense>
  );
}
