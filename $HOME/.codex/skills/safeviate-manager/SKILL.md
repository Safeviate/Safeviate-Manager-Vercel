---
name: safeviate-manager
description: Safeviate Manager repository workflow guide for Next.js app work. Use when editing or debugging booking, weather, map, approval, API, auth, or UI flows in this codebase, especially when a caller/API mismatch, empty-state handling, or end-to-end verification matters.
---

# Safeviate Manager

Use this skill for work in the Safeviate Manager app.

## What to Optimize For

- Fix the actual bug or missing behavior, not just the symptom.
- Keep changes small and aligned with the existing app patterns.
- Verify the exact user flow after changes that affect bookings, weather, maps, approvals, or API routes.

## How to Work Here

- Inspect the specific screen, route, component, or API involved.
- Check the caller and the callee when behavior looks wrong.
- Prefer existing working flows over inventing parallel ones.
- Keep UI changes functional first; polish only when asked.
- Treat empty API responses as a valid state unless the caller truly needs a hard error.

## Useful Repo Facts

- App code lives in `src/app/`.
- Shared UI and feature components live in `src/components/`.
- Shared logic lives in `src/lib/`.
- Shared types live in `src/types/`.
- Prisma schema and migrations live in `prisma/`.
- Tests live in `test/`.

## Validation

- Run `npm run typecheck` for TypeScript and utility changes.
- Inspect both route and caller for API issues.
- Verify the rendered screen or end-to-end interaction for UI changes.
- Pay extra attention to booking, weather, map, and approval workflows.
