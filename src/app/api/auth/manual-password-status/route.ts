import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, mustChangeManualPassword: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    mustChangeManualPassword: Boolean(session.user.mustChangeManualPassword),
  });
}
