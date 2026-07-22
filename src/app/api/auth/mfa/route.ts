import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import QRCode from 'qrcode';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { enforceRateLimit } from '@/lib/server/request-security';
import {
  createOtpAuthUri,
  decryptMfaSecret,
  encryptMfaSecret,
  generateMfaSecret,
  generateRecoveryCodes,
  hashRecoveryCodes,
  MfaConfigurationError,
  verifyMfaCode,
  verifyTotp,
} from '@/lib/server/mfa';

const PENDING_ENROLLMENT_DURATION_MS = 10 * 60 * 1000;

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

function getUnauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return getUnauthorizedResponse();

  return NextResponse.json({
    enabled: Boolean(user.mfaEnabledAt && user.mfaSecretEncrypted),
    pendingEnrollment: Boolean(user.mfaPendingSecretEncrypted && user.mfaPendingExpiresAt && user.mfaPendingExpiresAt > new Date()),
    recoveryCodesRemaining: user.mfaRecoveryCodeHashes.length,
    configurationReady: Boolean(process.env.MFA_ENCRYPTION_KEY?.trim()),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return getUnauthorizedResponse();

  const body = await request.json().catch(() => null);
  const action = String(body?.action || '');
  const code = String(body?.code || '');
  const rateLimit = enforceRateLimit({
    request,
    key: `auth-mfa-${action || 'unknown'}`,
    limit: action === 'setup' ? 5 : 10,
    identity: user.email,
  });
  if (rateLimit) {
    return NextResponse.json(
      { error: rateLimit.message },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    if (action === 'setup') {
      const secret = generateMfaSecret();
      const expiresAt = new Date(Date.now() + PENDING_ENROLLMENT_DURATION_MS);
      const qrSvg = await QRCode.toString(createOtpAuthUri(user.email, secret), {
        type: 'svg',
        margin: 1,
        color: { dark: '#082f49', light: '#ffffff' },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaPendingSecretEncrypted: encryptMfaSecret(secret),
          mfaPendingExpiresAt: expiresAt,
        },
      });

      return NextResponse.json({ qrSvg, manualKey: secret, expiresAt: expiresAt.toISOString() });
    }

    if (action === 'confirm') {
      if (!user.mfaPendingSecretEncrypted || !user.mfaPendingExpiresAt || user.mfaPendingExpiresAt <= new Date()) {
        return NextResponse.json({ error: 'Your MFA setup expired. Start setup again.' }, { status: 400 });
      }

      const secret = decryptMfaSecret(user.mfaPendingSecretEncrypted);
      if (!verifyTotp(secret, code)) {
        return NextResponse.json({ error: 'That authenticator code is not valid. Try the current six-digit code.' }, { status: 400 });
      }

      const recoveryCodes = generateRecoveryCodes();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaSecretEncrypted: encryptMfaSecret(secret),
          mfaPendingSecretEncrypted: null,
          mfaPendingExpiresAt: null,
          mfaEnabledAt: new Date(),
          mfaRecoveryCodeHashes: await hashRecoveryCodes(recoveryCodes),
        },
      });
      return NextResponse.json({ enabled: true, recoveryCodes });
    }

    if (action === 'regenerate-recovery-codes') {
      if (!user.mfaSecretEncrypted) return NextResponse.json({ error: 'MFA is not enabled.' }, { status: 400 });
      const verification = await verifyMfaCode(
        decryptMfaSecret(user.mfaSecretEncrypted),
        code,
        user.mfaRecoveryCodeHashes,
      );
      if (!verification.valid) return NextResponse.json({ error: 'Enter a valid authenticator or recovery code.' }, { status: 400 });

      const recoveryCodes = generateRecoveryCodes();
      await prisma.user.update({
        where: { id: user.id },
        data: { mfaRecoveryCodeHashes: await hashRecoveryCodes(recoveryCodes) },
      });
      return NextResponse.json({ recoveryCodes });
    }

    if (action === 'disable') {
      if (!user.mfaSecretEncrypted) return NextResponse.json({ error: 'MFA is not enabled.' }, { status: 400 });
      const verification = await verifyMfaCode(
        decryptMfaSecret(user.mfaSecretEncrypted),
        code,
        user.mfaRecoveryCodeHashes,
      );
      if (!verification.valid) return NextResponse.json({ error: 'Enter a valid authenticator or recovery code.' }, { status: 400 });

      await prisma.user.update({
        where: { id: user.id },
        data: {
          mfaSecretEncrypted: null,
          mfaPendingSecretEncrypted: null,
          mfaPendingExpiresAt: null,
          mfaEnabledAt: null,
          mfaRecoveryCodeHashes: [],
        },
      });
      return NextResponse.json({ enabled: false });
    }

    return NextResponse.json({ error: 'Unsupported MFA action.' }, { status: 400 });
  } catch (error) {
    if (error instanceof MfaConfigurationError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error('[MFA] Request failed.', { action, error });
    return NextResponse.json({ error: 'MFA could not be updated. Please try again.' }, { status: 500 });
  }
}
