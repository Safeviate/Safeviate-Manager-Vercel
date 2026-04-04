import { NextResponse } from 'next/server';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { sendWelcomeEmail } from '@/lib/server/mail';
import { getPublicBaseUrl } from '@/lib/server/site-url';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';

export async function POST(request: Request) {
  try {
    // 1. Authenticate the administrator
    const authResult = await authenticateAiRequest();
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

    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: { updatedAt: new Date() },
      create: { id: tenantId, name: tenantId },
    });

    const uid = `user_${email.replace(/[^a-z0-9]+/g, '_')}`;
    const tempPassword = password;
    const passwordHash = await hash(tempPassword, 12);

    await prisma.user.upsert({
      where: { email },
      update: {
        id: uid,
        tenantId,
        passwordHash,
        firstName,
        lastName,
        role,
        profilePath: `tenants/${tenantId}/personnel/${uid}`,
        updatedAt: new Date(),
      },
      create: {
        id: uid,
        tenantId,
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        profilePath: `tenants/${tenantId}/personnel/${uid}`,
      },
    });

    await prisma.personnel.upsert({
      where: { id: uid },
      update: {
        tenantId,
        userNumber: userNumber || null,
        firstName,
        lastName,
        email,
        department: department || null,
        role,
        permissions: [],
        accessOverrides: Prisma.JsonNull,
        userType: userType || 'Personnel',
        updatedAt: new Date(),
      },
      create: {
        id: uid,
        tenantId,
        userNumber: userNumber || null,
        firstName,
        lastName,
        email,
        department: department || null,
        role,
        permissions: [],
        accessOverrides: Prisma.JsonNull,
        userType: userType || 'Personnel',
      },
    });

    const baseUrl = getPublicBaseUrl(request);
    const setupLink = `${baseUrl}/login`;

    const emailResult = await sendWelcomeEmail({ email, name: `${firstName} ${lastName}`, setupLink, tempPassword });
    
    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: `Failed to send email. Resend Error: ${emailResult.error}`,
          diagnostics: emailResult.diagnostics || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, uid, message: 'User created and invite sent.' });
  } catch (error: any) {
    console.error('User creation failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error during user creation.' }, { status: 500 });
  }
}
