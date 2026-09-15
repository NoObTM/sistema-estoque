import type { Role } from '@estoque/contracts/schemas';
export interface Actor {
  id: string;
  name: string;
  email: string;
  role: Role;
  locationIds: string[];
}
export interface Location {
  id: string;
  code: string;
  name: string;
  kind: string;
  address: string;
  responsible: string;
  active: boolean;
}
export interface Catalog {
  id: string;
  kind: string;
  code: string;
  name: string;
  details: string;
  locationId: string | null;
  active: boolean;
}
export interface Material {
  id: string;
  code: string;
  name: string;
  groupId: string;
  unitId: string;
  group: Catalog;
  unit: Catalog;
  barcode: string | null;
  ncm: string;
  reference: string;
  notes: string;
  weight: string;
  referenceCost: string;
  photo: string | null;
  active: boolean;
}
export interface Stock {
  id: string;
  locationId: string;
  materialId: string;
  quantity: string;
  averageCost: string;
  minimum: string;
  ideal: string;
  address: string;
  version: number;
  material: Material;
  location: Location;
}
export interface DocumentItem {
  id: string;
  materialId: string;
  quantity: string;
  completed: string;
  returned: string;
  lost: string;
  unitCost: string;
  material: Material;
}
export interface Document {
  attachments: { id: string; name: string; createdAt: string }[];
  id: string;
  number: number;
  kind: string;
  status: string;
  locationId: string;
  destinationId: string | null;
  supplierId: string | null;
  employeeId: string | null;
  costCenterId: string | null;
  reference: string;
  notes: string;
  neededAt: string | null;
  createdBy: string;
  createdAt: string;
  location: Location;
  destination: Location | null;
  items: DocumentItem[];
  corrections?: { id: string; kind: string; number: number }[];
  events: {
    id: string;
    kind: string;
    notes: string;
    actorId: string;
    createdAt: string;
    items: { materialId: string; quantity: string }[];
  }[];
}
export interface Ledger {
  id: string;
  createdAt: string;
  delta: string;
  balance: string;
  unitCost: string;
  actorId: string;
  location: Location;
  material: Material;
  document: Document;
}
export interface User extends Actor {
  active: boolean;
  memberships: { locationId: string }[];
}
