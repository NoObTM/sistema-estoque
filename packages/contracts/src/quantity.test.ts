import { describe, expect, it } from 'vitest';
import { fromMilliunits, receiveItem, toMilliunits } from './index';

describe('quantidades e recebimento parcial', () => {
  it('preserva três casas sem arredondamento binário', () => {
    expect(fromMilliunits(toMilliunits('0.1') + toMilliunits('0.2'))).toBe(
      '0.300',
    );
  });
  it.each(['-1', '1.0001', 'NaN', '1e3', ''])(
    'rejeita quantidade inválida %s',
    (value) => {
      expect(() => toMilliunits(value)).toThrow();
    },
  );
  it('recebe 18 de 20 e depois as 2 restantes', () => {
    const partial = receiveItem(
      { materialId: '1', sent: '20', received: '0' },
      '18',
    );
    expect(partial.received).toBe('18.000');
    expect(receiveItem(partial, '2').received).toBe('20.000');
  });
  it.each(['0', '-1', '2.001'])(
    'bloqueia recebimento inválido %s',
    (quantity) => {
      expect(() =>
        receiveItem({ materialId: '1', sent: '20', received: '18' }, quantity),
      ).toThrow();
    },
  );
});
