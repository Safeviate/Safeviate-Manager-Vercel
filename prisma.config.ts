import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

if (!process.env.DATABASE_URL && process.env.NEON2_POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.NEON2_POSTGRES_URL;
}

if (!process.env.DATABASE_URL_UNPOOLED && process.env.POSTGRES_URL_NON_POOLING) {
  process.env.DATABASE_URL_UNPOOLED = process.env.POSTGRES_URL_NON_POOLING;
}

if (!process.env.DATABASE_URL_UNPOOLED && process.env.NEON2_POSTGRES_URL_NON_POOLING) {
  process.env.DATABASE_URL_UNPOOLED = process.env.NEON2_POSTGRES_URL_NON_POOLING;
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
