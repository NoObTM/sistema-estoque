import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
config({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
  quiet: true,
});
export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    APP_URL: z.url(),
    PORT: z.coerce.number().default(3001),
    HOST: z.string().default('127.0.0.1'),
    SMTP_HOST: z.string().default('127.0.0.1'),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    MAIL_FROM: z.string().default('Obra Estoque <noreply@estoque.local>'),
    SETUP_TOKEN: z.string().min(24),
  })
  .parse(process.env);
