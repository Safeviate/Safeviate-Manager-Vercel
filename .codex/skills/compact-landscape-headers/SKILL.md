---
name: compact-landscape-headers
description: Compact shared headers and page headers for short-height mobile landscape screens across Safeviate pages. Use when the app top bar, section header, or action strip is too tall on phones or tablets in landscape and the fix should apply globally without changing desktop or portrait layouts.
---

# Compact Landscape Headers

Use this skill to reclaim vertical space on mobile landscape screens by tightening the shared app header and shared page header patterns used across the app.

## Workflow

1. Start with the shared surfaces, not the page body.
2. Check `src/components/app-header.tsx` for the global top bar.
3. Check `src/components/page-header.tsx` for section titles, descriptions, and header action rows.
4. Put the responsive rule in `src/app/globals.css` so every page inherits it.
5. Use a short-height landscape media query, typically `@media (max-height: 500px) and (orientation: landscape)`.
6. Shrink height, padding, icon/avatar sizes, and title spacing.
7. Hide secondary description text if the page still feels crowded.
8. Leave portrait and desktop rules alone unless the user explicitly asks for broader layout changes.

## Guardrails

- Prefer one shared rule over page-specific hacks.
- Keep the change visually consistent across all pages that use the shared header components.
- If a page has its own large action bar, trim that bar only after the shared header is compact.
- Verify at least one map-heavy page and one normal content page when possible.
