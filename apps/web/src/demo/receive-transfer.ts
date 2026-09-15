import { fromMilliunits, receiveItem, toMilliunits } from '@estoque/contracts';
import type { Stock, Transfer } from './data';

export interface DemoState {
  stock: Stock[];
  transfers: Transfer[];
}

export function receiveTransfer(
  state: DemoState,
  transferId: string,
  materialId: string,
  quantity: string,
): DemoState {
  const transfer = state.transfers.find((entry) => entry.id === transferId);
  if (!transfer || !['sent', 'partial'].includes(transfer.status))
    throw new Error('Transferência indisponível para recebimento.');
  const item = transfer.items.find((entry) => entry.materialId === materialId);
  if (!item) throw new Error('Item não encontrado.');
  const updatedItem = receiveItem(item, quantity);
  const items = transfer.items.map((entry) =>
    entry === item ? updatedItem : entry,
  );
  const existing = state.stock.find(
    (entry) =>
      entry.locationId === transfer.destinationId &&
      entry.materialId === materialId,
  );
  const updatedStock: Stock = {
    locationId: transfer.destinationId,
    materialId,
    minimum: existing?.minimum ?? '0',
    address: existing?.address ?? 'A definir',
    quantity: fromMilliunits(
      toMilliunits(existing?.quantity ?? '0') + toMilliunits(quantity),
    ),
  };
  return {
    transfers: state.transfers.map((entry) =>
      entry === transfer
        ? {
            ...transfer,
            items,
            status: items.every(
              (line) => toMilliunits(line.received) === toMilliunits(line.sent),
            )
              ? 'received'
              : 'partial',
          }
        : entry,
    ),
    stock: existing
      ? state.stock.map((entry) => (entry === existing ? updatedStock : entry))
      : [...state.stock, updatedStock],
  };
}
