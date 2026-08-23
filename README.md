# Safeviate Manager

This is a Next.js app deployed on Azure App Service with Azure Database for PostgreSQL and Azure Blob Storage.

For local development, copy `.env.local.example` to `.env.local` and set the required runtime env vars there. For Azure, set the production values in App Service application settings:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `NEXT_PUBLIC_APP_URL` if you want to override the deployment URL
- `NEXTAUTH_SECRET`
- `MFA_ENCRYPTION_KEY` (a stable base64-encoded 32-byte key used to encrypt authenticator secrets)
- `NEXTAUTH_URL`
- `AUTH_SEED_EMAIL`
- `AUTH_SEED_PASSWORD` or `AUTH_SEED_PASSWORD_HASH`
- `Safeviate_AI_KEY` for AI flows, with `OPENAI_API_KEY` kept as a fallback
- `OPENAIP_API_KEY` for the map tile proxy
- `DATABASE_URL`
- `DATABASE_URL_UNPOOLED`
- `AZURE_STORAGE_CONNECTION_STRING`
- `AZURE_STORAGE_CONTAINER_NAME`

## Prisma (Development)

This repo now includes Prisma alongside existing Drizzle code during migration.

1. Install deps:
`npm install`

2. Start a local PostgreSQL service and create the `safeviate` database/user, or use the disposable Docker setup:
`npm run local:setup`

3. Generate client:
`npm run prisma:generate`

Development uses `.env.development.local`, which points both Prisma URLs to local PostgreSQL on `localhost:5432` and the auth URL to `http://localhost:9002`. Production Azure and AWS settings remain in their deployment environments and are not used by the local app.

## Card Layout Standard

For card shells, header bands, border tokens, and compact control rows, use the coherence matrix specimen as the visual reference and follow the `safeviate-card-layout-standard` skill.
