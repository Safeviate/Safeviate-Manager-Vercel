import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from 'node:crypto';
import { compare, hash } from 'bcryptjs';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

export class MfaConfigurationError extends Error {
  constructor() {
    super('MFA configuration is incomplete. Set MFA_ENCRYPTION_KEY before enrolling users.');
    this.name = 'MfaConfigurationError';
  }
}

function getEncryptionKey() {
  const value = process.env.MFA_ENCRYPTION_KEY?.trim();
  if (!value) throw new MfaConfigurationError();

  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new MfaConfigurationError();
  return key;
}

function encodeBase32(value: Buffer) {
  let bits = 0;
  let output = '';
  let buffer = 0;

  for (const byte of value) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) output += BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string) {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];

  for (const character of value.replace(/[\s=-]/g, '').toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error('Invalid authenticator secret.');
    buffer = (buffer << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(output);
}

export function generateMfaSecret() {
  return encodeBase32(randomBytes(20));
}

export function encryptMfaSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptMfaSecret(value: string) {
  const [version, ivValue, tagValue, ciphertextValue] = value.split('.');
  if (version !== 'v1' || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error('Invalid encrypted authenticator secret.');
  }

  const decipher = createDecipheriv('aes-256-gcm', getEncryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

export function createOtpAuthUri(email: string, secret: string) {
  const issuer = 'Safeviate';
  const label = encodeURIComponent(`${issuer}:${email}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

function getTotp(secret: string, timestamp = Date.now()) {
  const counter = BigInt(Math.floor(timestamp / 1000 / TOTP_PERIOD_SECONDS));
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(counter);
  const digest = createHmac('sha1', decodeBase32(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 15;
  const binary =
    ((digest[offset] & 127) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

function normalizeCode(code: string) {
  return code.replace(/[\s-]/g, '').toUpperCase();
}

export function verifyTotp(secret: string, submittedCode: string) {
  const code = normalizeCode(submittedCode);
  if (!/^\d{6}$/.test(code)) return false;

  const now = Date.now();
  return [-1, 0, 1].some((offset) => getTotp(secret, now + offset * TOTP_PERIOD_SECONDS * 1000) === code);
}

export function generateRecoveryCodes() {
  return Array.from({ length: 10 }, () => {
    const code = encodeBase32(randomBytes(5)).slice(0, 8);
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  });
}

export async function hashRecoveryCodes(codes: string[]) {
  return Promise.all(codes.map((code) => hash(normalizeCode(code), 12)));
}

export async function verifyMfaCode(
  secret: string,
  submittedCode: string,
  recoveryCodeHashes: string[]
): Promise<{ valid: boolean; usedRecoveryCodeHash?: string }> {
  if (verifyTotp(secret, submittedCode)) return { valid: true };

  const code = normalizeCode(submittedCode);
  if (!code || /^\d{6}$/.test(code)) return { valid: false };

  for (const recoveryCodeHash of recoveryCodeHashes) {
    if (await compare(code, recoveryCodeHash)) {
      return { valid: true, usedRecoveryCodeHash: recoveryCodeHash };
    }
  }

  return { valid: false };
}
