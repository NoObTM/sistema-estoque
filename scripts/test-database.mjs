import { Client } from 'pg';
import { spawnSync } from 'node:child_process';
const url = new URL(process.env.DATABASE_URL);
const client = new Client({ connectionString: url.toString() });
await client.connect();
if (
  !(
    await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'estoque_test'",
    )
  ).rowCount
)
  await client.query('CREATE DATABASE estoque_test');
await client.end();
url.pathname = '/estoque_test';
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  APP_URL: 'http://127.0.0.1:4173',
  PORT: '3002',
  API_TARGET: 'http://127.0.0.1:3002',
  TEST_DATABASE: 'true',
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(args) {
  const result = spawnSync(npm, args, {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(['run', 'db:migrate']);
run(
  process.argv.includes('--e2e')
    ? ['exec', '--', 'playwright', 'test']
    : [
        'exec',
        '--',
        'vitest',
        'run',
        '--config',
        'vitest.integration.config.ts',
      ],
);
