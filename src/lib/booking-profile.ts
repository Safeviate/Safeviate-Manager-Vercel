import type { Booking, BookingOperationProfile } from '@/types/booking';

const COMMERCIAL_BOOKING_TYPES = new Set(['Rental', 'Charter', 'Ferry Flight']);

export function getBookingOperationProfile(booking: Pick<Booking, 'type' | 'operationProfile'>): BookingOperationProfile {
    if (booking.operationProfile) return booking.operationProfile;
    if (booking.type === 'Maintenance') return 'maintenance';
    if (COMMERCIAL_BOOKING_TYPES.has(booking.type)) return 'commercial';
    return 'training';
}

export function isCommercialBooking(booking: Pick<Booking, 'type' | 'operationProfile'>) {
    return getBookingOperationProfile(booking) === 'commercial';
}

export function isTrainingBooking(booking: Pick<Booking, 'type' | 'operationProfile'>) {
    return getBookingOperationProfile(booking) === 'training';
}
