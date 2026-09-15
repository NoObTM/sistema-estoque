import type { Prisma } from '@estoque/database';
import {
  catalogSchema,
  locationSchema,
  materialSchema,
  stockSettingsSchema,
} from '@estoque/contracts/schemas';
import { authorize, managers, type Actor } from '../core/access';
import { ensure } from '../core/errors';

export async function saveLocation(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: unknown,
  id?: string,
) {
  authorize(actor, undefined, ['ADMIN']);
  const data = locationSchema.parse(input);
  return id
    ? tx.location.update({ where: { id }, data })
    : tx.location.create({ data });
}
export async function saveCatalog(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: unknown,
  id?: string,
) {
  authorize(actor, undefined, ['ADMIN']);
  const data = catalogSchema.parse(input);
  if (data.kind === 'COST_CENTER')
    ensure(data.locationId, 400, 'O centro de custo precisa de uma obra.');
  if (data.locationId)
    ensure(
      await tx.location.findUnique({ where: { id: data.locationId } }),
      400,
      'Local inválido.',
    );
  if (id) {
    const previous = await tx.catalog.findUnique({ where: { id } });
    ensure(
      previous &&
        previous.kind === data.kind &&
        previous.locationId === data.locationId,
      400,
      'Não altere o tipo ou o vínculo de um cadastro existente.',
    );
  }
  return id
    ? tx.catalog.update({ where: { id }, data })
    : tx.catalog.create({ data });
}
export async function saveMaterial(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: unknown,
  id?: string,
) {
  authorize(actor, undefined, ['ADMIN']);
  const data = materialSchema.parse(input);
  data.barcode = data.barcode || null;
  const group = await tx.catalog.findUnique({ where: { id: data.groupId } });
  const unit = await tx.catalog.findUnique({ where: { id: data.unitId } });
  ensure(
    group?.kind === 'GROUP' &&
      group.active &&
      unit?.kind === 'UNIT' &&
      unit.active,
    400,
    'Selecione grupo e unidade ativos.',
  );
  if (id) {
    const previous = await tx.material.findUnique({ where: { id } });
    ensure(previous, 404, 'Material não encontrado.');
    if (previous.unitId !== data.unitId)
      ensure(
        (await tx.documentItem.count({ where: { materialId: id } })) === 0,
        409,
        'A unidade de um material utilizado não pode ser alterada.',
      );
  }
  return id
    ? tx.material.update({ where: { id }, data })
    : tx.material.create({ data });
}
export async function saveStockSettings(
  tx: Prisma.TransactionClient,
  actor: Actor,
  input: unknown,
) {
  const data = stockSettingsSchema.parse(input);
  authorize(actor, data.locationId, managers);
  const { locationId, materialId, ...settings } = data;
  return tx.stock.upsert({
    where: { locationId_materialId: { locationId, materialId } },
    create: data,
    update: settings,
  });
}
