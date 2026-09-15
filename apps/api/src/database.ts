import { createDatabase } from '@estoque/database';
import { env } from './config';
export const db = createDatabase(env.DATABASE_URL);
