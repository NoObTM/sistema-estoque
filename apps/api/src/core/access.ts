import type { Prisma } from '@estoque/database';
import type { Role } from '@estoque/contracts/schemas';
import { ensure } from './errors';
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  locationIds: string[];
}
export const operators: Role[] = ['ADMIN', 'MANAGER', 'KEEPER'];
export const managers: Role[] = ['ADMIN', 'MANAGER'];
export async function actorFromDatabase(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<Actor> {
  const user = await tx.user.findUnique({
    where: { id },
    include: { memberships: true },
  });
  ensure(user?.active, 401, 'Acesso encerrado. Entre novamente.');
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    locationIds: user.memberships.map((m) => m.locationId),
  };
}
export function authorize(
  actor: Actor,
  locationId?: string,
  allowed?: readonly Role[],
) {
  ensure(
    !allowed || allowed.includes(actor.role),
    403,
    'Seu perfil não permite esta operação.',
  );
  ensure(
    !locationId ||
      actor.role === 'ADMIN' ||
      actor.locationIds.includes(locationId),
    403,
    'Você não tem acesso a esta obra.',
  );
}
export function locationScope(actor: Actor) {
  return actor.role === 'ADMIN' ? {} : { id: { in: actor.locationIds } };
}
