import { randomUUID } from 'node:crypto';
import { hashPassword } from 'better-auth/crypto';
import { test, expect } from '@playwright/test';
import { db } from '../../apps/api/src/database';
import { env } from '../../apps/api/src/config';

if (
  process.env.TEST_DATABASE !== 'true' ||
  new URL(env.DATABASE_URL).pathname !== '/estoque_test'
)
  throw new Error('Use npm run test:e2e com banco isolado.');
let email: string;
let password: string;
test.beforeAll(async () => {
  const id = randomUUID();
  email = `${id}@example.test`;
  password = `Browser-${randomUUID()}`;
  await db.user.create({
    data: {
      id,
      name: 'Administrador navegador',
      email,
      emailVerified: true,
      role: 'ADMIN',
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: 'credential',
          password: await hashPassword(password),
        },
      },
    },
  });
});
test.afterAll(async () => {
  await db.$disconnect();
});
test('transferência com conferência parcial e bloqueio de excesso pela interface', async ({
  page,
}, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Cada material, no lugar certo.' }),
  ).toBeVisible();
  async function post(path: string, data: unknown) {
    const response = await page.request.post(`/api${path}`, {
      headers: { Origin: env.APP_URL, 'Idempotency-Key': randomUUID() },
      data,
    });
    expect(response.ok(), await response.text()).toBe(true);
    return response.json();
  }
  const origin = await post('/locations', {
    code: `OR-${suffix}`,
    name: `Origem ${suffix}`,
    kind: 'WAREHOUSE',
  });
  const destination = await post('/locations', {
    code: `DE-${suffix}`,
    name: `Destino ${suffix}`,
    kind: 'SITE',
  });
  const group = await post('/catalogs', {
    code: `G-${suffix}`,
    name: `Grupo ${suffix}`,
    kind: 'GROUP',
  });
  const unit = await post('/catalogs', {
    code: `sc-${suffix}`,
    name: 'Saco',
    kind: 'UNIT',
  });
  const material = await post('/materials', {
    code: `M-${suffix}`,
    name: `Cimento transferência ${suffix}`,
    groupId: group.id,
    unitId: unit.id,
  });
  const initial = await post('/documents', {
    kind: 'INITIAL',
    locationId: origin.id,
    notes: 'Saldo inicial conferido',
    items: [{ materialId: material.id, quantity: '30', unitCost: '10' }],
  });
  await post(`/documents/${initial.id}/confirm`, {});
  await page.goto('/transferencias');
  await page.getByRole('button', { name: 'Novo documento' }).click();
  await page.getByLabel('Obra / origem').selectOption(origin.id);
  await page
    .getByLabel('Destino', { exact: true })
    .selectOption(destination.id);
  await page.getByLabel('Material', { exact: true }).selectOption(material.id);
  await page.getByLabel('Quantidade', { exact: true }).fill('20');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  const doc = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: `Origem ${suffix} → Destino ${suffix}`,
      exact: true,
    }),
  });
  await doc.getByRole('button', { name: 'Confirmar envio' }).click();
  await doc.getByRole('button', { name: 'Concluir operação' }).click();
  await expect(doc.getByText('Enviada', { exact: true })).toBeVisible();
  await doc.getByRole('button', { name: 'Conferir recebimento' }).click();
  await doc
    .getByLabel(`Quantidade ${material.name}`, { exact: true })
    .fill('21');
  await doc
    .getByLabel('Justificativa / conferência')
    .fill('Conferência física dos materiais');
  await doc.getByRole('button', { name: 'Concluir operação' }).click();
  await expect(doc.getByRole('alert')).toContainText('maior que a pendência');
  await doc
    .getByLabel(`Quantidade ${material.name}`, { exact: true })
    .fill('18');
  await doc.getByRole('button', { name: 'Concluir operação' }).click();
  await expect(doc.getByText('Parcial', { exact: true })).toBeVisible();
  await page.screenshot({
    path: `artifacts/transfer-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await doc.getByRole('button', { name: 'Conferir recebimento' }).click();
  await doc
    .getByLabel(`Quantidade ${material.name}`, { exact: true })
    .fill('2');
  await doc
    .getByLabel('Justificativa / conferência')
    .fill('Recebimento do restante conferido');
  await doc.getByRole('button', { name: 'Concluir operação' }).click();
  await expect(doc.getByText('Recebida', { exact: true })).toBeVisible();
});
test('login, cadastro persistente e movimentação real pelo navegador', async ({
  page,
}, testInfo) => {
  const suffix = randomUUID().slice(0, 8);
  await page.goto('/');
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Cada material, no lugar certo.' }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Cadastros', exact: true })
    .first()
    .click();
  await page
    .getByRole('button', { name: 'Novo cadastro', exact: true })
    .click();
  await page.getByLabel('Código', { exact: true }).fill(`OB-${suffix}`);
  await page.getByLabel('Nome', { exact: true }).fill(`Obra ${suffix}`);
  await page.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(
    page.getByRole('cell', { name: `Obra ${suffix}`, exact: true }),
  ).toBeVisible();
  for (const tab of ['Grupos', 'Unidades']) {
    await page.getByRole('button', { name: tab, exact: true }).click();
    await page
      .getByRole('button', { name: 'Novo cadastro', exact: true })
      .click();
    await page.getByLabel('Código', { exact: true }).fill(`${tab}-${suffix}`);
    await page.getByLabel('Nome', { exact: true }).fill(`${tab} ${suffix}`);
    await page.getByRole('button', { name: 'Salvar cadastro' }).click();
    await expect(
      page.getByRole('cell', { name: `${tab} ${suffix}`, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole('link', { name: 'Materiais', exact: true }).click();
  await page
    .getByRole('button', { name: 'Novo material', exact: true })
    .click();
  await page.getByLabel('Código', { exact: true }).fill(`MAT-${suffix}`);
  await page.getByLabel('Nome do material').fill(`Cimento ${suffix}`);
  await page
    .getByLabel('Grupo', { exact: true })
    .selectOption({ label: `Grupos ${suffix}` });
  await page
    .getByLabel('Unidade', { exact: true })
    .selectOption({ label: `Unidades ${suffix}` });
  await page.getByRole('button', { name: 'Salvar cadastro' }).click();
  await expect(
    page.getByText(`Cimento ${suffix}`, { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(`Cimento ${suffix}`, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: 'Entradas e saídas', exact: true })
    .click();
  await page.getByRole('button', { name: 'Novo documento' }).click();
  await page.getByLabel('Tipo', { exact: true }).selectOption('INITIAL');
  await page
    .getByLabel('Obra / origem')
    .selectOption({ label: `Obra ${suffix}` });
  await page
    .getByLabel('Observações / justificativa')
    .fill('Contagem inicial conferida');
  await page
    .getByLabel('Material', { exact: true })
    .selectOption({ label: `Cimento ${suffix} (Unidades-${suffix})` });
  await page.getByLabel('Quantidade', { exact: true }).fill('20');
  await page.getByLabel('Custo unitário (R$)').fill('15');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  const document = page.locator('section').filter({
    has: page.getByRole('heading', { name: `Obra ${suffix}`, exact: true }),
  });
  await document.getByRole('button', { name: 'Confirmar documento' }).click();
  await document.getByRole('button', { name: 'Concluir operação' }).click();
  await expect(document.getByText('Confirmada', { exact: true })).toBeVisible();
  await page
    .getByRole('link', { name: 'Estoque por obra', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Obra ou depósito' })
    .selectOption({ label: `Obra ${suffix}` });
  await page.reload();
  await expect(
    page.getByRole('row').filter({ hasText: `Cimento ${suffix}` }),
  ).toContainText('20');
  expect(
    await page.evaluate(
      () => window.document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `artifacts/system-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Entrar', exact: true }),
  ).toBeVisible();
});
