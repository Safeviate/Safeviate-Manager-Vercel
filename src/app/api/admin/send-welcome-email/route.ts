import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth } from '@/lib/server/firebase-admin';
import { authenticateAiRequest } from '@/lib/server/ai-auth';

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
    
    // Generate a secure password reset link which acts as the setup link
    const actionCodeSettings = {
      url: `${new URL(request.url).origin}/login`,
      handleCodeInApp: true,
    };
    
    const setupLink = await auth.generatePasswordResetLink(email, actionCodeSettings);

    // In a production app, we would use Resend or another provider here.
    // For this prototype, we simulate the dispatch.
    console.log(`[ONBOARDING] Sending welcome email to ${email} with link: ${setupLink}`);

    // If RESEND_API_KEY is available, we would call it:
    // await sendWelcomeEmail({ email, name, setupLink });

    return NextResponse.json({ ok: true, message: 'Welcome email dispatched.' });
  } catch (error: any) {
    console.error('Onboarding dispatch failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
