
'use client';

import {
    Firestore,
    collection,
    doc,
    runTransaction,
    serverTimestamp,
    Timestamp,
    deleteField,
    writeBatch,
  } from 'firebase/firestore';
import { updateDocumentNonBlocking, deleteDocumentNonBlocking as deleteDocNonBlocking } from '@/firebase';
import type { Booking } from '@/types/booking';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';


type BookingCreationData = Omit<Booking, 'id' | 'bookingNumber' | 'status'>;

/**
 * Creates a new booking with a sequential number and updates the aircraft status.
 * @param firestore - The Firestore instance.
 * @param tenantId - The ID of the tenant.
 * @param bookingData - The data for the new booking.
 */
export const createBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingData: Partial<BookingCreationData>
): Promise<string> => {

    const counterRef = doc(firestore, `tenants/${tenantId}/counters`, 'bookings');
    const bookingsRef = collection(firestore, `tenants/${tenantId}`, 'bookings');
    
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
            
            // Construct the payload carefully, excluding undefined or empty objects
            const payload: any = {
                id: newBookingRef.id,
                bookingNumber: newBookingNumber,
                status: 'Confirmed',
                aircraftId: bookingData.aircraftId,
                pilotId: bookingData.pilotId,
                type: bookingData.type,
                bookingDate: bookingData.bookingDate,
                startTime: bookingData.startTime,
                endTime: bookingData.endTime,
            };
            
            if (bookingData.instructorId) {
                payload.instructorId = bookingData.instructorId;
            }
            if (bookingData.isOvernight) {
                payload.isOvernight = bookingData.isOvernight;
                payload.overnightBookingDate = bookingData.overnightBookingDate;
                payload.overnightEndTime = bookingData.overnightEndTime;
            }
            
            transaction.set(newBookingRef, payload);
            
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
 * @param isSubmittingPreFlight - Whether a pre-flight is being submitted.
 * @param isSubmittingPostFlight - Whether a post-flight is being submitted.
 */
export const updateBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string,
    updateData: Partial<Booking>,
    aircraftId: string,
    isSubmittingPreFlight: boolean,
    isSubmittingPostFlight: boolean
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    // Create a clean object for the batch update using dot notation for nested fields.
    const flattenedUpdateData: { [key: string]: any } = {};

    for (const key in updateData) {
        const value = updateData[key as keyof typeof updateData];

        if (value === undefined) {
            continue; // Skip undefined values
        }

        if (value === null) {
            flattenedUpdateData[key] = deleteField(); // Delete top-level null fields
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null && !(value instanceof Timestamp)) {
            // Handle nested objects (like preFlight, postFlight)
            let hasData = false;
            for (const nestedKey in value) {
                const nestedValue = (value as any)[nestedKey];
                if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '' && (!Array.isArray(nestedValue) || nestedValue.length > 0)) {
                    hasData = true;
                    const dotPath = `${key}.${nestedKey}`;
                    flattenedUpdateData[dotPath] = nestedValue;
                }
            }
            // If the object has no valid data, we don't add it to the update.
        } else {
            flattenedUpdateData[key] = value; // Handle top-level primitive values
        }
    }

    const batch = writeBatch(firestore);

    // Only update if there's something to update
    if (Object.keys(flattenedUpdateData).length > 0) {
        batch.update(bookingRef, flattenedUpdateData);
    }
    
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);

    if (isSubmittingPostFlight) {
        batch.update(aircraftRef, { checklistStatus: 'ready' });
    } else if (isSubmittingPreFlight) {
        batch.update(aircraftRef, { checklistStatus: 'needs-post-flight' });
    }

    // Using a batch write with non-blocking error handling
    batch.commit().catch(error => {
        // Since we can't easily determine which write failed, we create a generic error
        // A more complex implementation could try to infer the path.
        const contextualError = new FirestorePermissionError({
          operation: 'write',
          path: `tenants/${tenantId}/bookings/${bookingId} (and possibly aircraft)`,
          requestResourceData: flattenedUpdateData,
        });
        errorEmitter.emit('permission-error', contextualError);
        // Re-throw the original server error to let the caller handle it
        throw error;
    });
}

/**
 * Deletes a booking from the database.
 * @param firestore - The Firestore instance.
 * @param tenantId - The ID of the tenant.
 * @param bookingId - The ID of the booking to delete.
 */
export const deleteBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    // Using the non-blocking delete function from firebase/index
    return deleteDocNonBlocking(bookingRef);
};
