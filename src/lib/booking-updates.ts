export const BOOKING_UPDATES_STORAGE_KEY = 'safeviate-bookings-updated';

export const broadcastBookingUpdate = () => {
  if (typeof window === 'undefined') return;

  const stamp = new Date().toISOString();
  window.localStorage.setItem(BOOKING_UPDATES_STORAGE_KEY, stamp);
  window.dispatchEvent(new Event('safeviate-bookings-updated'));
};
