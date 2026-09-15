import { createApp } from './app';
import { db } from './database';
import { env } from './config';
const app = createApp();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, async () => {
    await app.close();
    await db.$disconnect();
    process.exit(0);
  });
await app.listen({ host: env.HOST, port: env.PORT });
