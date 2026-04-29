'use client';

import Link from 'next/link';
import { use, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Aircraft } from '@/types/aircraft';
import type { Booking, NavlogLeg } from '@/types/booking';
import { DEFAULT_FLIGHT_PARAMS, calculateRouteTotals, recalculateNavlogLegs, type FlightParams } from '@/lib/flight-planner';
import { formatCoordinateDms, formatLatLonDms } from '@/lib/coordinate-parser';

interface PrintBookingPageProps {
  params: Promise<{ id: string }>;
}

type BookingPerson = { id: string; firstName: string; lastName: string };

const formatHeadingDegrees = (value?: number) =>
  value === undefined || Number.isNaN(value) ? '---' : Math.round(value).toString().padStart(3, '0');
const getReciprocalHeading = (value?: number) =>
  value === undefined || Number.isNaN(value) ? undefined : (value + 180) % 360;
const formatMinutes = (minutes?: number) => {
  if (!minutes || !isFinite(minutes) || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins} min`;
};

function resolvePersonLabel(people: BookingPerson[], id?: string) {
  if (!id) return 'N/A';
  const person = people.find((entry) => entry.id === id);
  return person ? `${person.firstName} ${person.lastName}` : id;
}

function RouteSummaryRow({ leg, index }: { leg: NavlogLeg; index: number }) {
  const isOrigin = index === 0;
  const summaryLine = [leg.frequencies, leg.layerInfo].filter(Boolean).join(' | ');

  return (
    <tr className="border-b border-slate-200 align-top">
      <td className="px-3 py-2 text-[10px] font-black uppercase text-slate-900">{leg.waypoint || `WP-${index + 1}`}</td>
      <td className="px-3 py-2 text-[10px] font-medium text-slate-700">{formatLatLonDms(leg.latitude, leg.longitude)}</td>
      <td className="px-3 py-2 text-[10px] font-medium text-slate-700">{isOrigin ? '---' : `${leg.distance?.toFixed(1) || '0.0'} NM`}</td>
      <td className="px-3 py-2 text-[10px] font-medium text-slate-700">{isOrigin ? '---' : `${formatHeadingDegrees(getReciprocalHeading(leg.magneticHeading))}°`}</td>
      <td className="px-3 py-2 text-[10px] font-medium leading-4 text-slate-700">
        {summaryLine || leg.waypointContext?.items?.[0]?.label || 'Waypoint'}
      </td>
    </tr>
  );
}

export default function PrintBookingPage({ params }: PrintBookingPageProps) {
  const resolvedParams = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [people, setPeople] = useState<BookingPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const bookingRes = await fetch('/api/schedule-data', { cache: 'no-store' });
        if (!bookingRes.ok) throw new Error('Failed to load booking.');
        const bookingPayload = await bookingRes.json();
        const foundBooking = (bookingPayload.bookings || []).find((item: Booking) => item.id === resolvedParams.id) || null;

        if (!foundBooking) {
          throw new Error('Booking not found.');
        }

        const [aircraftRes, peopleRes] = await Promise.all([
          fetch(`/api/aircraft/${foundBooking.aircraftId}`, { cache: 'no-store' }),
          fetch('/api/users', { cache: 'no-store' }),
        ]);

        if (!aircraftRes.ok) throw new Error('Failed to load aircraft.');
        if (!peopleRes.ok) throw new Error('Failed to load personnel.');

        const aircraftPayload = await aircraftRes.json();
        const peoplePayload = await peopleRes.json();

        if (!cancelled) {
          setBooking(foundBooking);
          setAircraft(aircraftPayload?.aircraft || null);
          setPeople(peoplePayload.users || peoplePayload.personnel || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load flight pack.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [resolvedParams.id]);

  const instructorLabel = useMemo(
    () => resolvePersonLabel(people, booking?.instructorId),
    [people, booking?.instructorId]
  );
  const studentLabel = useMemo(
    () => resolvePersonLabel(people, booking?.studentId),
    [people, booking?.studentId]
  );

  const navlogLegs = booking?.navlog?.legs || [];
  const flightParams = useMemo<FlightParams>(() => ({
    tas: booking?.navlog?.globalTas ?? DEFAULT_FLIGHT_PARAMS.tas,
    windDirection: booking?.navlog?.globalWindDirection ?? DEFAULT_FLIGHT_PARAMS.windDirection,
    windSpeed: booking?.navlog?.globalWindSpeed ?? DEFAULT_FLIGHT_PARAMS.windSpeed,
    fuelBurnPerHour: booking?.navlog?.globalFuelBurn ?? DEFAULT_FLIGHT_PARAMS.fuelBurnPerHour,
    fuelOnBoard: booking?.navlog?.globalFuelOnBoard ?? DEFAULT_FLIGHT_PARAMS.fuelOnBoard,
  }), [
    booking?.navlog?.globalFuelBurn,
    booking?.navlog?.globalFuelOnBoard,
    booking?.navlog?.globalTas,
    booking?.navlog?.globalWindDirection,
    booking?.navlog?.globalWindSpeed,
  ]);
  const calculatedLegs = useMemo(() => recalculateNavlogLegs(navlogLegs, flightParams), [navlogLegs, flightParams]);
  const routeTotals = useMemo(() => calculateRouteTotals(calculatedLegs, flightParams), [calculatedLegs, flightParams]);

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">
        <div className="no-print flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error || 'Booking not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl bg-white px-4 py-6 text-slate-900 md:px-6">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Flight Pack</p>
          <h1 className="text-xl font-black uppercase tracking-tight">Print Flight</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/bookings/history/${booking.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Flight
            </Link>
          </Button>
          <Button type="button" onClick={() => window.print()} className="gap-2">
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-300 p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div className="space-y-1">
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Flight Summary</p>
              <h2 className="text-2xl font-black uppercase tracking-tight">{booking.bookingNumber}</h2>
              <p className="text-sm font-semibold uppercase text-slate-700">
                {aircraft?.tailNumber || booking.aircraftId} | {booking.type}
              </p>
            </div>
            <div className="grid gap-1 text-right text-[11px] font-medium text-slate-700">
              <span>Status: {booking.status}</span>
              <span>Date: {booking.date ? format(new Date(booking.date), 'PPP') : 'N/A'}</span>
              <span>Time: {booking.startTime || '---'} to {booking.endTime || '---'}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-3 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Crew</p>
                <p className="mt-1 text-sm font-semibold">Instructor: {instructorLabel}</p>
                <p className="text-sm font-semibold">Student: {studentLabel}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Aircraft</p>
                <p className="mt-1 text-sm font-semibold">{aircraft?.tailNumber || booking.aircraftId}</p>
                <p className="text-sm text-slate-700">{aircraft?.type || aircraft?.make || 'Aircraft profile not loaded'}</p>
              </div>
            </div>

            <div className="grid gap-3 rounded-xl border border-slate-200 p-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Departure</p>
                <p className="mt-1 text-sm font-semibold">{booking.navlog?.departureIcao || '---'}</p>
                <p className="text-sm text-slate-700">
                  {formatCoordinateDms(booking.navlog?.departureLatitude, 'lat')} {formatCoordinateDms(booking.navlog?.departureLongitude, 'lon')}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Arrival</p>
                <p className="mt-1 text-sm font-semibold">{booking.navlog?.arrivalIcao || '---'}</p>
                <p className="text-sm text-slate-700">
                  {formatCoordinateDms(booking.navlog?.arrivalLatitude, 'lat')} {formatCoordinateDms(booking.navlog?.arrivalLongitude, 'lon')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 p-5">
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Route Overview</p>
              <h2 className="text-lg font-black uppercase tracking-tight">Waypoints and Legs</h2>
            </div>
            <div className="text-right text-[11px] font-semibold text-slate-700">
              <p>{navlogLegs.length} waypoint(s)</p>
              <p>{routeTotals.distance.toFixed(1)} NM total</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-3 py-2">Waypoint</th>
                  <th className="px-3 py-2">Coordinates</th>
                  <th className="px-3 py-2">Dist</th>
                  <th className="px-3 py-2">Trk</th>
                  <th className="px-3 py-2">Info</th>
                </tr>
              </thead>
              <tbody>
                {navlogLegs.length > 0 ? (
                  navlogLegs.map((leg, index) => <RouteSummaryRow key={leg.id} leg={leg} index={index} />)
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                      No planned route saved for this booking yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-300 p-5">
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Navlog</p>
              <h2 className="text-lg font-black uppercase tracking-tight">Leg-by-Leg Planning</h2>
            </div>
            <div className="grid gap-1 text-right text-[11px] font-semibold text-slate-700">
              <span>TAS {flightParams.tas} KT</span>
              <span>Wind {flightParams.windDirection}/{flightParams.windSpeed}</span>
              <span>Fuel Burn {flightParams.fuelBurnPerHour}/hr</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr className="text-left text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                  <th className="px-3 py-2">To</th>
                  <th className="px-3 py-2">Dist</th>
                  <th className="px-3 py-2">TC</th>
                  <th className="px-3 py-2">MH</th>
                  <th className="px-3 py-2">GS</th>
                  <th className="px-3 py-2">ETE</th>
                  <th className="px-3 py-2">Fuel</th>
                  <th className="px-3 py-2">Alt</th>
                </tr>
              </thead>
              <tbody>
                {calculatedLegs.length > 0 ? (
                  calculatedLegs.map((leg, index) => (
                    <tr key={leg.id} className="border-b border-slate-200 text-[10px] text-slate-700">
                      <td className="px-3 py-2 font-black uppercase text-slate-900">{leg.waypoint || `WP-${index + 1}`}</td>
                      <td className="px-3 py-2">{index === 0 ? '---' : `${leg.distance?.toFixed(1) || '0.0'} NM`}</td>
                      <td className="px-3 py-2">{index === 0 ? '---' : `${formatHeadingDegrees(leg.trueCourse)}°`}</td>
                      <td className="px-3 py-2">{index === 0 ? '---' : `${formatHeadingDegrees(getReciprocalHeading(leg.magneticHeading))}°`}</td>
                      <td className="px-3 py-2">{index === 0 ? '---' : `${Math.round(leg.groundSpeed || 0)} KT`}</td>
                      <td className="px-3 py-2">{formatMinutes(leg.ete)}</td>
                      <td className="px-3 py-2">{index === 0 ? '---' : (leg.tripFuel?.toFixed(1) || '0.0')}</td>
                      <td className="px-3 py-2">{leg.altitude || '---'} ft</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">
                      No navlog legs available.
                    </td>
                  </tr>
                )}
              </tbody>
              {calculatedLegs.length > 0 ? (
                <tfoot className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.12em] text-slate-700">
                  <tr>
                    <td className="px-3 py-2">Totals</td>
                    <td className="px-3 py-2">{routeTotals.distance.toFixed(1)} NM</td>
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2" />
                    <td className="px-3 py-2">{Math.round(routeTotals.groundSpeed || 0)} KT</td>
                    <td className="px-3 py-2">{formatMinutes(routeTotals.ete)}</td>
                    <td className="px-3 py-2">{routeTotals.fuel.toFixed(1)}</td>
                    <td className="px-3 py-2" />
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
