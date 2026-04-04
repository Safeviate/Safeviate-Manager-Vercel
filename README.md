# Safeviate Manager

This is a Next.js app configured for deployment on Vercel.

For local development, start from `src/app/page.tsx` and set the required runtime env vars in Vercel:

- `RESEND_API_KEY`
- `MAIL_FROM`
- `NEXT_PUBLIC_APP_URL` if you want to override the deployment URL
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `AUTH_SEED_EMAIL`
- `AUTH_SEED_PASSWORD` or `AUTH_SEED_PASSWORD_HASH`
