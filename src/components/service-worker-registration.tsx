'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const shouldRegister = process.env.NODE_ENV === 'production' || isLocalhost;
    if (!shouldRegister) return;

    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('[service-worker] registration failed', error);
    });
  }, []);

  return null;
}
