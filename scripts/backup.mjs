import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, createReadStream, mkdirSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { once } from 'node:events';
mkdirSync('backups', { recursive: true });
const stamp = new Date().toISOString().replace(/[^0-9]/g, '');
const filename = `backups/estoque-${stamp}.dump`;
const backup = spawn(
  'docker',
  [
    'compose',
    'exec',
    '-T',
    'postgres',
    'pg_dump',
    '-U',
    'estoque',
    '-Fc',
    'estoque',
  ],
  { stdio: ['ignore', 'pipe', 'inherit'] },
);
const backupDone = once(backup, 'close');
await pipeline(backup.stdout, createWriteStream(filename));
if ((await backupDone)[0] !== 0) throw new Error('Falha no backup.');
console.log(`Backup criado: ${filename}`);
if (process.argv.includes('--verify')) {
  const database = `estoque_restore_${stamp}`;
  const created = spawnSync(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'createdb',
      '-U',
      'estoque',
      database,
    ],
    { stdio: 'inherit' },
  );
  if (created.status !== 0)
    throw new Error('Falha ao criar banco de verificação.');
  const restore = spawn(
    'docker',
    [
      'compose',
      'exec',
      '-T',
      'postgres',
      'pg_restore',
      '-U',
      'estoque',
      '--exit-on-error',
      '-d',
      database,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const restoreDone = once(restore, 'close');
  await pipeline(createReadStream(filename), restore.stdin);
  if ((await restoreDone)[0] !== 0)
    throw new Error('Falha no teste de restauração.');
  console.log(
    `Restauração validada no banco isolado ${database}. O banco operacional foi preservado.`,
  );
}
