const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const root = process.cwd();
const composeFile = path.join(root, 'docker-compose.local.yml');
const envPath = path.join(root, '.env.local');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const localDatabaseUrl = 'postgresql://safeviate:safeviate-local@localhost:5433/safeviate';
const env = {
  ...process.env,
  // Always force the schema command to the disposable local container. This
  // prevents an existing Azure .env.local value from being touched by setup.
  DATABASE_URL: localDatabaseUrl,
  DATABASE_URL_UNPOOLED: localDatabaseUrl,
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: 'inherit',
    shell: false,
    ...options,
  });
  if (result.error) {
    if (result.error.code === 'ENOENT') {
      console.error(`Could not start "${command}". Install Docker Desktop, restart PowerShell so PATH refreshes, or set DOCKER_CLI to the full path of docker.exe.`);
    }
    throw result.error;
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

function resolveDockerCommand() {
  if (process.platform !== 'win32') return 'docker';

  const candidates = [
    process.env.DOCKER_CLI,
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Docker', 'Docker', 'resources', 'bin', 'docker.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin', 'docker.exe'),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return 'docker';
}

const action = process.argv[2] || 'setup';
const composeArgs = ['compose', '-f', composeFile];
const dockerCommand = resolveDockerCommand();

async function ensureLocalTenant() {
  const pool = new Pool({ connectionString: localDatabaseUrl });
  try {
    await pool.query(
      `INSERT INTO tenants (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      ['safeviate', 'Safeviate Demo'],
    );
  } finally {
    await pool.end();
  }
}

if (action === 'up') {
  run(dockerCommand, [...composeArgs, 'up', '-d', '--wait']);
} else if (action === 'down') {
  run(dockerCommand, [...composeArgs, 'down']);
} else if (action === 'reset') {
  run(dockerCommand, [...composeArgs, 'down', '-v']);
} else if (action === 'setup') {
  run(dockerCommand, [...composeArgs, 'up', '-d', '--wait']);
  run(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['prisma', 'db', 'push'],
    process.platform === 'win32' ? { shell: true } : undefined,
  );
  ensureLocalTenant()
    .then(() => {
      console.log('\nLocal demo database is ready. Start the app with: npm.cmd run dev');
      console.log('Login fallback in development: barry@safeviate.com / SafeviateTemp2026!');
    })
    .catch((error) => {
      console.error('Could not create the local Safeviate tenant.', error);
      process.exit(1);
    });
} else {
  console.error(`Unknown action: ${action}. Use up, down, reset, or setup.`);
  process.exit(1);
}
