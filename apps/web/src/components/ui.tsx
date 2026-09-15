import type { ReactNode } from 'react';
import { Badge as StatusBadge } from './ui/badge';
import { Empty, EmptyDescription } from './ui/empty';

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warning' | 'success';
}) {
  return (
    <StatusBadge variant="outline" className={`badge ${tone}`}>
      {children}
    </StatusBadge>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <Empty>
      <EmptyDescription>{children}</EmptyDescription>
    </Empty>
  );
}

const quantityFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 3,
});
// Conversão apenas de apresentação; operações usam inteiros em milésimos.
export const formatQuantity = (quantity: string) =>
  quantityFormatter.format(Number(quantity));
