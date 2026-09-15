import { z } from 'zod';

// Strings decimais preservam a precisão no transporte entre navegador e API.
export const quantitySchema = z
  .string()
  .regex(
    /^\d{1,12}(\.\d{1,3})?$/,
    'Use um número positivo com até três casas decimais.',
  );

export function toMilliunits(value: string): bigint {
  const [whole, fraction = ''] = quantitySchema.parse(value).split('.');
  return BigInt(whole!) * 1000n + BigInt(fraction.padEnd(3, '0'));
}

export function fromMilliunits(value: bigint): string {
  if (value < 0n) throw new Error('A quantidade não pode ser negativa.');
  return `${value / 1000n}.${(value % 1000n).toString().padStart(3, '0')}`;
}

export const positiveQuantitySchema = quantitySchema.refine(
  (value) => toMilliunits(value) > 0n,
  'Informe uma quantidade maior que zero.',
);

export type TransferStatus =
  'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface TransferItem {
  materialId: string;
  sent: string;
  received: string;
}

/** Simulação pura de conferência. A API deverá aplicar a regra em transação. */
export function receiveItem(
  item: TransferItem,
  quantity: string,
): TransferItem {
  const amount = toMilliunits(positiveQuantitySchema.parse(quantity));
  const received = toMilliunits(item.received) + amount;
  if (received > toMilliunits(item.sent))
    throw new Error('O recebimento não pode superar a quantidade pendente.');
  return { ...item, received: fromMilliunits(received) };
}
