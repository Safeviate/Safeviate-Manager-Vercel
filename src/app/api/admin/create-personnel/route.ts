import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/server/firebase-admin';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { sendWelcomeEmail } from '@/lib/server/mail';

export async function POST(request: Request) {
  try {
    // 1. Authenticate the administrator
    const authResult = await authenticateAiRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Simple permission check
    if (!authResult.effectivePermissions.has('users-create') && authResult.userProfile.role?.toLowerCase() !== 'developer') {
      return NextResponse.json({ error: 'Unauthorized to create users.' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      tenantId, email, firstName, lastName, 
      userType, role, department, userNumber, 
      organizationId, isErpIncerfaContact, isErpAlerfaContact 
    } = body;

    // Password is now optional (we generate a secure random one if not provided)
    const password = body.password || Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);

    if (!tenantId || !email || !firstName || !lastName || !role) {
      return NextResponse.json({ error: 'Missing required user information.' }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    const firestore = getFirebaseAdminFirestore();

    // 2. Create Auth User
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    const uid = userRecord.uid;

    // 3. Determine target collection
    const collectionName = userType === 'Instructor' ? 'instructors' : 
                         userType === 'Student' ? 'students' : 
                         userType === 'Private Pilot' ? 'private-pilots' : 'personnel';

    // 4. Create Profile in Firestore
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
      isErpAlerfaContact: !!isErpAlerfaContact,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 5. Create Global User Link
    await firestore.doc(`users/${uid}`).set({
      email,
      profilePath: `tenants/${tenantId}/${collectionName}/${uid}`
    });

    // 6. Manual onboarding trigger
    const setupLink = await auth.generatePasswordResetLink(email, {
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://safeviate--safeviate-aviation-management.europe-west4.hosted.app',
    });

    await sendWelcomeEmail({ email, name: `${firstName} ${lastName}`, setupLink });

    return NextResponse.json({ ok: true, uid, message: 'User created and invite sent.' });
  } catch (error: any) {
    console.error('User creation failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during user creation.' }, { status: 500 });
  }
}
