import { z } from 'zod';
import { positiveQuantitySchema, quantitySchema } from './index';

export const roles = [
  'ADMIN',
  'MANAGER',
  'KEEPER',
  'REQUESTER',
  'VIEWER',
] as const;
export const roleSchema = z.enum(roles);
export const idSchema = z.string().min(1).max(100);
const text = z.string().trim().max(200);
export const moneySchema = z
  .string()
  .regex(
    /^\d{1,12}(\.\d{1,6})?$/,
    'Informe um valor com até seis casas decimais.',
  );
export const locationSchema = z.object({
  code: text.min(1),
  name: text.min(2),
  kind: z.enum(['SITE', 'WAREHOUSE']),
  address: text.default(''),
  responsible: text.default(''),
  active: z.boolean().default(true),
});
export const catalogKinds = [
  'GROUP',
  'UNIT',
  'SUPPLIER',
  'EMPLOYEE',
  'COST_CENTER',
] as const;
export const catalogSchema = z.object({
  kind: z.enum(catalogKinds),
  code: text.min(1),
  name: text.min(1),
  details: z.string().max(2000).default(''),
  locationId: idSchema.nullable().default(null),
  active: z.boolean().default(true),
});
export const materialSchema = z.object({
  code: text.min(1),
  name: text.min(2),
  groupId: idSchema,
  unitId: idSchema,
  barcode: text.nullable().default(null),
  ncm: text.default(''),
  reference: text.default(''),
  notes: z.string().max(2000).default(''),
  weight: quantitySchema.default('0'),
  referenceCost: moneySchema.default('0'),
  photo: z
    .string()
    .max(1_500_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .nullable()
    .default(null),
  active: z.boolean().default(true),
});
export const documentKinds = [
  'ENTRY',
  'EXIT',
  'TRANSFER',
  'REQUEST',
  'INVENTORY',
  'INITIAL',
] as const;
export const documentSchema = z
  .object({
    kind: z.enum(documentKinds),
    locationId: idSchema,
    destinationId: idSchema.nullable().default(null),
    supplierId: idSchema.nullable().default(null),
    employeeId: idSchema.nullable().default(null),
    costCenterId: idSchema.nullable().default(null),
    reference: text.default(''),
    notes: z.string().max(2000).default(''),
    neededAt: z.string().date().nullable().default(null),
    items: z
      .array(
        z.object({
          materialId: idSchema,
          quantity: quantitySchema,
          unitCost: moneySchema.default('0'),
        }),
      )
      .min(1)
      .max(100),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.items.map((i) => i.materialId)).size !== value.items.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'Não repita materiais no mesmo documento.',
      });
    if (
      value.kind !== 'INVENTORY' &&
      value.items.some(
        (i) => !positiveQuantitySchema.safeParse(i.quantity).success,
      )
    )
      ctx.addIssue({
        code: 'custom',
        path: ['items'],
        message: 'As quantidades devem ser maiores que zero.',
      });
    if (
      value.kind === 'TRANSFER' &&
      (!value.destinationId || value.destinationId === value.locationId)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['destinationId'],
        message: 'Selecione um destino diferente da origem.',
      });
    if (value.kind === 'ENTRY' && !value.supplierId)
      ctx.addIssue({
        code: 'custom',
        path: ['supplierId'],
        message: 'Informe o fornecedor.',
      });
    if (
      ['EXIT', 'REQUEST'].includes(value.kind) &&
      (!value.employeeId || !value.costCenterId)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Informe funcionário e centro de custo.',
      });
    if (
      ['INVENTORY', 'INITIAL'].includes(value.kind) &&
      value.notes.trim().length < 5
    )
      ctx.addIssue({
        code: 'custom',
        path: ['notes'],
        message: 'Informe uma justificativa com pelo menos cinco caracteres.',
      });
  });
export const resolutionSchema = z
  .object({
    action: z.enum(['RECEIVE', 'RETURN', 'LOSS', 'FULFILL']),
    attachment: z
      .object({
        name: z.string().min(1).max(200),
        content: z.string().max(1_400_000),
      })
      .optional(),
    notes: z
      .string()
      .trim()
      .min(5, 'Informe a observação da conferência.')
      .max(2000),
    items: z
      .array(
        z.object({ materialId: idSchema, quantity: positiveQuantitySchema }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    (v) => new Set(v.items.map((i) => i.materialId)).size === v.items.length,
    'Não repita materiais.',
  );
export const stockSettingsSchema = z.object({
  locationId: idSchema,
  materialId: idSchema,
  minimum: quantitySchema,
  ideal: quantitySchema,
  address: text,
});
export const invitationSchema = z.object({
  email: z.email(),
  name: text.min(2),
  role: roleSchema,
  locationIds: z.array(idSchema).max(200),
});
export type DocumentInput = z.infer<typeof documentSchema>;
export type ResolutionInput = z.infer<typeof resolutionSchema>;
export type Role = z.infer<typeof roleSchema>;
