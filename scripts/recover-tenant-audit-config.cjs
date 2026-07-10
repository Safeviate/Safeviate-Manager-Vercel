const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

function loadEnv() {
  const isProd = process.argv.includes('--prod');
  const envFile = isProd ? '.env.production' : '.env.local';
  const envPath = path.join(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }

  if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
    process.env.DATABASE_URL = process.env.POSTGRES_URL;
  }

  if (!process.env.DATABASE_URL_UNPOOLED && process.env.POSTGRES_URL_NON_POOLING) {
    process.env.DATABASE_URL_UNPOOLED = process.env.POSTGRES_URL_NON_POOLING;
  }

  if (!process.env.DATABASE_URL_UNPOOLED && process.env.NEON2_DATABASE_URL_UNPOOLED) {
    process.env.DATABASE_URL_UNPOOLED = process.env.NEON2_DATABASE_URL_UNPOOLED;
  }

  if (!process.env.DATABASE_URL_UNPOOLED && process.env.NEON2_POSTGRES_URL_NON_POOLING) {
    process.env.DATABASE_URL_UNPOOLED = process.env.NEON2_POSTGRES_URL_NON_POOLING;
  }

  const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL or DATABASE_URL_UNPOOLED is missing.');
    process.exit(1);
  }

  return connectionString;
}

function getArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

function normalizeTitle(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function toMonthLabel(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getUTCMonth()] ?? null;
}

function sortScheduleItems(items) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return [...items].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const monthDiff = months.indexOf(a.month) - months.indexOf(b.month);
    if (monthDiff !== 0) return monthDiff;
    return a.area.localeCompare(b.area);
  });
}

function printUsage() {
  console.log(`
Usage:
  npm run db:recover:tenant-audit-config -- --tenant safeviate-qsm
  npm run db:recover:tenant-audit-config -- --tenant safeviate-qsm --apply
  npm run db:recover:tenant-audit-config -- --tenant safeviate-qsm --prod
  npm run db:recover:tenant-audit-config -- --tenant safeviate-qsm --prod --apply

What it does:
  - rebuilds audit areas from the tenant's own audit records
  - rebuilds audit schedule items from the tenant's own audit dates/statuses
  - rebuilds quality audit templates from embedded audit template snapshots
  - never reads runtime data from another tenant

By default it runs in preview mode and does not write changes.
`);
}

async function main() {
  const tenantId = getArgValue('--tenant');
  const shouldApply = process.argv.includes('--apply');

  if (!tenantId) {
    printUsage();
    process.exit(1);
  }

  const connectionString = loadEnv();
  const pool = new Pool({ connectionString });

  try {
    const cfgRow = (
      await pool.query(`select data from tenant_configs where tenant_id = $1 limit 1`, [tenantId])
    ).rows[0];
    const config = cfgRow?.data || {};

    const existingTemplates = Array.isArray(config['quality-audit-templates']) ? config['quality-audit-templates'] : [];
    const existingAreas = Array.isArray(config['audit-areas']) ? config['audit-areas'] : [];
    const existingItems = Array.isArray(config['audit-schedule-items']) ? config['audit-schedule-items'] : [];

    const auditRows = (
      await pool.query(`select id, data, created_at from quality_audits where tenant_id = $1 order by created_at desc`, [tenantId])
    ).rows;

    const templateByTitle = new Map();
    for (const template of existingTemplates) {
      const title = normalizeTitle(template?.title);
      if (title) {
        templateByTitle.set(title.toLowerCase(), { ...template, title });
      }
    }

    const recoveredAreas = new Set(
      existingAreas.filter((value) => typeof value === 'string' && value.trim()).map((value) => value.trim())
    );

    const scheduleItemsByKey = new Map();
    for (const item of existingItems) {
      if (!item?.area || !item?.month || !item?.year) continue;
      scheduleItemsByKey.set(`${item.area}::${item.month}::${item.year}`, item);
    }

    for (const row of auditRows) {
      const data = row.data || {};
      const template = data.template;
      const title = normalizeTitle(template?.title || data.title);
      if (title) {
        recoveredAreas.add(title);
      }

      if (template && title && !templateByTitle.has(title.toLowerCase())) {
        templateByTitle.set(title.toLowerCase(), {
          ...template,
          id: template.id || data.templateId || data.id,
          title,
        });
      }

      const auditDate = data.auditDate || row.created_at;
      const month = toMonthLabel(auditDate);
      const date = new Date(auditDate);
      const year = Number.isNaN(date.getTime()) ? new Date(row.created_at).getUTCFullYear() : date.getUTCFullYear();
      const status = typeof data.status === "string" ? data.status : 'Scheduled';
      if (title && month && year && ['Scheduled', 'Completed', 'Pending', 'Not Scheduled'].includes(status)) {
        const key = `${title}::${month}::${year}`;
        if (!scheduleItemsByKey.has(key)) {
          scheduleItemsByKey.set(key, {
            id: `${row.id}:${month}`,
            area: title,
            month,
            year,
            status,
          });
        }
      }
    }

    const nextTemplates = Array.from(templateByTitle.values()).sort((a, b) => a.title.localeCompare(b.title));
    const nextAreas = Array.from(recoveredAreas).sort((a, b) => a.localeCompare(b));
    const nextItems = sortScheduleItems(Array.from(scheduleItemsByKey.values()));

    const summary = {
      tenantId,
      previewOnly: !shouldApply,
      current: {
        auditAreaCount: existingAreas.length,
        qualityAuditTemplateCount: existingTemplates.length,
        auditScheduleItemCount: existingItems.length,
      },
      recovered: {
        auditAreaCount: nextAreas.length,
        auditAreas: nextAreas,
        qualityAuditTemplateCount: nextTemplates.length,
        qualityAuditTemplateTitles: nextTemplates.map((item) => item.title),
        auditScheduleItemCount: nextItems.length,
        auditSchedulePreview: nextItems.slice(0, 10),
      },
    };

    if (!shouldApply) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    const nextConfig = {
      ...config,
      'audit-areas': nextAreas,
      'audit-schedule-items': nextItems,
      'quality-audit-templates': nextTemplates,
    };

    await pool.query(
      `insert into tenant_configs (tenant_id, data, created_at, updated_at)
       values ($1, $2::jsonb, now(), now())
       on conflict (tenant_id)
       do update set data = excluded.data, updated_at = now()`,
      [tenantId, JSON.stringify(nextConfig)]
    );

    console.log(
      JSON.stringify(
        {
          ...summary,
          applied: true,
        },
        null,
        2
      )
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
