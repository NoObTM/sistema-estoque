import { Prisma } from '@estoque/database';
import { ensure } from '../core/errors';
const D = Prisma.Decimal;
export async function changeStock(
  tx: Prisma.TransactionClient,
  input: {
    locationId: string;
    materialId: string;
    delta: Prisma.Decimal;
    incomingCost?: Prisma.Decimal;
    reversalCost?: Prisma.Decimal;
    documentId: string;
    actorId: string;
  },
) {
  const { locationId, materialId, delta, documentId, actorId } = input;
  const stock = await tx.stock.upsert({
    where: { locationId_materialId: { locationId, materialId } },
    create: { locationId, materialId },
    update: {},
  });
  const quantity = stock.quantity.add(delta);
  ensure(
    quantity.gte(0),
    409,
    'Saldo insuficiente. Atualize os dados e confira as quantidades.',
  );
  ensure(
    quantity.lt('1000000000000'),
    400,
    'Quantidade acima do limite do estoque.',
  );
  const unitCost =
    input.reversalCost ?? input.incomingCost ?? stock.averageCost;
  const inventoryValue = stock.quantity
    .mul(stock.averageCost)
    .add(delta.mul(unitCost));
  ensure(
    !input.reversalCost || inventoryValue.gte(0),
    409,
    'O estorno deixaria o valor do estoque negativo. Regularize as movimentações posteriores primeiro.',
  );
  ensure(
    !input.reversalCost ||
      !quantity.isZero() ||
      inventoryValue.abs().lt('0.000001'),
    409,
    'O estorno deixaria valor sem quantidade. Regularize as movimentações posteriores primeiro.',
  );
  const averageCost =
    (delta.gt(0) || input.reversalCost) && quantity.gt(0)
      ? inventoryValue.div(quantity).toDecimalPlaces(6)
      : stock.averageCost;
  const result = await tx.stock.update({
    where: { id: stock.id },
    data: { quantity, averageCost, version: { increment: 1 } },
  });
  if (!delta.isZero())
    await tx.ledger.create({
      data: {
        locationId,
        materialId,
        documentId,
        delta,
        balance: quantity,
        unitCost,
        actorId,
      },
    });
  return { ...result, operationCost: unitCost };
}
export const decimal = (value: string | number) => new D(value);
