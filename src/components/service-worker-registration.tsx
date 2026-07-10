'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Wifi, WifiOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

type ServiceWorkerStatusSnapshot = {
  isOnline: boolean;
  isPwaReady: boolean;
  updateReady: boolean;
};

const serviceWorkerStatusListeners = new Set<() => void>();
let serviceWorkerStatusSnapshot: ServiceWorkerStatusSnapshot = {
  isOnline: true,
  isPwaReady: false,
  updateReady: false,
};
let waitingServiceWorkerRef: ServiceWorker | null = null;

const emitServiceWorkerStatus = (next: Partial<ServiceWorkerStatusSnapshot>) => {
  serviceWorkerStatusSnapshot = { ...serviceWorkerStatusSnapshot, ...next };
  serviceWorkerStatusListeners.forEach((listener) => listener());
};

export const requestServiceWorkerUpdate = () => {
  waitingServiceWorkerRef?.postMessage({ type: 'SKIP_WAITING' });
};

const subscribeToServiceWorkerStatus = (listener: () => void) => {
  serviceWorkerStatusListeners.add(listener);
  return () => {
    serviceWorkerStatusListeners.delete(listener);
  };
};

export function useServiceWorkerStatus() {
  return useSyncExternalStore(
    subscribeToServiceWorkerStatus,
    () => serviceWorkerStatusSnapshot,
    () => serviceWorkerStatusSnapshot
  );
}

export function ServiceWorkerRegistration() {
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(true);
  const [isPwaReady, setIsPwaReady] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);
  const hasShownUpdateToastRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(window.navigator.onLine);
    emitServiceWorkerStatus({ isOnline: window.navigator.onLine });

    const handleOnline = () => {
      setIsOnline(true);
      emitServiceWorkerStatus({ isOnline: true });
      toast({
        title: 'Connection restored',
        description: 'Safeviate is back online and syncing live data again.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      emitServiceWorkerStatus({ isOnline: false });
      toast({
        title: 'Offline mode',
        description: 'You are offline. Cached Safeviate content remains available on this device.',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const unregisterDevelopmentWorkers = async () => {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const cacheKeys = await window.caches.keys();
        await Promise.all(
          cacheKeys
            .filter((key) => key.startsWith('safeviate-'))
            .map((key) => window.caches.delete(key))
        );
      }
    };

    if (process.env.NODE_ENV !== 'production') {
      void unregisterDevelopmentWorkers().catch((error) => {
        console.warn('[service-worker] development cleanup failed', error);
      });
      emitServiceWorkerStatus({ isPwaReady: false, updateReady: false });
      return;
    }

    let controllerRefreshHandled = false;

    const markUpdateReady = (worker: ServiceWorker | null) => {
      if (!worker) return;
      waitingWorkerRef.current = worker;
      waitingServiceWorkerRef = worker;
      setUpdateReady(true);
      emitServiceWorkerStatus({ updateReady: true });

      if (!hasShownUpdateToastRef.current) {
        hasShownUpdateToastRef.current = true;
        toast({
          title: 'Update ready',
          description: 'A new Safeviate version has been downloaded and is ready to install.',
        });
      }
    };

    const registerServiceWorker = async () => {
      const registration = await navigator.serviceWorker.register('/sw.js');
      setIsPwaReady(true);
      emitServiceWorkerStatus({ isPwaReady: true });

      if (registration.waiting) {
        markUpdateReady(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) return;

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
            markUpdateReady(installingWorker);
          }
        });
      });
    };

    const handleControllerChange = () => {
      if (controllerRefreshHandled) return;
      controllerRefreshHandled = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    void registerServiceWorker().catch((error) => {
      console.warn('[service-worker] registration failed', error);
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, [toast]);

  const applyUpdate = () => {
    waitingWorkerRef.current?.postMessage({ type: 'SKIP_WAITING' });
  };

  return null;
}

export function ServiceWorkerStatusPanel() {
  const { isOnline, isPwaReady, updateReady } = useServiceWorkerStatus();
  const applyUpdate = () => requestServiceWorkerUpdate();

  const showStatusShell = updateReady || !isOnline || isPwaReady;
  if (!showStatusShell) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-sidebar-border/50 bg-[hsl(var(--sidebar-button-background)/0.6)] p-2 text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="outline"
          className={isOnline ? 'h-5 border-emerald-300 px-2 text-[9px] font-black uppercase text-emerald-700' : 'h-5 border-amber-300 px-2 text-[9px] font-black uppercase text-amber-700'}
        >
          {isOnline ? <Wifi className="mr-1 h-2.5 w-2.5" /> : <WifiOff className="mr-1 h-2.5 w-2.5" />}
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
        {isPwaReady ? (
          <Badge variant="outline" className="h-5 border-slate-300 px-2 text-[9px] font-black uppercase text-slate-700">
            PWA Ready
          </Badge>
        ) : null}
        {updateReady ? (
          <Badge variant="outline" className="h-5 border-blue-300 px-2 text-[9px] font-black uppercase text-blue-700">
            Update Ready
          </Badge>
        ) : null}
      </div>

      <p className="text-[10px] leading-snug text-sidebar-foreground/80">
        {updateReady
          ? 'A new Safeviate build is ready on this device.'
          : isOnline
            ? 'Offline cache is active for supported Safeviate screens while your last signed-in session stays active on this device.'
            : 'You are viewing Safeviate in offline mode from the local cache. If you sign out, a live connection is required before offline access will work again.'}
      </p>

      {updateReady ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" className="h-6 gap-1.5 px-2 text-[9px] font-black uppercase tracking-[0.06em]" onClick={applyUpdate}>
            <Download className="h-3 w-3" />
            Update App
          </Button>
        </div>
      ) : null}
    </div>
  );
}
