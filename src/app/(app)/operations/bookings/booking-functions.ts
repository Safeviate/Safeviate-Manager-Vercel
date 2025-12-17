
'use client';

import {
    Firestore,
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
  } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase';
import type { Booking } from '@/types/booking';

type BookingCreationData = Omit<Booking, 'id' | 'bookingNumber' | 'status' | 'startTime' | 'endTime'> & {
    startTime: Date;
    endTime: Date;
};

/**
 * Creates a new booking with a sequential number and updates the aircraft status.
 * @param firestore - The Firestore instance.
 * @param tenantId - The ID of the tenant.
 * @param bookingData - The data for the new booking.
 */
export const createBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingData: BookingCreationData
): Promise<string> => {

    const counterRef = doc(firestore, `tenants/${tenantId}/counters`, 'bookings');
    const bookingsRef = collection(firestore, `tenants/${tenantId}`, 'bookings');
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, bookingData.aircraftId);

    try {
        const newBookingId = await runTransaction(firestore, async (transaction) => {
            // 1. Get and increment the booking number
            const counterDoc = await transaction.get(counterRef);
            
            let newBookingNumber = 1;
            if (counterDoc.exists()) {
                newBookingNumber = counterDoc.data().currentNumber + 1;
            }
            transaction.set(counterRef, { currentNumber: newBookingNumber }, { merge: true });

            // 2. Create the new booking document
            const newBookingRef = doc(bookingsRef); // Create a new doc reference with a generated ID
            
            const payload: any = {
                ...bookingData,
                id: newBookingRef.id,
                bookingNumber: newBookingNumber,
                status: 'Confirmed',
                startTime: Timestamp.fromDate(bookingData.startTime),
                endTime: Timestamp.fromDate(bookingData.endTime),
            };

            // Conditionally add instructorId to avoid 'undefined' error
            if (bookingData.instructorId) {
                payload.instructorId = bookingData.instructorId;
            } else {
                delete payload.instructorId;
            }
            
            transaction.set(newBookingRef, payload);
            
            // 3. Update the aircraft status to needs-post-flight after pre-flight is done
            transaction.update(aircraftRef, { checklistStatus: 'needs-post-flight' });

            return newBookingRef.id;
        });

        return newBookingId;
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw new Error("Failed to create booking. Please try again.");
    }
};

/**
 * Updates an existing booking, e.g., with post-flight data.
 * @param firestore - The Firestore instance.
 * @param tenantId - The ID of the tenant.
 * @param bookingId - The ID of the booking to update.
 * @param updateData - The data to update.
 * @param aircraftId - The ID of the associated aircraft.
 * @param markAsReady - Whether to set the aircraft checklistStatus to 'ready'.
 */
export const updateBooking = (
    firestore: Firestore,
    tenantId: string,
    bookingId: string,
    updateData: Partial<Booking>,
    aircraftId: string,
    markAsReady: boolean
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    // Create a clean object to avoid sending undefined values
    const cleanUpdateData: { [key: string]: any } = {};
    for (const key in updateData) {
        if (updateData[key as keyof typeof updateData] !== undefined) {
            cleanUpdateData[key] = updateData[key as keyof typeof updateData];
        }
    }

    updateDocumentNonBlocking(bookingRef, cleanUpdateData);

    if (markAsReady) {
        const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
        updateDocumentNonBlocking(aircraftRef, { checklistStatus: 'ready' });
    }
}
