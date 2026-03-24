# Electronic Note: UI Source of Truth (Layout & Cards)

**Date**: March 2024
**Reference Pages**: 
- `src/app/(app)/assets/aircraft/[id]/page.tsx`
- `src/app/(app)/quality/coherence-matrix/page.tsx`
- `src/components/page-header.tsx`

This document serves as the absolute "Source of Truth" for the visual layout, card structure, and navigation patterns across the Safeviate Manager application. When building or refactoring pages, adhere to these standards.

## 1. Global App Header & Navigation
- **Sticky Top Bar**: The `AppHeader` component is `sticky top-0 z-20`.
- **Primary Page Action (The "Back" Button)**: 
    - When on a detail page, the sidebar trigger is replaced by a "Back" button in the top panel.
    - **Styling**: `variant="outline"`, `size="sm"`, `rounded-md`, `font-black uppercase text-sm`.
    - **Logic**: Must explicitly redirect to the main module list (e.g., "Back to All Aircraft" -> `/assets/aircraft`).
    - **Context**: The page title is hidden when the Back button is active.

## 2. Card Layout & Sticky Headers
To maximize screen real estate and maintain context during scroll:
- **Card Container**: Use `flex-1 overflow-hidden flex flex-col`.
- **Sticky Header Section**: 
    - Wrap the `CardHeader` and the `TabsList` row in a `sticky top-0 z-30 bg-card` container.
    - This ensures the Identity (Title/ID) and Navigation (Tabs) stay locked at the top while the content scrolls underneath.
- **Main Page Header (`MainPageHeader`)**:
    - **Layout**: `flex flex-col lg:flex-row lg:items-center lg:justify-between`. Use the `lg` breakpoint to keep the title above actions on most mobile devices.
    - **Title**: `text-xl sm:text-2xl font-black uppercase truncate font-headline`.
    - **Description**: `text-xs sm:text-sm font-medium text-muted-foreground`.
    - **Actions Area**: `flex flex-wrap items-center gap-2 w-full lg:w-auto mt-2 lg:mt-0`.

## 3. Card Interior Tab Navigation
- **Styling**: `border-b bg-muted/5 px-6 py-2 shrink-0`.
- **Tabs Container (`TabsList`)**: 
    - Classes: `bg-transparent h-auto p-0 gap-2 border-b-0 justify-start overflow-x-auto no-scrollbar w-full flex items-center`.
- **Tab Triggers (`TabsTrigger`)**:
    - Classes: `rounded-full px-6 py-2 border data-[state=active]:bg-emerald-700 data-[state=active]:text-white font-bold text-[10px] uppercase transition-all shrink-0`.
    - **Critical**: Always include `shrink-0` to enable horizontal scrolling on mobile.

## 4. Data Presentation (Grids & Tables)
- **Overview Grids**: Use `grid grid-cols-1 md:grid-cols-3 gap-12`.
- **Detail Items**:
    - Label: `text-[10px] font-black uppercase tracking-widest text-muted-foreground`.
    - Value: `text-sm font-bold text-foreground`.
- **Tables**:
    - Header: `bg-muted/30 sticky top-0 z-10`.
    - Column Titles: `text-[10px] uppercase font-bold tracking-wider`.
    - Row Content: `text-sm font-medium` or `font-mono text-xs font-bold` for codes.

## 5. Buttons & Controls
- **Primary Actions**: `bg-emerald-700 hover:bg-emerald-800 text-white shadow-md font-black uppercase text-xs h-9 px-6`.
- **Secondary/Header Actions**: `variant="outline" border-slate-300 uppercase text-xs font-black h-9 px-4`.

## 6. Mobile Optimization
- **Horizontal Scrolling**: Mandatory for all tab rows using `overflow-x-auto no-scrollbar`.
- **Header Actions**: On mobile, actions should wrap naturally (`flex-wrap`) and occupy full width when stacked (`w-full`).
- **Vertical Space**: Minimize padding-top (`pt-0`) on main cards to maximize visibility.
- **Scrollbars**: Hide decorative scrollbars on main dashboards using `no-scrollbar`.
