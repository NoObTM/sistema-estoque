import { PrismaClient, Prisma } from '../generated/client/client';
Prisma.Decimal.set({ precision: 40, rounding: Prisma.Decimal.ROUND_HALF_UP });
import { PrismaPg } from '@prisma/adapter-pg';
export { Prisma } from '../generated/client/client';
export type { PrismaClient } from '../generated/client/client';
export function createDatabase(url: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}
