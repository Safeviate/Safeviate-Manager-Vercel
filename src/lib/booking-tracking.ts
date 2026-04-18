import type { Booking } from '@/types/booking';

const TRACKABLE_STATUSES = new Set<Booking['status']>([
  'Tentative',
  'Confirmed',
  'Approved',
]);

const BLOCKED_STATUSES = new Set<Booking['status']>([
  'Completed',
  'Cancelled',
  'Cancelled with Reason',
]);

const getBookingStartTime = (booking: Booking) => new Date(booking.start).getTime();

export const isTrackableBookingStatus = (booking: Booking) =>
  TRACKABLE_STATUSES.has(booking.status);

export const hasEarlierBlockingBooking = (bookings: Booking[], booking: Booking) => {
  const bookingStart = getBookingStartTime(booking);

  if (!Number.isFinite(bookingStart)) return false;

  return bookings.some((otherBooking) => {
    if (otherBooking.id === booking.id) return false;
    if (otherBooking.aircraftId !== booking.aircraftId) return false;
    if (getBookingStartTime(otherBooking) > bookingStart) return false;
    return !BLOCKED_STATUSES.has(otherBooking.status);
  });
};

export const isBookingEligibleForTracking = (bookings: Booking[], booking: Booking) =>
  isTrackableBookingStatus(booking) && !hasEarlierBlockingBooking(bookings, booking);

export const getBlockingBookingForTracking = (bookings: Booking[], booking: Booking) => {
  const bookingStart = getBookingStartTime(booking);

  if (!Number.isFinite(bookingStart)) return null;

  return bookings
    .filter((otherBooking) => otherBooking.id !== booking.id)
    .filter((otherBooking) => otherBooking.aircraftId === booking.aircraftId)
    .filter((otherBooking) => getBookingStartTime(otherBooking) <= bookingStart)
    .filter((otherBooking) => !BLOCKED_STATUSES.has(otherBooking.status))
    .sort((a, b) => getBookingStartTime(b) - getBookingStartTime(a))[0] || null;
};

export const getTrackableBookings = (bookings: Booking[], aircraftId?: string) =>
  bookings
    .filter((booking) => !aircraftId || booking.aircraftId === aircraftId)
    .filter((booking) => isBookingEligibleForTracking(bookings, booking))
    .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
