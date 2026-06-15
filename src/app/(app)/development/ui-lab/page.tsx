import Link from 'next/link';
import { MainPageHeader, HEADER_SECONDARY_BUTTON_CLASS } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const MODULE_FLOW_GROUPS = [
  {
    title: 'Shared Identity Layer',
    items: ['NextAuth session', 'UserProfileProvider', '/api/me', 'Permissions / route gating', 'Tenant resolution'],
  },
  {
    title: 'Branding & Configuration',
    items: ['Server bootstrap in layout.tsx', '/api/tenant-config', 'ThemeProvider', 'Page Format', 'Feature / visibility switches'],
  },
  {
    title: 'Core Operations',
    items: ['Dashboard', 'Bookings', 'Schedule Data', 'Aircraft / Vehicles', 'Active Flight / Meetings / Weather'],
  },
  {
    title: 'Assurance & Training',
    items: ['Safety', 'Quality', 'Training', 'Student Progress', 'Audit / Risk / Reports'],
  },
  {
    title: 'Developer Observability',
    items: ['Simulation Lab', 'Route telemetry', 'Usage Estimator', 'Diagnostics', 'Performance roadmap'],
  },
];

const RECIPE_CARDS = [
  {
    title: 'Compact card shell',
    detail: 'Use a slim header band, tight border radius, and shallow nesting so dense data still feels intentional.',
  },
  {
    title: 'Control-row rhythm',
    detail: 'Keep buttons and tabs in one line on desktop, then let the row wrap only when the viewport forces it.',
  },
  {
    title: 'Information density',
    detail: 'Keep useful whitespace, but avoid the oversized empty zones that make a page feel like a placeholder.',
  },
];

const EXPERIMENT_LINKS = [
  { href: '/quality/coherence-matrix', label: 'Coherence Matrix' },
  { href: '/quality/task-tracker', label: 'Task Tracker' },
  { href: '/assets/checklists', label: 'Asset Checklists' },
];

export default function DevelopmentUiLabPage() {
  return (
    <div className="grid gap-6">
      <MainPageHeader
        title="UI Lab"
        description="A scratchpad for Safeviate layout experiments before they land on production pages."
        actions={
          <>
            {EXPERIMENT_LINKS.map((link) => (
              <Button key={link.href} asChild variant="outline" className={HEADER_SECONDARY_BUTTON_CLASS}>
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </>
        }
      />

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">
            Layout Recipes
          </h3>
          <p className="text-xs font-medium text-muted-foreground">
            Prototype the small structural pieces that make a Safeviate page feel compact, modern, and practical.
          </p>
        </div>

        <Card className="overflow-hidden border shadow-none">
          <CardContent className="space-y-4 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {RECIPE_CARDS.map((card) => (
                <div key={card.title} className="rounded-sm border bg-background px-4 py-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground">{card.title}</p>
                  <p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{card.detail}</p>
                </div>
              ))}
            </div>

            <div className="rounded-sm border bg-muted/10 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border pb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    Sample Control Band
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    Use this row to test compact buttons, chips, and action density.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="h-8 rounded-sm px-3 text-[9px] font-black uppercase tracking-[0.08em]">
                    Primary
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-sm px-3 text-[9px] font-black uppercase tracking-[0.08em]">
                    Secondary
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 rounded-sm px-3 text-[9px] font-black uppercase tracking-[0.08em]">
                    Compact
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  'Maintain consistent border radii',
                  'Keep label weights readable',
                  'Avoid unnecessary vertical padding',
                ].map((note) => (
                  <div key={note} className="rounded-sm border bg-background px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Design note</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">
            Module Flow Diagram
          </h3>
          <p className="text-xs font-medium text-muted-foreground">
            This mirrors the Development home layout so new experiments can live in a familiar structure.
          </p>
        </div>

        <Card className="overflow-hidden border shadow-none">
          <CardContent className="p-5">
            <div className="grid gap-3 xl:grid-cols-5">
              {MODULE_FLOW_GROUPS.map((group, index) => (
                <div key={group.title} className="rounded-sm border bg-background px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.14em] text-foreground">
                      {group.title}
                    </p>
                    {index < MODULE_FLOW_GROUPS.length - 1 ? (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                        -&gt;
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item}
                        className="rounded-md border bg-muted/10 px-3 py-2 text-[11px] font-semibold text-muted-foreground"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-primary">
            Experiment Library
          </h3>
          <p className="text-xs font-medium text-muted-foreground">
            Shortcuts to the dense screens you can use as real-world references while prototyping.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {EXPERIMENT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-sm border bg-background px-4 py-4 transition-colors hover:bg-muted/50"
            >
              <p className="text-sm font-semibold text-foreground">{link.label}</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Open page
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
