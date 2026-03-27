import { menuConfig } from '@/lib/menu-config';

type BackConfig = {
  text: string;
  href: string | null;
};

const explicitBackTargets: Array<{ prefix: string; href: string; text: string }> = [
  { prefix: '/safety/new-report', href: '/safety/safety-reports', text: 'Back to Safety Reports' },
  { prefix: '/safety/safety-reports/new', href: '/safety/safety-reports', text: 'Back to Safety Reports' },
  { prefix: '/operations/bookings', href: '/bookings/schedule', text: 'Back to Daily Schedule' },
  { prefix: '/operations/booking-history', href: '/operations/booking-history', text: 'Back to Booking History' },
];

const menuBackTargets = menuConfig.flatMap((item) =>
  (item.subItems || []).map((subItem) => ({
    href: subItem.href,
    text: `Back to ${subItem.label}`,
  }))
);

export function getBackConfig(pathname: string): BackConfig {
  const explicitMatch = explicitBackTargets
    .filter((target) => pathname.startsWith(target.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (explicitMatch) {
    return { href: explicitMatch.href, text: explicitMatch.text };
  }

  const menuMatch = menuBackTargets
    .filter((target) => pathname.startsWith(target.href) && pathname !== target.href)
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (menuMatch) {
    return menuMatch;
  }

  return { href: null, text: 'Back' };
}
