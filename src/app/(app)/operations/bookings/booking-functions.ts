
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
    getDoc,
    query,
    where,
    orderBy,
    limit,
    getDocs,
  } from 'firebase/firestore';
import type { Booking } from '@/types/booking';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { parse } from 'date-fns';

type BookingCreationData = Omit<Booking, 'id' | 'bookingNumber' | 'status'>;

/**
 * Creates a new booking with a sequential number. Does not affect aircraft status.
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
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, bookingData.aircraftId!);
    
    try {
        const newBookingId = await runTransaction(firestore, async (transaction) => {
            // --- ALL READS MUST HAPPEN FIRST ---
            const counterDoc = await transaction.get(counterRef);
            const aircraftDoc = await transaction.get(aircraftRef);

            if (!aircraftDoc.exists()) {
                throw new Error("Aircraft not found. Cannot create booking.");
            }

            // --- ALL WRITES HAPPEN AFTER READS ---
            let newBookingNumber = 1;
            if (counterDoc.exists()) {
                newBookingNumber = counterDoc.data().currentNumber + 1;
            }
            // Write 1: Update counter
            transaction.set(counterRef, { currentNumber: newBookingNumber }, { merge: true });

            const newBookingRef = doc(bookingsRef);
            
            const payload: Partial<Booking> = {
                id: newBookingRef.id,
                bookingNumber: newBookingNumber,
                status: 'Confirmed',
                aircraftId: bookingData.aircraftId!,
                pilotId: bookingData.pilotId!,
                type: bookingData.type!,
                bookingDate: bookingData.bookingDate!,
                startTime: bookingData.startTime!,
                endTime: bookingData.endTime!,
            };

            if (bookingData.instructorId) {
                payload.instructorId = bookingData.instructorId;
            }
            
            // Write 2: Create the new booking
            transaction.set(newBookingRef, payload);

            // Write 3 (Conditional): Update aircraft status if it is currently 'Ready'.
            if (aircraftDoc.data().checklistStatus === 'Ready') {
                transaction.update(aircraftRef, {
                    checklistStatus: 'needs-pre-flight',
                    currentBookingId: newBookingRef.id
                });
            }

            return newBookingRef.id;
        });

        return newBookingId;
    } catch (error) {
        console.error("Transaction failed: ", error);
        throw new Error("Failed to create booking. Please try again.");
    }
};

/**
 * Updates an existing booking, e.g., with checklist data, and manages aircraft status.
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
    
    const updatePayload: Record<string, any> = { ...updateData };

    if (updatePayload.instructorId === '' || updatePayload.instructorId === null) {
        updatePayload.instructorId = deleteField();
    }
    
    const batch = writeBatch(firestore);

    batch.set(bookingRef, updatePayload, { merge: true });
    
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraftId);
    const isCancelling = updateData.status === 'Cancelled' || updateData.status === 'Cancelled with Reason';

    if (isSubmittingPostFlight) {
        // Find the next booking to activate
        const bookingsCol = collection(firestore, `tenants/${tenantId}/bookings`);
        const currentBookingDoc = await getDoc(bookingRef);
        const currentBookingData = currentBookingDoc.data() as Booking;
        const currentBookingStart = parse(`${currentBookingData.bookingDate}T${currentBookingData.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());

        const nextBookingQuery = query(
            bookingsCol,
            where('aircraftId', '==', aircraftId),
            where('status', '==', 'Confirmed'),
            where('bookingDate', '>=', currentBookingData.bookingDate),
            orderBy('bookingDate'),
            orderBy('startTime'),
            limit(20) // Look ahead a reasonable number of bookings
        );

        const nextBookingSnapshot = await getDocs(nextBookingQuery);
        let nextBookingId: string | null = null;
        
        // Find the actual next chronological booking after the current one
        for (const doc of nextBookingSnapshot.docs) {
            if (doc.id === bookingId) continue;
            
            const booking = doc.data() as Booking;
            const bookingStart = parse(`${booking.bookingDate}T${booking.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
            
            if (bookingStart > currentBookingStart) {
                nextBookingId = doc.id;
                break; // Found the very next one
            }
        }

        if (nextBookingId) {
            batch.update(aircraftRef, {
                checklistStatus: 'needs-pre-flight',
                currentBookingId: nextBookingId,
            });
        } else {
            batch.update(aircraftRef, {
                checklistStatus: 'Ready',
                currentBookingId: null,
            });
        }
    } else if (isSubmittingPreFlight) {
        batch.update(aircraftRef, { checklistStatus: 'needs-post-flight', currentBookingId: bookingId });
    } else if (isCancelling) {
        const aircraftDoc = await getDoc(aircraftRef);
        if (aircraftDoc.exists() && aircraftDoc.data().currentBookingId === bookingId) {
             batch.update(aircraftRef, { checklistStatus: 'Ready', currentBookingId: null });
        }
    }

    await batch.commit().catch(error => {
        const contextualError = new FirestorePermissionError({
          operation: 'write',
          path: `tenants/${tenantId}/bookings/${bookingId} (and possibly aircraft)`,
          requestResourceData: updatePayload,
        });
        errorEmitter.emit('permission-error', contextualError);
        throw error;
    });
}

/**
 * Deletes a booking from the database and resets the aircraft status if needed.
 */
export const deleteBooking = async (
    firestore: Firestore,
    tenantId: string,
    bookingId: string
) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const bookingDoc = await transaction.get(bookingRef);
            if (!bookingDoc.exists()) {
                throw new Error("Booking does not exist.");
            }
            
            const bookingData = bookingDoc.data() as Booking;
            const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, bookingData.aircraftId);

            const aircraftDoc = await transaction.get(aircraftRef);
            
            if(aircraftDoc.exists() && aircraftDoc.data().currentBookingId === bookingId) {
                transaction.update(aircraftRef, { checklistStatus: 'Ready', currentBookingId: null });
            }
            
            transaction.delete(bookingRef);
        });
    } catch (error) {
        console.error("Booking deletion transaction failed: ", error);
        
        const contextualError = new FirestorePermissionError({
          operation: 'delete',
          path: bookingRef.path,
        });
        errorEmitter.emit('permission-error', contextualError);
        
        throw new Error("Failed to delete booking.");
    }
};
