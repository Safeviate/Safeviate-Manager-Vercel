---
name: responsive-control-rows
description: Keep desktop control rows and mobile button stacks consistent in Safeviate pages. Use when editing card-heavy screens with header controls, dropdown selectors, tab strips, ERP-style action bars, or any page that should keep a wide desktop layout but collapse cleanly on mobile.
---

# Responsive Control Rows

Use this skill when a page has a strong desktop control row but needs a cleaner mobile presentation.

## Core Pattern

1. Keep the desktop layout unchanged unless the user asks for a redesign.
2. On mobile, stack controls vertically instead of forcing a cramped row.
3. Make primary buttons full-width on mobile when they are the main call to action.
4. Keep selector buttons and dropdown triggers readable, compact, and easy to tap.
5. Reuse shared helpers like `ResponsiveTabRow`, `OrganizationTabsRow`, `useIsMobile`, and button classes from `src/components/page-header.tsx` instead of building a one-off pattern.
6. When a page has multiple desktop control rows, use the tab strip as the row-height reference and keep the other rows at the same shell height.

## What To Match

- `src/app/(app)/operations/emergency-response/page.tsx` for an ERP-style desktop row that becomes a stacked mobile control area.
- `src/components/responsive-tab-row.tsx` for a reusable control strip with mobile fallback.
- `src/app/(app)/admin/accounting/page.tsx` and `src/app/(app)/admin/external/page.tsx` for existing mobile button and selector patterns.

## Mobile Rules

- If a control is the only obvious action, let it fill the width on mobile.
- If a page has a selector plus a primary action, stack them vertically with the selector first.
- Keep tabs and section selectors easy to scan; do not hide them behind extra nesting unless the page already does that on mobile.
- Preserve desktop spacing and alignment; the mobile treatment should be a fallback, not a rewrite.
- When a desktop header has multiple rows, make the tab row the visual benchmark and match the other rows to its minimum height instead of letting each row size itself independently.

## Implementation Check

1. Verify the page still works on desktop first.
2. Check the mobile viewport for stacked controls, width, and tap targets.
3. Make the smallest class or wrapper change that achieves the behavior.
4. If a desktop header has multiple rows, confirm their heights read as a single balanced system.
