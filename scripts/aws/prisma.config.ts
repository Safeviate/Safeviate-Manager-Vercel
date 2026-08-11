import { defineConfig, env } from 'prisma/config';

// Copied into the Elastic Beanstalk release package so Prisma can run there
// without importing the complete application source tree.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DATABASE_URL_UNPOOLED') },
});
