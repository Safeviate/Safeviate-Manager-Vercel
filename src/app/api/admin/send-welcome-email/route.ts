import { NextResponse } from 'next/server';
import { authenticateAiRequest } from '@/lib/server/ai-auth';
import { sendWelcomeEmail } from '@/lib/server/mail';
import { getPublicBaseUrl } from '@/lib/server/site-url';

export async function POST(request: Request) {
  try {
    const authResult = await authenticateAiRequest();
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

    const baseUrl = getPublicBaseUrl(request);
    const setupLink = `${baseUrl}/login`;

    // Dispatch the actual email
    const result = await sendWelcomeEmail({ email, name, setupLink });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to send welcome email.',
          diagnostics: result.diagnostics || null,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
        ok: true, 
        message: 'Welcome email dispatched.',
        diagnostics: result.diagnostics || null,
    });
  } catch (error: any) {
    console.error('Onboarding dispatch failed:', error);
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 });
  }
}
