import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) {
  console.log('O arquivo .env já existe e foi preservado.');
} else {
  const password = randomBytes(24).toString('hex');
  const secret = randomBytes(48).toString('hex');
  const token = randomBytes(24).toString('hex');
  writeFileSync(
    '.env',
    `DATABASE_URL=postgresql://estoque:${password}@127.0.0.1:5433/estoque\nPOSTGRES_PASSWORD=${password}\nBETTER_AUTH_SECRET=${secret}\nAPP_URL=http://localhost:5173\nPORT=3001\nHOST=127.0.0.1\nSMTP_HOST=127.0.0.1\nSMTP_PORT=1025\nMAIL_FROM=Obra Estoque <noreply@estoque.local>\nSETUP_TOKEN=${token}\n`,
    { mode: 0o600 },
  );
  console.log(
    'Configuração local criada. Consulte SETUP_TOKEN no .env para cadastrar o primeiro administrador.',
  );
}
