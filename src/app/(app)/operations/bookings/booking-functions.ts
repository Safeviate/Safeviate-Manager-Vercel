
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
import { parse, isAfter } from 'date-fns';
import type { Aircraft } from '../../assets/page';

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
            const counterDoc = await transaction.get(counterRef);
            const aircraftDoc = await transaction.get(aircraftRef);

            if (!aircraftDoc.exists()) {
                throw new Error("Aircraft not found. Cannot create booking.");
            }

            let newBookingNumber = 1;
            if (counterDoc.exists()) {
                newBookingNumber = counterDoc.data().currentNumber + 1;
            }
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
            
            transaction.set(newBookingRef, payload);

            // Only set the aircraft to needs-pre-flight if it's currently ready.
            // This prevents a new booking from hijacking the status from an existing one.
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

type UpdateBookingParams = {
    firestore: Firestore;
    tenantId: string;
    bookingId: string;
    updateData: Partial<Booking>;
    aircraft: Aircraft;
    isSubmittingPreFlight?: boolean;
    isSubmittingPostFlight?: boolean;
};

/**
 * Updates an existing booking, e.g., with checklist data, and manages aircraft status.
 */
export const updateBooking = async ({
    firestore,
    tenantId,
    bookingId,
    updateData,
    aircraft,
    isSubmittingPreFlight = false,
    isSubmittingPostFlight = false,
}: UpdateBookingParams) => {
    const bookingRef = doc(firestore, `tenants/${tenantId}/bookings`, bookingId);
    
    const updatePayload: Record<string, any> = { ...updateData };

    if (updatePayload.instructorId === '' || updatePayload.instructorId === null) {
        updatePayload.instructorId = deleteField();
    }
    
    const batch = writeBatch(firestore);

    batch.set(bookingRef, updatePayload, { merge: true });
    
    const aircraftRef = doc(firestore, `tenants/${tenantId}/aircrafts`, aircraft.id);
    const isCancelling = updateData.status === 'Cancelled' || updateData.status === 'Cancelled with Reason';

    if (isSubmittingPostFlight) {
        // Update aircraft's Hobbs and Tacho from post-flight data
        const aircraftUpdates: Partial<Aircraft> = {
            currentHobbs: updateData.postFlight?.actualHobbs,
            currentTacho: updateData.postFlight?.actualTacho,
        };

        // Find the next booking to activate
        const bookingsCol = collection(firestore, `tenants/${tenantId}/bookings`);
        const currentBookingDoc = await getDoc(bookingRef);
        const currentBookingData = currentBookingDoc.data() as Booking;
        const currentBookingStart = parse(`${currentBookingData.bookingDate}T${currentBookingData.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());

        // Simplified query to avoid composite index
        const nextBookingQuery = query(
            bookingsCol,
            where('aircraftId', '==', aircraft.id),
            where('status', '==', 'Confirmed')
        );

        const querySnapshot = await getDocs(nextBookingQuery);
        
        const futureBookings = querySnapshot.docs
            .map(doc => doc.data() as Booking)
            .filter(booking => {
                const bookingStart = parse(`${booking.bookingDate}T${booking.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
                return isAfter(bookingStart, currentBookingStart);
            })
            .sort((a, b) => {
                const aStart = parse(`${a.bookingDate}T${a.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
                const bStart = parse(`${b.bookingDate}T${b.startTime}`, 'yyyy-MM-dd\'T\'HH:mm', new Date());
                return aStart.getTime() - bStart.getTime();
            });

        const nextBooking = futureBookings[0];

        if (nextBooking) {
            aircraftUpdates.checklistStatus = 'needs-pre-flight';
            aircraftUpdates.currentBookingId = nextBooking.id;
        } else {
            aircraftUpdates.checklistStatus = 'Ready';
            aircraftUpdates.currentBookingId = null;
        }
        batch.update(aircraftRef, aircraftUpdates as Record<string, any>);

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
