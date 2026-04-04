import { NextResponse } from 'next/server';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { sendWelcomeEmail } from '@/lib/server/mail';
import { getPublicBaseUrl } from '@/lib/server/site-url';
import { getDb } from '@/db';
import { personnel, tenants, users } from '@/db/schema';
import { hash } from 'bcryptjs';
import { eq } from 'drizzle-orm';

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

    const db = getDb();
    await db.insert(tenants).values({ id: tenantId, name: tenantId, updatedAt: new Date() }).onConflictDoNothing();

    const uid = `user_${email.replace(/[^a-z0-9]+/g, '_')}`;
    const tempPassword = password;
    const passwordHash = await hash(tempPassword, 12);

    await db.insert(users).values({
      id: uid,
      tenantId,
      email,
      passwordHash,
      firstName,
      lastName,
      role,
      profilePath: `tenants/${tenantId}/personnel/${uid}`,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: users.email,
      set: {
        id: uid,
        tenantId,
        passwordHash,
        firstName,
        lastName,
        role,
        profilePath: `tenants/${tenantId}/personnel/${uid}`,
        updatedAt: new Date(),
      },
    });

    await db.insert(personnel).values({
      id: uid,
      tenantId,
      userNumber: userNumber || null,
      firstName,
      lastName,
      email,
      department: department || null,
      role,
      permissions: [],
      accessOverrides: null,
      userType: userType || 'Personnel',
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: personnel.id,
      set: {
        tenantId,
        userNumber: userNumber || null,
        firstName,
        lastName,
        email,
        department: department || null,
        role,
        permissions: [],
        accessOverrides: null,
        userType: userType || 'Personnel',
        updatedAt: new Date(),
      },
    });

    const baseUrl = getPublicBaseUrl(request);
    const setupLink = `${baseUrl}/login`;

    const emailResult = await sendWelcomeEmail({ email, name: `${firstName} ${lastName}`, setupLink, tempPassword });
    
    if (!emailResult.success) {
      // Throwing here ensures the catch block runs and the frontend shows a red error
      throw new Error(`Failed to send email. Resend Error: ${emailResult.error}`);
    }

    return NextResponse.json({ ok: true, uid, message: 'User created and invite sent.' });
  } catch (error: any) {
    console.error('User creation failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during user creation.' }, { status: 500 });
  }
}
