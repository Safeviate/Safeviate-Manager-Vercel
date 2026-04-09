const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const isProd = process.argv.includes('--prod');
const envFile = isProd ? '.env.production' : '.env.local';
const envPath = path.join(process.cwd(), envFile);

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (isProd) {
  console.warn(`[prisma-studio] ${envFile} not found. Using existing process environment instead.`);
} else {
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

if (process.env.DATABASE_URL_UNPOOLED) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_UNPOOLED;
}

if (!process.env.DATABASE_URL) {
  console.error(`DATABASE_URL is missing after loading ${envFile}.`);
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['prisma', 'studio'],
  {
    stdio: 'inherit',
    env: process.env,
  }
);

process.exit(result.status ?? 1);
