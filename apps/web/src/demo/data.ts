import type { TransferItem, TransferStatus } from '@estoque/contracts';

export const locations = [
  { id: 'central', name: 'Almoxarifado central', detail: 'Depósito · Sede' },
  { id: 'aurora', name: 'Residencial Aurora', detail: 'Obra · Estrutura' },
  { id: 'parque', name: 'Edifício Parque Sul', detail: 'Obra · Acabamento' },
];

export const materials = [
  {
    id: 'cimento',
    code: 'MAT-001',
    name: 'Cimento CP II · 50 kg',
    group: 'Cimentos e argamassas',
    unit: 'sc',
  },
  {
    id: 'aco',
    code: 'MAT-002',
    name: 'Vergalhão CA-50 · 10 mm',
    group: 'Aço e ferragens',
    unit: 'kg',
  },
  {
    id: 'bloco',
    code: 'MAT-003',
    name: 'Bloco cerâmico · 14 × 19 × 29',
    group: 'Alvenaria',
    unit: 'un',
  },
  {
    id: 'areia',
    code: 'MAT-004',
    name: 'Areia média lavada',
    group: 'Agregados',
    unit: 'm³',
  },
];

export interface Stock {
  locationId: string;
  materialId: string;
  quantity: string;
  minimum: string;
  address: string;
}

export const initialStock: Stock[] = [
  {
    locationId: 'central',
    materialId: 'cimento',
    quantity: '180',
    minimum: '50',
    address: 'Galpão A · A01',
  },
  {
    locationId: 'central',
    materialId: 'aco',
    quantity: '1250',
    minimum: '400',
    address: 'Pátio · B02',
  },
  {
    locationId: 'aurora',
    materialId: 'cimento',
    quantity: '18',
    minimum: '30',
    address: 'Térreo · A01',
  },
  {
    locationId: 'aurora',
    materialId: 'bloco',
    quantity: '2400',
    minimum: '1000',
    address: 'Pátio · C01',
  },
  {
    locationId: 'aurora',
    materialId: 'areia',
    quantity: '3.500',
    minimum: '5',
    address: 'Baia 02',
  },
  {
    locationId: 'parque',
    materialId: 'cimento',
    quantity: '42',
    minimum: '20',
    address: 'Depósito · A01',
  },
];

export interface Transfer {
  id: string;
  originId: string;
  destinationId: string;
  date: string;
  status: TransferStatus;
  items: TransferItem[];
}

// A origem já foi debitada nas transferências enviadas deste cenário.
export const initialTransfers: Transfer[] = [
  {
    id: 'TR-001',
    originId: 'central',
    destinationId: 'aurora',
    date: '2026-09-15',
    status: 'partial',
    items: [{ materialId: 'cimento', sent: '20', received: '18' }],
  },
  {
    id: 'TR-002',
    originId: 'central',
    destinationId: 'parque',
    date: '2026-09-15',
    status: 'sent',
    items: [{ materialId: 'aco', sent: '100', received: '0' }],
  },
];

export const locationName = (id: string) =>
  locations.find((location) => location.id === id)?.name ?? id;
export const materialById = (id: string) => {
  const material = materials.find((entry) => entry.id === id);
  if (!material) throw new Error(`Material não encontrado: ${id}`);
  return material;
};
