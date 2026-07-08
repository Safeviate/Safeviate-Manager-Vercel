'use client';

import { useEffect, useRef, useState } from 'react';
import { Wifi, WifiOff, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

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

    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Connection restored',
        description: 'Safeviate is back online and syncing live data again.',
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
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
      return;
    }

    let controllerRefreshHandled = false;

    const markUpdateReady = (worker: ServiceWorker | null) => {
      if (!worker) return;
      waitingWorkerRef.current = worker;
      setUpdateReady(true);

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

  const showStatusShell = updateReady || !isOnline || isPwaReady;
  if (!showStatusShell) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[120] flex max-w-[280px] flex-col gap-2">
      <div className="pointer-events-auto rounded-lg border border-card-border bg-background/95 p-3 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={isOnline ? 'border-emerald-300 text-emerald-700' : 'border-amber-300 text-amber-700'}
          >
            {isOnline ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
          {isPwaReady ? (
            <Badge variant="outline" className="border-slate-300 text-slate-700">
              PWA Ready
            </Badge>
          ) : null}
          {updateReady ? (
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              Update Ready
            </Badge>
          ) : null}
        </div>

        <p className="mt-2 text-xs text-muted-foreground">
          {updateReady
            ? 'A new Safeviate build is ready on this device.'
            : isOnline
              ? 'Offline cache is active for supported Safeviate screens while your last signed-in session stays active on this device.'
              : 'You are viewing Safeviate in offline mode from the local cache. If you sign out, a live connection is required before offline access will work again.'}
        </p>

        {updateReady ? (
          <div className="mt-3 flex justify-end">
            <Button type="button" size="sm" className="h-8 gap-2" onClick={applyUpdate}>
              <Download className="h-3.5 w-3.5" />
              Update App
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
