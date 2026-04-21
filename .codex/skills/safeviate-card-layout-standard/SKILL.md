---
name: safeviate-card-layout-standard
description: Standardize Safeviate card shells, header bands, row hierarchy, border tokens, and compact control layout. Use when editing or building any card-heavy page in this repo, especially screens that should match the coherence matrix specimen, share page-header patterns, or need consistent mobile-friendly control rows.
---

# Safeviate Card Layout Standard

Use this skill to keep card-heavy Safeviate screens visually consistent and easy to scan.

## Core Pattern

1. Start with the shared card shell.
2. Use `Card` and `CardContent` as the outer structure.
3. Prefer `shadow-none`, `border`, and `overflow-hidden` on dense shells.
4. Put titles, descriptions, and action rows in the shared header layer instead of inventing a page-specific header card.
5. Reuse `MainPageHeader` for section pages that already have a top bar title.
6. Reuse `CardControlHeader` when a card needs contextual actions, navigation, or a compact supporting strip.
7. Reuse the shared sizing constants from `src/components/page-header.tsx` instead of redefining button and control classes.

## Layout Rules

- Keep the hierarchy shallow: header band, then content, then controls.
- Use a header band for the first visible row, not a large empty padded block.
- Keep primary actions visually grouped and aligned to the right on desktop.
- On mobile, collapse controls into stacked or full-width rows when needed.
- Prefer concise helper text over repeated page titles.
- Keep row chrome consistent: same border language, same spacing rhythm, same action placement.

## Anti-Patterns

- Do not build a one-off card shell when a shared pattern already exists.
- Do not duplicate the same page title in both the top bar and the in-card header.
- Do not add extra wrappers that only create vertical space.
- Do not mix radically different border radii, shadows, or control heights inside the same flow.
- Do not optimize a single page in isolation if the pattern should apply across the app.

## Reference Surfaces

- Check `src/components/page-header.tsx` for shared header, band, and compact control classes.
- Check `src/app/(app)/quality/coherence-matrix/page.tsx` for the strongest in-repo example of dense card structure and control layout.
- When in doubt, match the coherence matrix specimen before making a new visual pattern.

## Verify

- Compare the new screen against neighboring card-heavy pages.
- Check desktop and mobile behavior.
- Make sure the layout still feels compact on data-dense screens and does not grow the header unexpectedly.
