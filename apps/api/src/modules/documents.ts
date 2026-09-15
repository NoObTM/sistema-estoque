import { Prisma } from '@estoque/database';
import { documentSchema, resolutionSchema } from '@estoque/contracts/schemas';
import { authorize, managers, operators, type Actor } from '../core/access';
import { ensure } from '../core/errors';
import { changeStock, decimal } from './stock';
import { saveAttachment } from './attachments';

export const documentInclude = {
  attachments: { select: { id: true, name: true, createdAt: true } },
  items: { include: { material: { include: { unit: true } } } },
  location: true,
  destination: true,
  events: { orderBy: { createdAt: 'asc' as const } },
};
async function activeLocation(tx: Prisma.TransactionClient, id: string) {
  ensure(
    (await tx.location.findUnique({ where: { id } }))?.active,
    400,
    'A obra precisa estar ativa.',
  );
}
async function catalogReference(
  tx: Prisma.TransactionClient,
  id: string | null,
  kind: string,
  locationId: string,
) {
  if (!id) return;
  const entity = await tx.catalog.findUnique({ where: { id } });
  ensure(
    entity?.active &&
      entity.kind === kind &&
      (!entity.locationId || entity.locationId === locationId),
    400,
    'Fornecedor, funcionário ou centro de custo inválido para esta obra.',
  );
}
export async function saveDocument(
  tx: Prisma.TransactionClient,
  actor: Actor,
  raw: unknown,
  id?: string,
) {
  const input = documentSchema.parse(raw);
  authorize(
    actor,
    input.locationId,
    input.kind === 'REQUEST'
      ? ['ADMIN', 'MANAGER', 'KEEPER', 'REQUESTER']
      : ['INITIAL', 'INVENTORY'].includes(input.kind)
        ? managers
        : operators,
  );
  await activeLocation(tx, input.locationId);
  if (input.kind === 'TRANSFER') await activeLocation(tx, input.destinationId!);
  else ensure(!input.destinationId, 400, 'Somente transferências têm destino.');
  await catalogReference(tx, input.supplierId, 'SUPPLIER', input.locationId);
  await catalogReference(tx, input.employeeId, 'EMPLOYEE', input.locationId);
  await catalogReference(
    tx,
    input.costCenterId,
    'COST_CENTER',
    input.locationId,
  );
  if (id) {
    const previous = await tx.document.findUnique({ where: { id } });
    ensure(
      previous?.status === 'DRAFT' &&
        previous.kind === input.kind &&
        previous.locationId === input.locationId,
      409,
      'Somente rascunhos podem ser editados, preservando tipo e local.',
    );
    if (actor.role === 'REQUESTER')
      ensure(
        previous.createdBy === actor.id,
        403,
        'Requisição de outro usuário.',
      );
    await tx.documentItem.deleteMany({ where: { documentId: id } });
  }
  const items = [];
  for (const item of input.items) {
    ensure(
      (await tx.material.findUnique({ where: { id: item.materialId } }))
        ?.active,
      400,
      'Material inativo ou inexistente.',
    );
    const stock = await tx.stock.findUnique({
      where: {
        locationId_materialId: {
          locationId: input.locationId,
          materialId: item.materialId,
        },
      },
    });
    items.push({
      ...item,
      baseVersion: stock?.version ?? 0,
      baseQuantity: stock?.quantity ?? decimal(0),
    });
  }
  const { items: _items, ...data } = input;
  void _items;
  return id
    ? tx.document.update({
        where: { id },
        data: { ...data, items: { create: items } },
        include: documentInclude,
      })
    : tx.document.create({
        data: { ...data, createdBy: actor.id, items: { create: items } },
        include: documentInclude,
      });
}
export async function confirmDocument(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
) {
  const doc = await tx.document.findUnique({
    where: { id },
    include: documentInclude,
  });
  ensure(doc, 404, 'Documento não encontrado.');
  authorize(
    actor,
    doc.locationId,
    doc.kind === 'REQUEST'
      ? ['ADMIN', 'MANAGER', 'KEEPER', 'REQUESTER']
      : ['INITIAL', 'INVENTORY'].includes(doc.kind)
        ? managers
        : operators,
  );
  if (actor.role === 'REQUESTER')
    ensure(doc.createdBy === actor.id, 403, 'Requisição de outro usuário.');
  ensure(
    doc.status === 'DRAFT',
    409,
    'Este documento já foi confirmado ou cancelado.',
  );
  await activeLocation(tx, doc.locationId);
  if (doc.destinationId) await activeLocation(tx, doc.destinationId);
  await catalogReference(tx, doc.supplierId, 'SUPPLIER', doc.locationId);
  await catalogReference(tx, doc.employeeId, 'EMPLOYEE', doc.locationId);
  await catalogReference(tx, doc.costCenterId, 'COST_CENTER', doc.locationId);
  for (const item of doc.items) {
    ensure(
      item.material.active,
      409,
      'Um material foi desativado. Revise o documento.',
    );
    if (doc.kind === 'REQUEST') continue;
    const stock = await tx.stock.findUnique({
      where: {
        locationId_materialId: {
          locationId: doc.locationId,
          materialId: item.materialId,
        },
      },
    });
    if (doc.kind === 'INVENTORY')
      ensure(
        (stock?.version ?? 0) === item.baseVersion,
        409,
        'O saldo mudou desde a contagem. Edite e confira o inventário novamente.',
      );
    if (doc.kind === 'INITIAL')
      ensure(
        !stock || stock.version === 0,
        409,
        'Saldo inicial só pode ser lançado antes da primeira movimentação.',
      );
    const delta =
      doc.kind === 'INVENTORY'
        ? item.quantity.sub(stock?.quantity ?? 0)
        : ['EXIT', 'TRANSFER'].includes(doc.kind)
          ? item.quantity.neg()
          : item.quantity;
    const incomingCost = ['ENTRY', 'INITIAL'].includes(doc.kind)
      ? item.unitCost
      : undefined;
    const changed = await changeStock(tx, {
      locationId: doc.locationId,
      materialId: item.materialId,
      delta,
      incomingCost,
      documentId: doc.id,
      actorId: actor.id,
    });
    await tx.documentItem.update({
      where: { id: item.id },
      data: { unitCost: changed.operationCost },
    });
  }
  return tx.document.update({
    where: { id },
    data: {
      status:
        doc.kind === 'TRANSFER'
          ? 'SENT'
          : doc.kind === 'REQUEST'
            ? 'PENDING'
            : 'CONFIRMED',
      confirmedAt: new Date(),
      confirmedBy: actor.id,
    },
    include: documentInclude,
  });
}
export async function cancelDocument(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
) {
  const doc = await tx.document.findUnique({ where: { id } });
  ensure(doc, 404, 'Documento não encontrado.');
  authorize(
    actor,
    doc.locationId,
    doc.kind === 'REQUEST'
      ? ['ADMIN', 'MANAGER', 'KEEPER', 'REQUESTER']
      : operators,
  );
  if (actor.role === 'REQUESTER')
    ensure(doc.createdBy === actor.id, 403, 'Requisição de outro usuário.');
  ensure(
    doc.status === 'DRAFT',
    409,
    'Somente rascunhos podem ser cancelados.',
  );
  return tx.document.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: documentInclude,
  });
}
export async function resolveDocument(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  raw: unknown,
) {
  const input = resolutionSchema.parse(raw);
  const doc = await tx.document.findUnique({
    where: { id },
    include: documentInclude,
  });
  ensure(doc, 404, 'Documento não encontrado.');
  const isRequest = input.action === 'FULFILL';
  ensure(
    isRequest
      ? doc.kind === 'REQUEST' && ['PENDING', 'PARTIAL'].includes(doc.status)
      : doc.kind === 'TRANSFER' && ['SENT', 'PARTIAL'].includes(doc.status),
    409,
    'Documento não está pendente para esta operação.',
  );
  const target =
    input.action === 'RECEIVE' ? doc.destinationId! : doc.locationId;
  authorize(
    actor,
    target,
    ['LOSS', 'RETURN'].includes(input.action) ? managers : operators,
  );
  await activeLocation(tx, target);
  let linkedId = doc.id;
  if (isRequest) {
    await catalogReference(tx, doc.employeeId, 'EMPLOYEE', doc.locationId);
    await catalogReference(tx, doc.costCenterId, 'COST_CENTER', doc.locationId);
    const exit = await tx.document.create({
      data: {
        kind: 'EXIT',
        status: 'CONFIRMED',
        locationId: doc.locationId,
        employeeId: doc.employeeId,
        costCenterId: doc.costCenterId,
        createdBy: actor.id,
        confirmedBy: actor.id,
        confirmedAt: new Date(),
        originalId: id,
        notes: input.notes,
      },
    });
    linkedId = exit.id;
  }
  for (const line of input.items) {
    const item = doc.items.find((i) => i.materialId === line.materialId);
    ensure(item, 400, 'Material não pertence ao documento.');
    const quantity = decimal(line.quantity);
    ensure(
      quantity.lte(
        item.quantity.sub(item.completed).sub(item.returned).sub(item.lost),
      ),
      409,
      'Quantidade maior que a pendência do item.',
    );
    if (input.action !== 'LOSS') {
      const changed = await changeStock(tx, {
        locationId: target,
        materialId: item.materialId,
        delta: isRequest ? quantity.neg() : quantity,
        incomingCost: isRequest ? undefined : item.unitCost,
        documentId: linkedId,
        actorId: actor.id,
      });
      if (isRequest)
        await tx.documentItem.create({
          data: {
            documentId: linkedId,
            materialId: item.materialId,
            quantity,
            unitCost: changed.operationCost,
          },
        });
    }
    await tx.documentItem.update({
      where: { id: item.id },
      data:
        input.action === 'LOSS'
          ? { lost: { increment: quantity } }
          : input.action === 'RETURN'
            ? { returned: { increment: quantity } }
            : { completed: { increment: quantity } },
    });
  }
  const items = await tx.documentItem.findMany({ where: { documentId: id } });
  await saveAttachment(tx, id, actor.id, input.attachment);
  const finished = items.every((i) =>
    i.quantity.eq(i.completed.add(i.returned).add(i.lost)),
  );
  const divergent = items.some((i) => i.returned.gt(0) || i.lost.gt(0));
  await tx.documentEvent.create({
    data: {
      documentId: id,
      kind: input.action,
      actorId: actor.id,
      notes: input.notes,
      items: input.items,
    },
  });
  return tx.document.update({
    where: { id },
    data: {
      status: finished
        ? isRequest
          ? 'FULFILLED'
          : divergent
            ? 'RESOLVED'
            : 'RECEIVED'
        : 'PARTIAL',
    },
    include: documentInclude,
  });
}
export async function reverseDocument(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  notes: string,
) {
  const doc = await tx.document.findUnique({
    where: { id },
    include: { ledger: true },
  });
  ensure(doc, 404, 'Documento não encontrado.');
  authorize(actor, doc.locationId, managers);
  ensure(
    doc.status === 'CONFIRMED' &&
      ['ENTRY', 'EXIT', 'INITIAL', 'INVENTORY'].includes(doc.kind) &&
      !doc.originalId,
    409,
    'Documento não permite estorno direto. Transferências e atendimentos usam operações próprias.',
  );
  ensure(
    (await tx.document.count({
      where: { originalId: id, kind: 'REVERSAL' },
    })) === 0,
    409,
    'Documento já estornado.',
  );
  const reversal = await tx.document.create({
    data: {
      kind: 'REVERSAL',
      status: 'CONFIRMED',
      locationId: doc.locationId,
      createdBy: actor.id,
      confirmedBy: actor.id,
      confirmedAt: new Date(),
      originalId: id,
      notes,
    },
  });
  for (const line of doc.ledger)
    await changeStock(tx, {
      locationId: line.locationId,
      materialId: line.materialId,
      delta: line.delta.neg(),
      incomingCost: line.delta.lt(0) ? line.unitCost : undefined,
      reversalCost: line.unitCost,
      documentId: reversal.id,
      actorId: actor.id,
    });
  // Documento original permanece imutável; o vínculo permite identificar o estorno.
  return reversal;
}
