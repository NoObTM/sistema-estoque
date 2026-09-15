import { createHash } from 'node:crypto';
import { Prisma } from '@estoque/database';
import { db } from '../database';
import { actorFromDatabase, type Actor } from './access';
import { ensure } from './errors';

// Uma construtora: bloqueio de escrita por operação, mantido somente durante a transação.
// Inclui cadastros e permissões para evitar mudanças de autorização durante confirmação.
export async function write<T>(
  userId: string,
  action: string,
  key: string,
  payload: unknown,
  execute: (tx: Prisma.TransactionClient, actor: Actor) => Promise<T>,
): Promise<T> {
  ensure(
    /^[\w-]{16,100}$/.test(key),
    400,
    'Envie uma chave de confirmação válida.',
  );
  const id = `${userId}:${action}:${key}`;
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(624183)`;
      const actor = await actorFromDatabase(tx, userId);
      const hash = createHash('sha256')
        .update(
          JSON.stringify({
            payload,
            role: actor.role,
            locations: [...actor.locationIds].sort(),
          }),
        )
        .digest('hex');
      const previous = await tx.idempotency.findUnique({ where: { id } });
      if (previous) {
        ensure(
          previous.hash === hash,
          409,
          'Esta chave já foi usada com outros dados.',
        );
        return previous.result as T;
      }
      const result = await execute(tx, actor);
      const json = JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue;
      await tx.idempotency.create({ data: { id, hash, result: json } });
      await tx.audit.create({
        data: {
          actorId: actor.id,
          action,
          entityId:
            typeof result === 'object' && result && 'id' in result
              ? String(result.id)
              : action,
          details: { action },
        },
      });
      return result;
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
