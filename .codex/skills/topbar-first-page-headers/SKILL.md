---
name: topbar-first-page-headers
description: Use when a Safeviate page already has a global top bar title and the in-card header should be removed or reduced to a slim supporting strip for descriptions and actions. Applies when refactoring shared page headers across the app.
---

# Topbar First Page Headers

## Workflow

1. Check whether the app top bar already shows the screen title.
2. If it does, remove the duplicated title from the page card header.
3. Keep only secondary description text and in-page action controls when they add real value.
4. Prefer a slim supporting strip over a full header card.
5. Put the behavior in a shared header component so it applies across the app.
6. Use the page header only when the title, description, or actions need to live inside the card for a specific workflow.

## Guardrails

- Do not duplicate the same title in both the top bar and the page header.
- Preserve action rows, filters, and other controls that belong to the page body.
- Keep the shared header compact enough that map-first and data-dense pages get the most usable space.
- If a screen needs extra context, add that context to the top bar or to a slim supporting strip, not both.
