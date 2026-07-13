import { PrismaClient } from './src/generated/prisma/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const emails = [
      'barry@safeviate.com',
      'qsm@safeflyexpress.com',
      'barry@safeviateqsm.com',
      'qsm@safeviateqsm.com'
    ];

    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, tenantId: true, firstName: true, lastName: true, role: true },
      orderBy: { email: 'asc' },
    });

    const configs = await prisma.tenantConfig.findMany({
      where: { tenantId: { in: ['safeviate', 'safeviate-qsm', 'safeviateqsm', 'safeflyexpress'] } },
      select: { tenantId: true, data: true },
      orderBy: { tenantId: 'asc' },
    });

    const summarize = (data) => {
      const areas = Array.isArray(data?.['audit-areas']) ? data['audit-areas'] : [];
      const items = Array.isArray(data?.['audit-schedule-items']) ? data['audit-schedule-items'] : [];
      return {
        areaCount: areas.length,
        firstAreas: areas.slice(0, 8),
        itemCount: items.length,
        firstItems: items.slice(0, 3).map((item) => ({ area: item.area, month: item.month, year: item.year, status: item.status })),
      };
    };

    console.log(JSON.stringify({ users, configs: configs.map((c) => ({ tenantId: c.tenantId, summary: summarize(c.data) })) }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});