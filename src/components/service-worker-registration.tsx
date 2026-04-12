'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
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

    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[service-worker] registration failed', error);
    });
  }, []);

  return null;
}
