# Agents Contract

This file is the default working guide for the Safeviate Manager repo. Keep it practical and short.

## Working Rules

- Start by identifying the exact screen, route, component, or API involved.
- Check the caller, API route, and any shared helper before assuming the bug source.
- Reuse an existing working flow when possible.
- Make the smallest change that fully solves the request.
- Do not revert user changes unless explicitly asked.
- Use `apply_patch` for manual file edits.
- Avoid polish, refactors, or layout changes unless the user asks for them.
- If a change spans multiple flows, verify the whole path, not just one file.

## Commands

- `npm run dev` starts the app on port `9002`.
- `npm run build` runs Prisma generation and then builds.
- `npm run typecheck` runs TypeScript validation.
- `npm run test:e2e` runs Playwright.
- `npm run prisma:generate` regenerates the Prisma client.
- `npm run prisma:push` syncs Prisma schema to the database.

## Debugging Notes

- Use `rg` for search.
- Use `Get-Content` and `Get-ChildItem` for inspection.
- Quote paths with parentheses or brackets in PowerShell.
- Treat empty API data as a valid empty state unless the caller truly needs a hard error.
- For proxy routes, prefer graceful empty payloads over hard failures when upstream data is missing.
- If a route returns `404` for "no data found", check whether the caller expects an empty state instead.

## Default Verification Order

- Inspect the affected file and its caller first.
- Run `npm run typecheck` after code changes.
- If the change affects UI or an interactive flow, verify the rendered screen or end-to-end path.
- For booking, weather, map, and approval changes, verify the exact screen the user interacts with.

## Repo Context

- Next.js 15 on React 18.
- Tailwind CSS with shadcn/ui.
- NextAuth for auth.
- Prisma is the active database path, with some older Drizzle code still present.
- Aviation features include maps, weather, approvals, and booking workflows.
- Main code lives in `src/`, database schema in `prisma/`, and tests in `test/`.
- For card shells, header bands, row hierarchy, border tokens, and compact control layout, use the coherence matrix specimen as the reference implementation and follow the `safeviate-card-layout-standard` skill.
