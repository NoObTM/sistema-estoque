import { expect, it } from 'vitest';
import { initialStock, initialTransfers } from './data';
import { receiveTransfer } from './receive-transfer';

it('credita apenas o destino e conclui o recebimento pendente sem modificar o estado original', () => {
  const state = { stock: initialStock, transfers: initialTransfers };
  const result = receiveTransfer(state, 'TR-001', 'cimento', '2');
  expect(
    result.stock.find(
      (entry) =>
        entry.locationId === 'aurora' && entry.materialId === 'cimento',
    )?.quantity,
  ).toBe('20.000');
  expect(
    result.stock.find(
      (entry) =>
        entry.locationId === 'central' && entry.materialId === 'cimento',
    )?.quantity,
  ).toBe('180');
  expect(result.transfers[0]?.status).toBe('received');
  expect(state.transfers[0]?.status).toBe('partial');
  expect(() => receiveTransfer(result, 'TR-001', 'cimento', '2')).toThrow();
});

it('cria saldo no destino e conserva o total entre saldo e trânsito', () => {
  const result = receiveTransfer(
    { stock: initialStock, transfers: initialTransfers },
    'TR-002',
    'aco',
    '40.125',
  );
  expect(
    result.stock.find(
      (entry) => entry.locationId === 'parque' && entry.materialId === 'aco',
    )?.quantity,
  ).toBe('40.125');
  expect(result.transfers[1]?.items[0]?.received).toBe('40.125');
  expect(result.transfers[1]?.status).toBe('partial');
});
