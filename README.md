# Safeviate Manager

This is a Next.js app configured for deployment on Vercel.

For local development, copy `.env.local.example` to `.env.local` and set the required runtime env vars there. For production, set the same values in Vercel Project Settings > Environment Variables:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `NEXT_PUBLIC_APP_URL` if you want to override the deployment URL
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_SEED_EMAIL`
- `AUTH_SEED_PASSWORD` or `AUTH_SEED_PASSWORD_HASH`
- `OPENAI_API_KEY`
- `OPENAIP_API_KEY` for the map tile proxy
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN` if you want document/photo uploads to work in production

## Prisma (Development)

This repo now includes Prisma alongside existing Drizzle code during migration.

1. Install deps:
`npm install`

2. Generate client:
`npm run prisma:generate`

3. Push schema to your **development** database:
`npm run prisma:push`

Use a dev-only `DATABASE_URL` locally and keep production values in Vercel environment variables.
