import 'dotenv/config';
import { execSync } from 'node:child_process';

execSync('npx drizzle-kit push', { stdio: 'inherit' });
