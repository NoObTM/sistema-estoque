import { expect, test } from '@playwright/test';

test('recebimento parcial valida o limite e atualiza o saldo do destino', async ({
  page,
}, testInfo) => {
  await page.goto('/transferencias');
  const transfer = page.locator('section').filter({ hasText: 'TR-001' });
  await transfer.getByLabel('Quantidade recebida').fill('3');
  await transfer.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(transfer.getByRole('alert')).toContainText('não pode superar');
  await transfer.getByLabel('Quantidade recebida').fill('1');
  await transfer.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(transfer.getByRole('status')).toContainText(
    'saldo do destino foi atualizado',
  );
  await expect(
    transfer.getByText('Parcialmente recebida', { exact: true }),
  ).toBeVisible();
  await transfer.getByLabel('Quantidade recebida').fill('1');
  await transfer.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await expect(
    transfer.getByRole('button', { name: 'Conferência concluída' }),
  ).toBeDisabled();
  await page
    .getByRole('link', { name: 'Estoque por obra', exact: true })
    .click();
  await page
    .getByRole('combobox', { name: 'Obra ou depósito' })
    .selectOption('aurora');
  await expect(
    page.getByRole('row').filter({ hasText: 'Cimento' }),
  ).toContainText('20 sc');
  await page.screenshot({
    path: `artifacts/stock-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test('busca de material e filtro de obra funcionam sem transbordamento da página', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Cada material, no lugar certo.' }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/dashboard-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('link', { name: 'Materiais', exact: true }).click();
  await page.getByRole('textbox', { name: 'Buscar material' }).fill('cimento');
  await expect(page.getByRole('row')).toHaveCount(2);
  await page
    .getByRole('textbox', { name: 'Buscar material' })
    .fill('inexistente');
  await expect(
    page.getByText('Nenhum material encontrado. Tente outra busca.'),
  ).toBeVisible();
});
