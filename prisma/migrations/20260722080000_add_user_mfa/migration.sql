-- Store encrypted TOTP enrolment data and one-way recovery-code hashes per application user.
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "mfa_secret_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "mfa_pending_secret_encrypted" TEXT,
  ADD COLUMN IF NOT EXISTS "mfa_pending_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "mfa_enabled_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "mfa_recovery_code_hashes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
