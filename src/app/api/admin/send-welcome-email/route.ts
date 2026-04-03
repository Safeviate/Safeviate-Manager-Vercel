import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebase-admin';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { sendWelcomeEmail } from '@/lib/server/mail';

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAiRequest(request);
    if (!authResult.ok) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Check for edit permission
    if (!authResult.effectivePermissions.has('users-edit') && authResult.userProfile.role?.toLowerCase() !== 'developer') {
      return NextResponse.json({ error: 'Unauthorized to trigger onboarding.' }, { status: 403 });
    }

    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const auth = getFirebaseAdminAuth();
    
    // Securely retrieve the public-facing domain using load balancer headers (App Hosting / Cloud Run)
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const baseUrl = host ? `${protocol}://${host}` : new URL(request.url).origin;

    // Generate a secure password reset link which acts as the setup link
    const actionCodeSettings = {
      url: `${baseUrl}/login`,
      handleCodeInApp: true,
    };
    
    const setupLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // Dispatch the actual email
    const result = await sendWelcomeEmail({ email, name, setupLink });

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({ 
        ok: true, 
        message: 'Welcome email dispatched.'
    });
  } catch (error: any) {
    console.error('Onboarding dispatch failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
