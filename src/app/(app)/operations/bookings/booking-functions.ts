
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
 * Gets the next sequential number for a given counter in a thread-safe manner using a Firestore transaction.
 *
 * @param firestore The Firestore instance.
 * @param tenantId The ID of the tenant.
 * @param counterName The name of the counter to increment (e.g., 'bookings').
 * @returns A promise that resolves with the next sequential number.
 */
export async function getNextBookingNumber(
  firestore: Firestore,
  tenantId: string,
  counterName: string
): Promise<number> {
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
    throw new Error(`Could not generate a new ${counterName} number.`);
  }
}

/**
 * Deletes one or more booking documents within a single transaction.
 * @param firestore The Firestore instance.
 * @param bookingDocRefs An array of DocumentReferences for the bookings to be deleted.
 */
export async function deleteBookings(
    firestore: Firestore,
    bookingDocRefs: DocumentReference[]
): Promise<void> {

    try {
        const batch = writeBatch(firestore);

        bookingDocRefs.forEach(docRef => {
            batch.delete(docRef);
        });

        await batch.commit();

    } catch (error) {
        console.error('Error deleting booking(s):', error);
        throw new Error('Could not delete the booking(s).');
    }
}
