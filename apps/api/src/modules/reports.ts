import { Prisma } from '@estoque/database';
import type { Actor } from '../core/access';
import { authorize } from '../core/access';
import { db } from '../database';
import { dateRange } from '../core/date-range';
export async function report(
  actor: Actor,
  locationId?: string,
  from?: string,
  to?: string,
) {
  authorize(actor, locationId, ['ADMIN', 'MANAGER', 'KEEPER', 'VIEWER']);
  const local =
    locationId ??
    (actor.role === 'ADMIN' ? undefined : { in: actor.locationIds });
  const [stocks, entries, transfers] = await Promise.all([
    db.stock.findMany({
      where: { locationId: local },
      include: { location: true, material: { include: { unit: true } } },
    }),
    db.ledger.findMany({
      where: {
        locationId: local,
        createdAt: dateRange(from, to),
      },
      include: { document: { include: { original: true } } },
    }),
    db.document.count({
      where: {
        kind: 'TRANSFER',
        status: { in: ['SENT', 'PARTIAL'] },
        ...(local
          ? { OR: [{ locationId: local }, { destinationId: local }] }
          : {}),
      },
    }),
  ]);
  const totalValue = stocks.reduce(
    (sum, s) => sum.add(s.quantity.mul(s.averageCost)),
    new Prisma.Decimal(0),
  );
  const costCenters = await db.catalog.findMany({
    where: { kind: 'COST_CENTER', ...(local ? { locationId: local } : {}) },
  });
  const consumption = costCenters.map((center) => {
    const lines = entries.filter(
      (e) =>
        (e.document.kind === 'EXIT' && e.document.costCenterId === center.id) ||
        (e.document.kind === 'REVERSAL' &&
          e.document.original?.kind === 'EXIT' &&
          e.document.original.costCenterId === center.id),
    );
    return {
      id: center.id,
      name: center.name,
      value: lines
        .reduce(
          (sum, line) => sum.sub(line.delta.mul(line.unitCost)),
          new Prisma.Decimal(0),
        )
        .toFixed(2),
      documents: new Set(lines.map((l) => l.documentId)).size,
    };
  });
  return {
    transit: await db.documentItem
      .findMany({
        where: {
          document: {
            kind: 'TRANSFER',
            status: { in: ['SENT', 'PARTIAL'] },
            ...(local
              ? { OR: [{ locationId: local }, { destinationId: local }] }
              : {}),
          },
        },
        include: {
          material: { include: { unit: true } },
          document: { include: { location: true, destination: true } },
        },
      })
      .then((items) =>
        items
          .map((item) => ({
            id: item.id,
            document: item.document.number,
            origin: item.document.location.name,
            destination: item.document.destination?.name ?? '',
            material: item.material.name,
            unit: item.material.unit.code,
            pending: item.quantity
              .sub(item.completed)
              .sub(item.returned)
              .sub(item.lost)
              .toFixed(3),
          }))
          .filter((item) => item.pending !== '0.000'),
      ),
    totalValue: totalValue.toFixed(2),
    materialCount: new Set(
      stocks.filter((s) => s.quantity.gt(0)).map((s) => s.materialId),
    ).size,
    lowCount: stocks.filter((s) => s.quantity.lt(s.minimum)).length,
    pendingCount: transfers,
    consumption,
    stock: stocks.map((s) => ({
      ...s,
      value: s.quantity.mul(s.averageCost).toFixed(2),
      low: s.quantity.lt(s.minimum),
    })),
  };
}
