'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Download, Loader2, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type OfflineCacheButtonProps = {
  urls: string[];
  className?: string;
  uncachedLabel?: string;
  cachedLabel?: string;
};

const resolveAbsoluteUrl = (value: string) => {
  if (typeof window === 'undefined') return value;
  return new URL(value, window.location.origin).toString();
};

export function OfflineCacheButton({
  urls,
  className,
  uncachedLabel = 'Make Available Offline',
  cachedLabel = 'Available Offline',
}: OfflineCacheButtonProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);
  const [isCaching, setIsCaching] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const resolvedUrls = useMemo(
    () => [...new Set(urls.map((url) => url.trim()).filter(Boolean).map(resolveAbsoluteUrl))],
    [urls]
  );

  const checkCachedState = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window) || resolvedUrls.length === 0) {
      setIsCached(false);
      setIsChecking(false);
      return;
    }

    setIsChecking(true);
    try {
      const matches = await Promise.all(
        resolvedUrls.map(async (url) => {
          const cached = await window.caches.match(url);
          return Boolean(cached);
        })
      );
      setIsCached(matches.every(Boolean));
    } catch (error) {
      console.warn('[offline-cache] failed to inspect cache state', error);
      setIsCached(false);
    } finally {
      setIsChecking(false);
    }
  }, [resolvedUrls]);

  useEffect(() => {
    void checkCachedState();
  }, [checkCachedState]);

  const handleCache = async () => {
    if (typeof window === 'undefined') return;

    if (!window.navigator.onLine) {
      toast({
        variant: 'destructive',
        title: 'Reconnect To Save Offline',
        description: 'Go online once so Safeviate can download this page and its supporting data to this device.',
      });
      return;
    }

    if (resolvedUrls.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Nothing To Cache',
        description: 'No supported offline targets were found for this screen.',
      });
      return;
    }

    setIsCaching(true);
    try {
      for (const url of resolvedUrls) {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
          cache: 'reload',
          headers: url.includes('/api/') ? { Accept: 'application/json' } : { Accept: 'text/html' },
        });

        if (!response.ok) {
          throw new Error(`Failed to cache ${url}`);
        }
      }

      await checkCachedState();
      toast({
        title: 'Available Offline',
        description: 'This Safeviate screen and its supported data were saved on this device for offline use.',
      });
    } catch (error) {
      console.error('[offline-cache] failed to warm offline cache', error);
      toast({
        variant: 'destructive',
        title: 'Offline Save Failed',
        description: 'Safeviate could not save this screen for offline use. Reconnect and try again.',
      });
    } finally {
      setIsCaching(false);
    }
  };

  const buttonLabel = isCached ? cachedLabel : uncachedLabel;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => void handleCache()}
      disabled={isCaching || isChecking}
      className={cn(className)}
    >
      {isCaching ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isCached ? (
        <Check className="h-3.5 w-3.5" />
      ) : !isChecking && typeof navigator !== 'undefined' && !navigator.onLine ? (
        <WifiOff className="h-3.5 w-3.5" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {isChecking ? 'Checking Offline Status' : buttonLabel}
    </Button>
  );
}

export default OfflineCacheButton;
