import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/server/firebase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      tenantId, email, password, firstName, lastName, 
      userType, role, department, userNumber, 
      organizationId, isErpIncerfaContact, isErpAlerfaContact 
    } = body;

    if (!tenantId || !email || !password || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required user information.' }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();

    // 1. Create Auth User
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    const uid = userRecord.uid;

    // 2. Determine target collection
    const collectionName = userType === 'Instructor' ? 'instructors' : 
                         userType === 'Student' ? 'students' : 
                         userType === 'Private Pilot' ? 'private-pilots' : 'personnel';

    // 3. Create Profile in Firestore
    await firestore.doc(`tenants/${tenantId}/${collectionName}/${uid}`).set({
      id: uid,
      firstName,
      lastName,
      email,
      userType,
      role,
      department: department || null,
      userNumber: userNumber || null,
      organizationId: organizationId || null,
      isErpIncerfaContact: !!isErpIncerfaContact,
      isErpAlerfaContact: !!isAlerfaContact,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Create Global User Link
    await firestore.doc(`users/${uid}`).set({
      email,
      profilePath: `tenants/${tenantId}/${collectionName}/${uid}`
    });

    return NextResponse.json({ ok: true, uid });
  } catch (error: any) {
    console.error('User creation failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during user creation.' }, { status: 500 });
  }
}
