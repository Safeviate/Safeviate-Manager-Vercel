---
name: compact-card-band-headers
description: Standardize Safeviate single-line card header bands at 38px with tenant-configurable background and foreground colors. Use when creating or revising card headers, dashboard panels, summary cards, or dense list cards.
---

# Compact Card Band Headers

Use the shared card header classes in `src/components/page-header.tsx`.

## Default

- A standard card header has a minimum height of `38px`.
- Use `CARD_COMPACT_HEADER_BAND_CLASS` for a single-line title with an optional badge or action.
- It applies the tenant's `--card-header-band-background` and `--card-header-band-foreground` values.

## Expanded Headers

- Use `CARD_HEADER_BAND_CLASS` when the header has a description, multiple controls, or must wrap on narrow screens.
- Keep the 38px minimum but allow the header to grow. Do not force a fixed height when content can wrap.

## Rules

- Keep title text bold and readable; use `text-[13px] font-bold` for compact panel titles.
- Place a count badge or one primary action on the right.
- Do not hard-code `bg-white`, `bg-muted`, or a text color on a standard card band.
- Preserve explicit warning, destructive, and success headers; they communicate status rather than tenant formatting.

## Verification

- Confirm the header uses the tenant Page Format card-band colors.
- Check narrow screens for wrapping without clipped controls.
