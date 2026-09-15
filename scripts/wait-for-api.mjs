import { setTimeout } from 'node:timers/promises';

const target = process.env.API_TARGET ?? 'http://127.0.0.1:3001';
const deadline = Date.now() + 60_000;
let ready = false;

console.log('Aguardando a API e o banco de dados ficarem disponíveis...');
while (Date.now() < deadline) {
  try {
    const response = await fetch(new URL('/api/health', target), {
      signal: AbortSignal.timeout(Math.min(2_000, deadline - Date.now())),
    });
    if (response.ok && (await response.json()).status === 'ok') {
      ready = true;
      break;
    }
  } catch {
    // A API pode ainda estar iniciando ou aguardando conexão com o banco.
  }
  await setTimeout(500);
}

if (ready) {
  console.log('API pronta. Iniciando o frontend.');
} else {
  console.error(
    'A API não ficou disponível em 60 segundos. Confira os logs de API e se o PostgreSQL está ativo (npm run services:up).',
  );
  process.exitCode = 1;
}
