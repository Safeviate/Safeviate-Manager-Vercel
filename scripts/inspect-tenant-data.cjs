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

function printUsage() {
  console.log(`
Usage:
  npm run db:inspect:tenant -- --email user@example.com
  npm run db:inspect:tenant -- --tenant safeviate-qsm
  npm run db:inspect:tenant -- --email user@example.com --tenant safeviate-qsm
  npm run db:inspect:tenant -- --tenant safeviate --prod

What it shows:
  - matching user rows
  - matching tenant row
  - tenant config summary
  - quality audit summary
  - corrective action plan summary
  - safety report summary
`);
}

function summarizeConfig(data) {
  const areas = Array.isArray(data?.['audit-areas']) ? data['audit-areas'] : [];
  const scheduleItems = Array.isArray(data?.['audit-schedule-items']) ? data['audit-schedule-items'] : [];
  const auditTemplates = Array.isArray(data?.['quality-audit-templates']) ? data['quality-audit-templates'] : [];
  const gapTemplates = Array.isArray(data?.['quality-gap-analysis-templates']) ? data['quality-gap-analysis-templates'] : [];

  return {
    auditAreaCount: areas.length,
    auditAreas: areas,
    auditScheduleItemCount: scheduleItems.length,
    auditSchedulePreview: scheduleItems.slice(0, 5),
    qualityAuditTemplateCount: auditTemplates.length,
    gapAnalysisTemplateCount: gapTemplates.length,
  };
}

async function main() {
  const email = getArgValue('--email');
  const tenant = getArgValue('--tenant');

  if (!email && !tenant) {
    printUsage();
    process.exit(1);
  }

  const connectionString = loadEnv();
  const pool = new Pool({ connectionString });

  try {
    const userRows = email
      ? (await pool.query(
          `select id, email, tenant_id, first_name, last_name, role, created_at, updated_at
           from users
           where lower(email) = lower($1)
           order by email`,
          [email]
        )).rows
      : [];

    const derivedTenantId = tenant || userRows[0]?.tenant_id || null;

    if (!derivedTenantId) {
      console.log(JSON.stringify({ users: userRows, message: 'No tenant could be resolved from the provided input.' }, null, 2));
      return;
    }

    const tenantRow = (
      await pool.query(
        `select id, name, created_at, updated_at
         from tenants
         where id = $1
         limit 1`,
        [derivedTenantId]
      )
    ).rows[0] || null;

    const tenantConfigRow = (
      await pool.query(
        `select tenant_id, data, created_at, updated_at
         from tenant_configs
         where tenant_id = $1
         limit 1`,
        [derivedTenantId]
      )
    ).rows[0] || null;

    const qualityAuditRows = (
      await pool.query(
        `select
           id,
           data->>'auditNumber' as audit_number,
           data->>'targetName' as target_name,
           data->>'status' as status,
           data->>'analysisType' as analysis_type,
           created_at,
           updated_at
         from quality_audits
         where tenant_id = $1
         order by created_at desc
         limit 10`,
        [derivedTenantId]
      )
    ).rows;

    const capRows = (
      await pool.query(
        `select
           id,
           data->>'title' as title,
           data->>'status' as status,
           data->>'auditId' as audit_id,
           data->>'findingId' as finding_id,
           created_at,
           updated_at
         from corrective_action_plans
         where tenant_id = $1
         order by created_at desc
         limit 10`,
        [derivedTenantId]
      )
    ).rows;

    const safetyReportRows = (
      await pool.query(
        `select
           id,
           data->>'reportNumber' as report_number,
           data->>'reportTitle' as report_title,
           data->>'status' as status,
           created_at,
           updated_at
         from safety_reports
         where tenant_id = $1
         order by created_at desc
         limit 10`,
        [derivedTenantId]
      )
    ).rows;

    console.log(
      JSON.stringify(
        {
          lookup: { email: email || null, tenantId: derivedTenantId },
          users: userRows,
          tenant: tenantRow,
          tenantConfig: tenantConfigRow
            ? {
                tenantId: tenantConfigRow.tenant_id,
                createdAt: tenantConfigRow.created_at,
                updatedAt: tenantConfigRow.updated_at,
                summary: summarizeConfig(tenantConfigRow.data),
              }
            : null,
          qualityAudits: {
            countShown: qualityAuditRows.length,
            rows: qualityAuditRows,
          },
          correctiveActionPlans: {
            countShown: capRows.length,
            rows: capRows,
          },
          safetyReports: {
            countShown: safetyReportRows.length,
            rows: safetyReportRows,
          },
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
