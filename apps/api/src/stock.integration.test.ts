import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { db } from './database';
import { env } from './config';

if (
  process.env.TEST_DATABASE !== 'true' ||
  new URL(env.DATABASE_URL).pathname !== '/estoque_test'
)
  throw new Error('Os testes exigem banco estoque_test isolado.');
const app = createApp(false);
let cookie = '';
let restrictedCookie = '';
let locationId = '';
let destinationId = '';
let groupId = '';
let unitId = '';
let supplierId = '';
let employeeId = '';
let costCenterId = '';
async function request(
  method: 'GET' | 'POST' | 'PUT',
  url: string,
  payload?: unknown,
  key = randomUUID(),
  session = cookie,
) {
  return app.inject({
    remoteAddress: `192.0.2.${Math.floor(Math.random() * 200) + 1}`,
    method,
    url: `/api${url}`,
    headers: {
      origin: env.APP_URL,
      'content-type': 'application/json',
      'idempotency-key': key,
      cookie: session,
    },
    ...(payload === undefined ? {} : { payload: JSON.stringify(payload) }),
  });
}
async function post(url: string, body: unknown) {
  const response = await request('POST', url, body);
  expect(response.statusCode, response.body).toBe(200);
  return response.json();
}
async function material() {
  return (
    await post('/materials', {
      code: randomUUID(),
      name: 'Material integração',
      groupId,
      unitId,
    })
  ).id as string;
}
async function draft(
  kind: string,
  materialId: string,
  quantity: string,
  unitCost = '10',
  local = locationId,
) {
  return post('/documents', {
    kind,
    locationId: local,
    ...(kind === 'TRANSFER' ? { destinationId } : {}),
    supplierId,
    employeeId,
    costCenterId: local === locationId ? costCenterId : null,
    notes: 'Operação de teste automatizado',
    items: [{ materialId, quantity, unitCost }],
  });
}
async function initial(materialId: string, quantity = '10') {
  const doc = await draft('INITIAL', materialId, quantity);
  await post(`/documents/${doc.id}/confirm`, {});
}
async function balance(materialId: string, local = locationId) {
  return (
    await db.stock.findUniqueOrThrow({
      where: { locationId_materialId: { locationId: local, materialId } },
    })
  ).quantity.toString();
}

beforeAll(async () => {
  const password = 'Integration-' + randomUUID();
  const id = randomUUID();
  const email = `${id}@example.test`;
  await db.user.create({
    data: {
      id,
      name: 'Administrador teste',
      email,
      emailVerified: true,
      role: 'ADMIN',
      accounts: {
        create: {
          id: randomUUID(),
          providerId: 'credential',
          accountId: id,
          password: await hashPassword(password),
        },
      },
    },
  });
  const login = await request('POST', '/auth/sign-in/email', {
    email,
    password,
  });
  expect(login.statusCode, login.body).toBe(200);
  cookie = login.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
  locationId = (
    await post('/locations', {
      code: randomUUID(),
      name: 'Origem teste',
      kind: 'WAREHOUSE',
    })
  ).id;
  destinationId = (
    await post('/locations', {
      code: randomUUID(),
      name: 'Destino teste',
      kind: 'SITE',
    })
  ).id;
  for (const kind of ['GROUP', 'UNIT', 'SUPPLIER', 'EMPLOYEE', 'COST_CENTER']) {
    const entry = await post('/catalogs', {
      kind,
      code: randomUUID(),
      name: kind,
      ...(kind === 'COST_CENTER' ? { locationId } : {}),
    });
    if (kind === 'GROUP') groupId = entry.id;
    if (kind === 'UNIT') unitId = entry.id;
    if (kind === 'SUPPLIER') supplierId = entry.id;
    if (kind === 'EMPLOYEE') employeeId = entry.id;
    if (kind === 'COST_CENTER') costCenterId = entry.id;
  }
  const restrictedId = randomUUID();
  const restrictedEmail = `${restrictedId}@example.test`;
  await db.user.create({
    data: {
      id: restrictedId,
      name: 'Almoxarife teste',
      email: restrictedEmail,
      emailVerified: true,
      role: 'KEEPER',
      memberships: { create: { locationId } },
      accounts: {
        create: {
          id: randomUUID(),
          providerId: 'credential',
          accountId: restrictedId,
          password: await hashPassword(password),
        },
      },
    },
  });
  const restricted = await request('POST', '/auth/sign-in/email', {
    email: restrictedEmail,
    password,
  });
  expect(restricted.statusCode).toBe(200);
  restrictedCookie = restricted.cookies
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
});
afterAll(async () => {
  await app.close();
  await db.$disconnect();
});
describe('estoque persistente e autorização', () => {
  it('recupera a senha por token do Better Auth e invalida as sessões anteriores', async () => {
    const email = `${randomUUID()}@example.test`;
    const invite = await post('/invitations', {
      name: 'Recuperação teste',
      email,
      role: 'VIEWER',
      locationIds: [locationId],
    });
    const token = new URL(invite.url).searchParams.get('token');
    const password = `Reset-${randomUUID()}`;
    await post('/invitations/accept', {
      name: 'Recuperação teste',
      email,
      password,
      token,
    });
    const login = await request('POST', '/auth/sign-in/email', {
      email,
      password,
    });
    const oldCookie = login.cookies
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    await post('/auth/request-password-reset', {
      email,
      redirectTo: `${env.APP_URL}/redefinir-senha`,
    });
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    const verification = await db.verification.findFirstOrThrow({
      where: { value: user.id, identifier: { startsWith: 'reset-password:' } },
      orderBy: { createdAt: 'desc' },
    });
    const newPassword = `New-${randomUUID()}`;
    await post('/auth/reset-password', {
      token: verification.identifier.slice('reset-password:'.length),
      newPassword,
    });
    expect(
      (await request('GET', '/me', undefined, randomUUID(), oldCookie))
        .statusCode,
    ).toBe(401);
    expect(
      (
        await request('POST', '/auth/sign-in/email', {
          email,
          password: newPassword,
        })
      ).statusCode,
    ).toBe(200);
  });
  it('aceita convite uma única vez e concede somente o perfil e a obra atribuídos', async () => {
    const email = `${randomUUID()}@example.test`;
    const invitation = await post('/invitations', {
      name: 'Convidado',
      email,
      role: 'VIEWER',
      locationIds: [destinationId],
    });
    const token = new URL(invitation.url).searchParams.get('token');
    const payload = {
      name: 'Convidado',
      email,
      password: `Invite-${randomUUID()}`,
      token,
    };
    await post('/invitations/accept', payload);
    expect(
      (await request('POST', '/invitations/accept', payload)).statusCode,
    ).toBe(400);
    const login = await request('POST', '/auth/sign-in/email', {
      email,
      password: payload.password,
    });
    expect(login.statusCode).toBe(200);
    const invitedCookie = login.cookies
      .map((c) => `${c.name}=${c.value}`)
      .join('; ');
    const me = await request(
      'GET',
      '/me',
      undefined,
      randomUUID(),
      invitedCookie,
    );
    expect(me.json().role).toBe('VIEWER');
    expect(me.json().locationIds).toEqual([destinationId]);
    expect(
      (
        await request(
          'POST',
          '/locations',
          { code: randomUUID(), name: 'Não permitido', kind: 'SITE' },
          randomUUID(),
          invitedCookie,
        )
      ).statusCode,
    ).toBe(403);
  });
  it('estorna uma entrada pelo custo original e restaura o custo médio anterior', async () => {
    const id = await material();
    await initial(id);
    const entry = await draft('ENTRY', id, '10', '20');
    await post(`/documents/${entry.id}/confirm`, {});
    await post(`/documents/${entry.id}/reverse`, {
      notes: 'Nota de entrada cancelada',
    });
    const stock = await db.stock.findUniqueOrThrow({
      where: { locationId_materialId: { locationId, materialId: id } },
    });
    expect(stock.quantity.toString()).toBe('10');
    expect(stock.averageCost.toString()).toBe('10');
  });
  it('salva comprovante com a conferência e bloqueia conteúdo de arquivo inválido', async () => {
    const id = await material();
    await initial(id);
    const doc = await draft('TRANSFER', id, '2');
    await post(`/documents/${doc.id}/confirm`, {});
    const body = {
      action: 'RECEIVE',
      notes: 'Recebimento com comprovante',
      items: [{ materialId: id, quantity: '1' }],
      attachment: {
        name: 'comprovante.pdf',
        content: `data:application/pdf;base64,${Buffer.from('%PDF-1.7\nComprovante teste').toString('base64')}`,
      },
    };
    const result = await post(`/documents/${doc.id}/resolve`, body);
    expect(result.attachments).toHaveLength(1);
    const file = await request(
      'GET',
      `/attachments/${result.attachments[0].id}`,
    );
    expect(file.statusCode).toBe(200);
    expect(file.headers['content-type']).toContain('application/pdf');
    expect(
      (
        await request('POST', `/documents/${doc.id}/resolve`, {
          ...body,
          attachment: {
            name: 'falso.pdf',
            content: 'data:application/pdf;base64,YWJj',
          },
        })
      ).statusCode,
    ).toBe(400);
    expect(await balance(id, destinationId)).toBe('1');
  });
  it('não permite inscrição pública, acesso anônimo ou escrita de outra origem', async () => {
    expect(
      (await request('GET', '/stocks', undefined, randomUUID(), '')).statusCode,
    ).toBe(401);
    expect(
      (
        await request('POST', '/auth/sign-up/email', {
          name: 'Intruso',
          email: 'blocked@example.test',
          password: 'Password-123456',
        })
      ).statusCode,
    ).not.toBe(200);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/documents',
          headers: {
            origin: 'https://untrusted.example',
            'content-type': 'application/json',
          },
          payload: '{}',
        })
      ).statusCode,
    ).toBe(403);
  });
  it('calcula custo médio, mantém saldo após nova consulta e estorna com vínculo', async () => {
    const id = await material();
    await initial(id);
    const entry = await draft('ENTRY', id, '10', '20');
    await post(`/documents/${entry.id}/confirm`, {});
    const stock = await db.stock.findUniqueOrThrow({
      where: { locationId_materialId: { locationId, materialId: id } },
    });
    expect(stock.quantity.toString()).toBe('20');
    expect(stock.averageCost.toString()).toBe('15');
    const exit = await draft('EXIT', id, '5');
    await post(`/documents/${exit.id}/confirm`, {});
    expect(await balance(id)).toBe('15');
    await post(`/documents/${exit.id}/reverse`, {
      notes: 'Correção justificada',
    });
    expect(await balance(id)).toBe('20');
    expect(
      (
        await request('POST', `/documents/${exit.id}/reverse`, {
          notes: 'Repetir estorno inválido',
        })
      ).statusCode,
    ).toBe(409);
  });
  it('duas saídas concorrentes de 7 sobre saldo 10 confirmam apenas uma', async () => {
    const id = await material();
    await initial(id);
    const a = await draft('EXIT', id, '7');
    const b = await draft('EXIT', id, '7');
    const responses = await Promise.all([
      request('POST', `/documents/${a.id}/confirm`, {}),
      request('POST', `/documents/${b.id}/confirm`, {}),
    ]);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(await balance(id)).toBe('3');
  });
  it('reenvio com a mesma chave não duplica saldo nem documento', async () => {
    const id = await material();
    const entry = await draft('INITIAL', id, '10');
    const key = randomUUID();
    const responses = await Promise.all([
      request('POST', `/documents/${entry.id}/confirm`, {}, key),
      request('POST', `/documents/${entry.id}/confirm`, {}, key),
    ]);
    expect(responses.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(await balance(id)).toBe('10');
    expect(await db.ledger.count({ where: { documentId: entry.id } })).toBe(1);
  });
  it('confere parcialmente, conserva saldo/trânsito e bloqueia recebimento por obra não autorizada', async () => {
    const id = await material();
    await initial(id, '30');
    const transfer = await draft('TRANSFER', id, '20');
    await post(`/documents/${transfer.id}/confirm`, {});
    expect(await balance(id)).toBe('10');
    const body = {
      action: 'RECEIVE',
      notes: 'Conferência parcial',
      items: [{ materialId: id, quantity: '18' }],
    };
    expect(
      (
        await request(
          'POST',
          `/documents/${transfer.id}/resolve`,
          body,
          randomUUID(),
          restrictedCookie,
        )
      ).statusCode,
    ).toBe(403);
    const partial = await post(`/documents/${transfer.id}/resolve`, body);
    expect(partial.status).toBe('PARTIAL');
    expect(await balance(id, destinationId)).toBe('18');
    expect(
      (
        await request('POST', `/documents/${transfer.id}/resolve`, {
          ...body,
          items: [{ materialId: id, quantity: '3' }],
        })
      ).statusCode,
    ).toBe(409);
    const rest = { ...body, items: [{ materialId: id, quantity: '2' }] };
    const results = await Promise.all([
      request('POST', `/documents/${transfer.id}/resolve`, rest),
      request('POST', `/documents/${transfer.id}/resolve`, rest),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect(await balance(id, destinationId)).toBe('20');
    const stock = await db.stock.findUniqueOrThrow({
      where: {
        locationId_materialId: { locationId: destinationId, materialId: id },
      },
    });
    expect(stock.averageCost.toString()).toBe('10');
  });
  it('requisição só baixa estoque no atendimento e gera saída vinculada', async () => {
    const id = await material();
    await initial(id);
    const doc = await draft('REQUEST', id, '8');
    await post(`/documents/${doc.id}/confirm`, {});
    expect(await balance(id)).toBe('10');
    await post(`/documents/${doc.id}/resolve`, {
      action: 'FULFILL',
      notes: 'Entregue ao funcionário',
      items: [{ materialId: id, quantity: '3' }],
    });
    expect(await balance(id)).toBe('7');
    expect(
      await db.document.count({ where: { originalId: doc.id, kind: 'EXIT' } }),
    ).toBe(1);
  });
  it('inventário desatualizado exige nova contagem e não altera o saldo', async () => {
    const id = await material();
    await initial(id);
    const inventory = await draft('INVENTORY', id, '8');
    const exit = await draft('EXIT', id, '1');
    await post(`/documents/${exit.id}/confirm`, {});
    expect(
      (await request('POST', `/documents/${inventory.id}/confirm`, {}))
        .statusCode,
    ).toBe(409);
    expect(await balance(id)).toBe('9');
    const current = await draft('INVENTORY', id, '8');
    await post(`/documents/${current.id}/confirm`, {});
    expect(await balance(id)).toBe('8');
  });
  it('falha no segundo item desfaz o primeiro e concilia saldo com histórico', async () => {
    const a = await material();
    const b = await material();
    await initial(a);
    await initial(b, '1');
    const doc = await post('/documents', {
      kind: 'EXIT',
      locationId,
      employeeId,
      costCenterId,
      items: [
        { materialId: a, quantity: '2' },
        { materialId: b, quantity: '5' },
      ],
    });
    expect(
      (await request('POST', `/documents/${doc.id}/confirm`, {})).statusCode,
    ).toBe(409);
    expect(await balance(a)).toBe('10');
    const aggregate = await db.ledger.aggregate({
      where: { materialId: a, locationId },
      _sum: { delta: true },
    });
    expect(aggregate._sum.delta?.toString()).toBe(await balance(a));
  });
  it('registra devolução e perda, sem transformar trânsito em consumo', async () => {
    const id = await material();
    await initial(id);
    const doc = await draft('TRANSFER', id, '6');
    await post(`/documents/${doc.id}/confirm`, {});
    await post(`/documents/${doc.id}/resolve`, {
      action: 'RETURN',
      notes: 'Material retornou ao depósito',
      items: [{ materialId: id, quantity: '4' }],
    });
    const result = await post(`/documents/${doc.id}/resolve`, {
      action: 'LOSS',
      notes: 'Perda autorizada na entrega',
      items: [{ materialId: id, quantity: '2' }],
    });
    expect(result.status).toBe('RESOLVED');
    expect(await balance(id)).toBe('8');
  });
  it('filtra locais e rejeita consulta direta a saldo de obra sem vínculo', async () => {
    const response = await request(
      'GET',
      `/stocks?locationId=${destinationId}`,
      undefined,
      randomUUID(),
      restrictedCookie,
    );
    expect(response.statusCode).toBe(403);
    const locations = await request(
      'GET',
      '/locations',
      undefined,
      randomUUID(),
      restrictedCookie,
    );
    expect(locations.json().map((l: { id: string }) => l.id)).toEqual([
      locationId,
    ]);
  });
});
