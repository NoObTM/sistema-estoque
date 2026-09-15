import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';
import { Prisma } from '@estoque/database';
import { auth } from './auth';
import { db } from './database';
import { env } from './config';
import {
  actorFromDatabase,
  authorize,
  locationScope,
  type Actor,
} from './core/access';
import { AppError, ensure } from './core/errors';
import { write } from './core/transaction';
import {
  saveCatalog,
  saveLocation,
  saveMaterial,
  saveStockSettings,
} from './modules/catalogs';
import {
  cancelDocument,
  confirmDocument,
  documentInclude,
  resolveDocument,
  reverseDocument,
  saveDocument,
} from './modules/documents';
import {
  acceptInvitation,
  inviteUser,
  setupAdministrator,
  updateAccess,
} from './modules/users';
import { report } from './modules/reports';
import { dateRange } from './core/date-range';

declare module 'fastify' {
  interface FastifyRequest {
    actor: Actor;
  }
}
const idParams = z.object({ id: z.string().min(1).max(100) });
const querySchema = z.object({
  locationId: z.string().optional(),
  kind: z.string().optional(),
  status: z.string().optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  cursor: z.string().optional(),
});

export function createApp(logging = true) {
  const app = Fastify({
    bodyLimit: 2_000_000,
    logger: logging
      ? {
          redact: [
            'req.headers.cookie',
            'req.headers.authorization',
            'req.url',
            'req.body',
            'res.headers.set-cookie',
          ],
        }
      : false,
  });
  app.register(cors, { origin: env.APP_URL, credentials: true });
  app.register(rateLimit, { max: 600, timeWindow: '1 minute' });
  app.setErrorHandler((error, request, reply) => {
    if (
      typeof error === 'object' &&
      error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
    )
      return reply.code(error.statusCode).send({
        message:
          error.statusCode === 429
            ? 'Muitas solicitações. Aguarde um minuto e tente novamente.'
            : 'Requisição inválida. Confira o formato e o tamanho dos dados.',
      });
    if (error instanceof z.ZodError)
      return reply.code(400).send({
        message: error.issues.map((issue) => issue.message).join(' '),
      });
    if (error instanceof AppError)
      return reply.code(error.status).send({ message: error.message });
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2003', 'P2025'].includes(error.code)
    )
      return reply.code(409).send({
        message:
          'Cadastro duplicado, vínculo inválido ou registro não encontrado. Atualize e confira os dados.',
      });
    request.log.error({ err: error }, 'Falha na operação');
    return reply.code(500).send({
      message: 'Não foi possível concluir a operação. Tente novamente.',
    });
  });
  app.addHook('onRequest', async (request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      ensure(
        request.headers.origin === env.APP_URL,
        403,
        'Origem da solicitação não autorizada.',
      );
      ensure(
        request.headers['content-type']?.startsWith('application/json'),
        415,
        'Envie dados em JSON.',
      );
    }
  });
  app.get('/api/health', async () => {
    await db.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  });
  app.get('/api/setup', async () => ({
    required: (await db.user.count()) === 0,
  }));
  app.post(
    '/api/setup',
    { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request) => setupAdministrator(request.body),
  );
  app.post(
    '/api/invitations/accept',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request) => acceptInvitation(request.body),
  );
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    handler: async (request, reply) => {
      const authHeaders = fromNodeHeaders(request.headers);
      authHeaders.set('x-estoque-client-ip', request.ip);
      const response = await auth.handler(
        new Request(new URL(request.url, env.APP_URL), {
          method: request.method,
          headers: authHeaders,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        }),
      );
      reply.code(response.status);
      response.headers.forEach((value, key) => {
        if (key !== 'set-cookie') reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header('set-cookie', cookies);
      return reply.send(await response.text());
    },
  });
  app.register(
    async (api) => {
      api.addHook('preHandler', async (request) => {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        ensure(session, 401, 'Entre para acessar o sistema.');
        request.actor = await actorFromDatabase(db, session.user.id);
      });
      api.get('/me', async (request) => request.actor);
      api.get('/attachments/:id', async (request, reply) => {
        const { id } = idParams.parse(request.params);
        const attachment = await db.attachment.findUnique({
          where: { id },
          include: { document: true },
        });
        ensure(attachment, 404, 'Comprovante não encontrado.');
        const doc = attachment.document;
        ensure(
          request.actor.role === 'ADMIN' ||
            request.actor.locationIds.includes(doc.locationId) ||
            (!!doc.destinationId &&
              request.actor.locationIds.includes(doc.destinationId)),
          403,
          'Você não tem acesso ao comprovante.',
        );
        if (request.actor.role === 'REQUESTER')
          ensure(
            doc.kind === 'REQUEST' && doc.createdBy === request.actor.id,
            403,
            'Comprovante não autorizado.',
          );
        return reply
          .header(
            'Content-Disposition',
            `attachment; filename*=UTF-8''${encodeURIComponent(attachment.name)}`,
          )
          .type(attachment.mime)
          .send(Buffer.from(attachment.data));
      });
      api.get('/reports', async (request) => {
        const query = querySchema.parse(request.query);
        return report(request.actor, query.locationId, query.from, query.to);
      });
      api.get('/locations', async (request) =>
        db.location.findMany({
          where: locationScope(request.actor),
          orderBy: { name: 'asc' },
        }),
      );
      api.get('/destinations', async (request) => {
        authorize(request.actor, undefined, ['ADMIN', 'MANAGER', 'KEEPER']);
        return db.location.findMany({
          where: { active: true },
          select: { id: true, name: true, code: true },
        });
      });
      api.get('/catalogs', async (request) =>
        db.catalog.findMany({
          where:
            request.actor.role === 'ADMIN'
              ? {}
              : {
                  OR: [
                    { locationId: null },
                    { locationId: { in: request.actor.locationIds } },
                  ],
                },
          orderBy: { name: 'asc' },
        }),
      );
      api.get('/materials', async () =>
        db.material.findMany({
          include: { group: true, unit: true },
          orderBy: { name: 'asc' },
        }),
      );
      for (const [path, save] of [
        ['locations', saveLocation],
        ['catalogs', saveCatalog],
        ['materials', saveMaterial],
      ] as const) {
        api.post(`/${path}`, async (request) =>
          write<unknown>(
            request.actor.id,
            `create:${path}`,
            String(request.headers['idempotency-key'] ?? ''),
            request.body,
            (tx, actor) => save(tx, actor, request.body),
          ),
        );
        api.put(`/${path}/:id`, async (request) => {
          const { id } = idParams.parse(request.params);
          return write<unknown>(
            request.actor.id,
            `update:${path}:${id}`,
            String(request.headers['idempotency-key'] ?? ''),
            request.body,
            (tx, actor) => save(tx, actor, request.body, id),
          );
        });
      }
      api.get('/stocks', async (request) => {
        const query = querySchema.parse(request.query);
        if (query.locationId) authorize(request.actor, query.locationId);
        return db.stock.findMany({
          where: {
            locationId:
              query.locationId ??
              (request.actor.role === 'ADMIN'
                ? undefined
                : { in: request.actor.locationIds }),
          },
          include: { location: true, material: { include: { unit: true } } },
          orderBy: [{ locationId: 'asc' }, { materialId: 'asc' }],
        });
      });
      api.post('/stocks/settings', async (request) =>
        write(
          request.actor.id,
          'stock:settings',
          String(request.headers['idempotency-key'] ?? ''),
          request.body,
          (tx, actor) => saveStockSettings(tx, actor, request.body),
        ),
      );
      api.get('/documents', async (request) => {
        const query = querySchema.parse(request.query);
        if (query.locationId) authorize(request.actor, query.locationId);
        const scope = query.locationId
          ? [query.locationId]
          : request.actor.locationIds;
        const where: Prisma.DocumentWhereInput = {
          kind: query.kind ? { in: query.kind.split(',') } : undefined,
          status: query.status || undefined,
          ...(request.actor.role === 'ADMIN' && !query.locationId
            ? {}
            : {
                OR: [
                  { locationId: { in: scope } },
                  { destinationId: { in: scope } },
                ],
              }),
          ...(request.actor.role === 'REQUESTER'
            ? { kind: 'REQUEST', createdBy: request.actor.id }
            : {}),
        };
        return db.document.findMany({
          where,
          include: {
            ...documentInclude,
            corrections: { select: { id: true, kind: true, number: true } },
          },
          orderBy: { number: 'desc' },
          take: 200,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        });
      });
      api.post('/documents', async (request) =>
        write(
          request.actor.id,
          'document:create',
          String(request.headers['idempotency-key'] ?? ''),
          request.body,
          (tx, actor) => saveDocument(tx, actor, request.body),
        ),
      );
      api.put('/documents/:id', async (request) => {
        const { id } = idParams.parse(request.params);
        return write(
          request.actor.id,
          `document:update:${id}`,
          String(request.headers['idempotency-key'] ?? ''),
          request.body,
          (tx, actor) => saveDocument(tx, actor, request.body, id),
        );
      });
      for (const [action, execute] of [
        ['confirm', confirmDocument],
        ['cancel', cancelDocument],
      ] as const)
        api.post(`/documents/:id/${action}`, async (request) => {
          const { id } = idParams.parse(request.params);
          return write(
            request.actor.id,
            `document:${action}:${id}`,
            String(request.headers['idempotency-key'] ?? ''),
            {},
            (tx, actor) => execute(tx, actor, id),
          );
        });
      api.post('/documents/:id/resolve', async (request) => {
        const { id } = idParams.parse(request.params);
        return write(
          request.actor.id,
          `document:resolve:${id}`,
          String(request.headers['idempotency-key'] ?? ''),
          request.body,
          (tx, actor) => resolveDocument(tx, actor, id, request.body),
        );
      });
      api.post('/documents/:id/reverse', async (request) => {
        const { id } = idParams.parse(request.params);
        const input = z
          .object({ notes: z.string().trim().min(5).max(2000) })
          .parse(request.body);
        return write(
          request.actor.id,
          `document:reverse:${id}`,
          String(request.headers['idempotency-key'] ?? ''),
          input,
          (tx, actor) => reverseDocument(tx, actor, id, input.notes),
        );
      });
      api.get('/ledger', async (request) => {
        authorize(request.actor, undefined, [
          'ADMIN',
          'MANAGER',
          'KEEPER',
          'VIEWER',
        ]);
        const query = querySchema.parse(request.query);
        if (query.locationId) authorize(request.actor, query.locationId);
        return db.ledger.findMany({
          where: {
            locationId:
              query.locationId ??
              (request.actor.role === 'ADMIN'
                ? undefined
                : { in: request.actor.locationIds }),
            createdAt: dateRange(query.from, query.to),
          },
          include: {
            material: { include: { unit: true } },
            location: true,
            document: true,
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 500,
          ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        });
      });
      api.get('/users', async (request) => {
        authorize(request.actor, undefined, ['ADMIN']);
        return db.user.findMany({
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            active: true,
            memberships: true,
          },
          orderBy: { name: 'asc' },
        });
      });
      api.post('/invitations', async (request) =>
        write(
          request.actor.id,
          'invitation:create',
          String(request.headers['idempotency-key'] ?? ''),
          request.body,
          (tx, actor) => inviteUser(tx, actor, request.body),
        ),
      );
      api.put('/users/:id', async (request) => {
        const { id } = idParams.parse(request.params);
        return write(
          request.actor.id,
          `user:update:${id}`,
          String(request.headers['idempotency-key'] ?? ''),
          request.body,
          (tx, actor) => updateAccess(tx, actor, id, request.body),
        );
      });
      api.get('/audit', async (request) => {
        authorize(request.actor, undefined, ['ADMIN']);
        return db.audit.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
      });
    },
    { prefix: '/api' },
  );
  return app;
}
