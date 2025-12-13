
'use client';

import {
  Firestore,
  doc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  DocumentReference,
} from 'firebase/firestore';
import type { Booking } from '@/types/booking';

/**
 * Gets the next sequential number for a given booking type in a thread-safe manner.
 *
 * @param firestore The Firestore instance.
 * @param tenantId The ID of the tenant.
 * @param bookingType The type of the booking to generate a number for.
 * @returns A promise that resolves with the next sequential number.
 */
export async function getNextBookingNumber(
  firestore: Firestore,
  tenantId: string,
  bookingType: 'Student Training' | 'Hire and Fly' | 'Maintenance Flight'
): Promise<number> {
  // Create a unique counter name for each booking type, e.g., 'bookings-student-training'
  const counterName = `bookings-${bookingType.toLowerCase().replace(/\s+/g, '-')}`;
  const counterRef = doc(firestore, 'tenants', tenantId, 'counters', counterName);

  try {
    const newNumber = await runTransaction(firestore, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);

      if (!counterDoc.exists()) {
        // If the counter document doesn't exist, create it and return 1.
        transaction.set(counterRef, { currentNumber: 1, createdAt: serverTimestamp() });
        return 1;
      }

      const currentNumber = counterDoc.data().currentNumber || 0;
      const nextNumber = currentNumber + 1;
      transaction.update(counterRef, { currentNumber: nextNumber });
      return nextNumber;
    });
    return newNumber;
  } catch (error) {
    console.error(`Error getting next ${counterName} number:`, error);
    // In case of an error, re-throw it to be handled by the caller.
    throw new Error(`Could not generate a new booking number for ${bookingType}.`);
  }
}


/**
 * Deletes one or more booking documents and decrements the counter for the specified booking type.
 * @param firestore The Firestore instance.
 * @param tenantId The ID of the tenant.
 * @param bookingDocRefs An array of DocumentReferences for the bookings to be deleted.
 * @param bookingType The type of the booking being deleted.
 */
export async function deleteBookings(
    firestore: Firestore,
    tenantId: string,
    bookingDocRefs: DocumentReference[],
    bookingType: 'Student Training' | 'Hire and Fly' | 'Maintenance Flight'
): Promise<void> {

    const counterName = `bookings-${bookingType.toLowerCase().replace(/\s+/g, '-')}`;
    const counterRef = doc(firestore, 'tenants', tenantId, 'counters', counterName);

    try {
        await runTransaction(firestore, async (transaction) => {
            // Get the counter and check if it exists
            const counterDoc = await transaction.get(counterRef);
            if (counterDoc.exists()) {
                const currentNumber = counterDoc.data().currentNumber || 0;
                // Decrement the counter for each document being deleted, but not below 0
                const nextNumber = Math.max(0, currentNumber - bookingDocRefs.length);
                transaction.update(counterRef, { currentNumber: nextNumber });
            }

            // Delete each booking document
            bookingDocRefs.forEach(docRef => {
                transaction.delete(docRef);
            });
        });
    } catch (error) {
        console.error(`Error deleting booking(s) and decrementing counter '${counterName}':`, error);
        throw new Error('Could not delete the booking(s).');
    }
}
