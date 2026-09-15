import { Card } from '@/components/ui/card';
import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { SelectInput } from './select-input';
import { FormSelect } from './form-select';
import { Field as FieldLayout, FieldLabel } from './ui/field';
import { Checkbox } from './ui/checkbox';
import { FormCheckbox } from './form-checkbox';
import { DatePicker } from './date-picker';
import { FormDatePicker } from './form-date-picker';
import { Spinner } from './ui/spinner';
import { Alert, AlertDescription } from './ui/alert';
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <FieldLayout
      className={cn(
        'field min-w-0 gap-2 [&>[data-slot=checkbox]]:w-4',
        className,
      )}
    >
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        (child.type === Input ||
          child.type === Textarea ||
          child.type === SelectInput ||
          child.type === FormSelect ||
          child.type === Checkbox ||
          child.type === FormCheckbox ||
          child.type === DatePicker ||
          child.type === FormDatePicker ||
          ['input', 'select', 'textarea'].includes(String(child.type)))
          ? cloneElement(child as ReactElement<{ id?: string }>, { id })
          : child,
      )}
    </FieldLayout>
  );
}
export function FormError({ error }: { error: Error | null }) {
  return error ? (
    <Alert variant="destructive" className="mt-4">
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  ) : null;
}
export function MutationStatus({
  mutation,
}: {
  mutation: Pick<UseMutationResult, 'isPending' | 'error' | 'isSuccess'>;
}) {
  return (
    <>
      <FormError error={mutation.error} />
      {mutation.isSuccess && <StatusMessage>Operação concluída.</StatusMessage>}
    </>
  );
}
export function Loading() {
  return (
    <Card asChild className="block gap-0">
      <section className="panel" role="status">
        <Spinner aria-label="Carregando" className="mr-2 inline-block" />{' '}
        Carregando dados…
      </section>
    </Card>
  );
}

export function StatusMessage({ children }: { children: ReactNode }) {
  return (
    <Alert role="status" className="mt-4 border-emerald-200 bg-emerald-50">
      <AlertDescription className="text-emerald-800">
        {children}
      </AlertDescription>
    </Alert>
  );
}

export function InfoMessage({ children }: { children: ReactNode }) {
  return (
    <Alert role="note" className="my-4 border-border bg-muted">
      <AlertDescription className="w-full text-primary">
        {children}
      </AlertDescription>
    </Alert>
  );
}
export function ErrorPanel({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <Card asChild className="block gap-0">
      <section className="panel">
        <FormError error={error} />
        <Button onClick={retry}>Tentar novamente</Button>
      </section>
    </Card>
  );
}
