const BOOKING_NUMBER_DIGITS = 5;

export const formatBookingSequenceNumber = (value: number) =>
  String(Math.max(1, Math.floor(value))).padStart(BOOKING_NUMBER_DIGITS, '0');
