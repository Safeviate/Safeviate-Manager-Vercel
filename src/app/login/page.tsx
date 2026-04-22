import { Suspense } from 'react';
import LoginClient from './login-client';

function LoginFallback() {
  return (
    <div className="relative flex min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.20),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.18),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.96),rgba(15,23,42,0.92))]" />
      <div className="relative z-10 grid flex-1 grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden lg:flex flex-col justify-between p-12 xl:p-16">
          <div className="max-w-xl space-y-6">
            <div className="h-9 w-52 rounded-full bg-white/10" />
            <div className="space-y-4">
              <div className="h-16 w-full rounded-2xl bg-white/10" />
              <div className="h-16 w-5/6 rounded-2xl bg-white/10" />
            </div>
          </div>
          <div className="grid max-w-2xl grid-cols-3 gap-4">
            <div className="h-24 rounded-2xl bg-white/10" />
            <div className="h-24 rounded-2xl bg-white/10" />
            <div className="h-24 rounded-2xl bg-white/10" />
          </div>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <div className="h-[34rem] w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/70 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl" />
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
