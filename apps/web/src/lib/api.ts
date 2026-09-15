import { useRef } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
export async function api<T>(
  path: string,
  options?: { method?: string; body?: unknown; key?: string },
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: options?.method ?? 'GET',
    credentials: 'include',
    headers: options
      ? {
          'Content-Type': 'application/json',
          ...(options.key ? { 'Idempotency-Key': options.key } : {}),
        }
      : {},
    body:
      options?.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.message ?? 'Não foi possível concluir a solicitação.');
  return data as T;
}
export function useData<T>(path: string, enabled = true) {
  return useQuery({
    queryKey: ['data', path],
    queryFn: () => api<T>(path),
    enabled,
  });
}
export function useCommand<T = unknown>() {
  const client = useQueryClient();
  const pending = useRef<{ signature: string; key: string } | null>(null);
  return useMutation({
    mutationFn: async (input: {
      path: string;
      body: unknown;
      method?: string;
    }) => {
      const signature = JSON.stringify(input);
      if (pending.current?.signature !== signature)
        pending.current = { signature, key: crypto.randomUUID() };
      const result = await api<T>(input.path, {
        method: input.method ?? 'POST',
        body: input.body,
        key: pending.current.key,
      });
      pending.current = null;
      return result;
    },
    onSuccess: async (_result, input) => {
      const resource = input.path.split('/')[1];
      const affected: Record<string, string[]> = {
        documents: ['/documents', '/stocks', '/reports', '/ledger', '/audit'],
        locations: ['/locations', '/destinations', '/reports', '/audit'],
        catalogs: ['/catalogs', '/materials', '/audit'],
        materials: [
          '/materials',
          '/stocks',
          '/reports',
          '/documents',
          '/audit',
        ],
        stocks: ['/stocks', '/reports', '/audit'],
        invitations: ['/users', '/audit'],
      };
      await client.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'data' &&
          (resource === 'users' ||
            (affected[resource ?? ''] ?? []).includes(
              String(query.queryKey[1]).split('?')[0]!,
            )),
      });
    },
  });
}
export function usePagedData<T extends { id: string }>(
  path: string,
  pageSize: number,
) {
  const query = useInfiniteQuery({
    queryKey: ['data', path, 'pages'],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      api<T[]>(
        `${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(pageParam)}`,
      ),
    getNextPageParam: (page) =>
      page.length === pageSize ? page.at(-1)?.id : undefined,
  });
  return { ...query, data: query.data?.pages.flat() };
}
export const money = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    Number(value),
  );
export const number = (value: string | number) =>
  new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(
    Number(value),
  );
export const dateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR');
export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  KEEPER: 'Almoxarife',
  REQUESTER: 'Solicitante',
  VIEWER: 'Consulta',
};
export const kindLabels: Record<string, string> = {
  ENTRY: 'Entrada',
  EXIT: 'Saída',
  TRANSFER: 'Transferência',
  REQUEST: 'Requisição',
  INVENTORY: 'Inventário',
  INITIAL: 'Saldo inicial',
  REVERSAL: 'Estorno',
};
export const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  SENT: 'Enviada',
  PARTIAL: 'Parcial',
  PENDING: 'Aguardando atendimento',
  CONFIRMED: 'Confirmada',
  CANCELLED: 'Cancelada',
  FULFILLED: 'Atendida',
  RECEIVED: 'Recebida',
  RESOLVED: 'Encerrada com divergência',
};
