import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';
import type { Prisma } from '@estoque/database';
import { invitationSchema, roleSchema } from '@estoque/contracts/schemas';
import { authorize, type Actor } from '../core/access';
import { ensure } from '../core/errors';
import { db } from '../database';
import { env } from '../config';

const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');
export const accountInput = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.email(),
  password: z.string().min(12).max(128),
  token: z.string().min(1).max(200),
});
async function createAccount(
  tx: Prisma.TransactionClient,
  data: {
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    locationIds: string[];
  },
) {
  const id = randomUUID();
  return tx.user.create({
    data: {
      id,
      name: data.name,
      email: data.email.toLowerCase(),
      emailVerified: true,
      role: data.role,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: 'credential',
          password: data.passwordHash,
        },
      },
      memberships: {
        create: data.locationIds.map((locationId) => ({ locationId })),
      },
    },
    select: { id: true, name: true, email: true, role: true },
  });
}
export async function setupAdministrator(raw: unknown) {
  const input = accountInput.parse(raw);
  ensure(
    timingSafeEqual(
      Buffer.from(digest(input.token)),
      Buffer.from(digest(env.SETUP_TOKEN)),
    ),
    403,
    'Chave de instalação inválida.',
  );
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(624183)`;
    ensure(
      (await tx.user.count()) === 0,
      409,
      'A instalação já foi concluída.',
    );
    const user = await createAccount(tx, {
      ...input,
      passwordHash,
      role: 'ADMIN',
      locationIds: [],
    });
    await tx.audit.create({
      data: {
        actorId: user.id,
        action: 'SETUP',
        entityId: user.id,
        details: {},
      },
    });
    return user;
  });
}
export async function inviteUser(
  tx: Prisma.TransactionClient,
  actor: Actor,
  raw: unknown,
) {
  authorize(actor, undefined, ['ADMIN']);
  const data = invitationSchema.parse(raw);
  ensure(
    data.role === 'ADMIN' || data.locationIds.length > 0,
    400,
    'Vincule ao menos uma obra.',
  );
  ensure(
    (await tx.location.count({
      where: { id: { in: data.locationIds }, active: true },
    })) === new Set(data.locationIds).size,
    400,
    'Obra inválida no convite.',
  );
  ensure(
    !(await tx.user.findUnique({ where: { email: data.email.toLowerCase() } })),
    409,
    'Este e-mail já tem acesso. Edite o usuário existente.',
  );
  const token = randomBytes(32).toString('hex');
  const invitation = await tx.invitation.create({
    data: {
      ...data,
      email: data.email.toLowerCase(),
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + 48 * 3600000),
      createdBy: actor.id,
    },
  });
  return {
    id: invitation.id,
    email: invitation.email,
    url: `${env.APP_URL}/convite?token=${token}`,
    expiresAt: invitation.expiresAt,
  };
}
export async function acceptInvitation(raw: unknown) {
  const input = accountInput.parse(raw);
  const passwordHash = await hashPassword(input.password);
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(624183)`;
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash: digest(input.token) },
    });
    ensure(
      invitation &&
        !invitation.acceptedAt &&
        invitation.expiresAt > new Date() &&
        invitation.email === input.email.toLowerCase(),
      400,
      'Convite inválido, utilizado ou expirado.',
    );
    const user = await createAccount(tx, {
      ...input,
      passwordHash,
      role: invitation.role,
      locationIds: invitation.locationIds,
    });
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });
    await tx.audit.create({
      data: {
        actorId: user.id,
        action: 'ACCEPT_INVITATION',
        entityId: invitation.id,
        details: {},
      },
    });
    return user;
  });
}
export async function updateAccess(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  raw: unknown,
) {
  authorize(actor, undefined, ['ADMIN']);
  const input = z
    .object({
      role: roleSchema,
      active: z.boolean(),
      locationIds: z.array(z.string()).max(200),
    })
    .parse(raw);
  ensure(
    id !== actor.id || (input.active && input.role === 'ADMIN'),
    400,
    'Não remova seu próprio acesso de administrador.',
  );
  ensure(
    input.role === 'ADMIN' || input.locationIds.length > 0,
    400,
    'Vincule ao menos uma obra.',
  );
  ensure(
    (await tx.location.count({ where: { id: { in: input.locationIds } } })) ===
      new Set(input.locationIds).size,
    400,
    'Obra inválida.',
  );
  await tx.membership.deleteMany({ where: { userId: id } });
  await tx.session.deleteMany({ where: { userId: id } });
  return tx.user.update({
    where: { id },
    data: {
      role: input.role,
      active: input.active,
      memberships: {
        create: [...new Set(input.locationIds)].map((locationId) => ({
          locationId,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      memberships: true,
    },
  });
}
