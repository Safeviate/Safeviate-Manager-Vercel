import type { FlightSession } from '@/types/flight-session';

const STALE_MINUTES = 2;

export function isFlightSessionStale(session: FlightSession, now = Date.now()) {
  if (!session.updatedAt) return true;

  const updatedAtMs = new Date(session.updatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) return true;

  return now - updatedAtMs > STALE_MINUTES * 60 * 1000;
}

export function getFlightSessionFreshnessLabel(session: FlightSession, now = Date.now()) {
  if (!session.updatedAt) return 'No updates';

  const updatedAtMs = new Date(session.updatedAt).getTime();
  if (Number.isNaN(updatedAtMs)) return 'Unknown';

  const diffSeconds = Math.max(0, Math.round((now - updatedAtMs) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  return `${diffMinutes}m ago`;
}
