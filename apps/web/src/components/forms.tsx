import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { NativeSelect } from './ui/native-select';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <Label htmlFor={id}>{label}</Label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        (child.type === Input ||
          child.type === Textarea ||
          child.type === NativeSelect ||
          ['input', 'select', 'textarea'].includes(String(child.type)))
          ? cloneElement(child as ReactElement<{ id?: string }>, { id })
          : child,
      )}
    </div>
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
      {mutation.isSuccess && (
        <p role="status" className="form-success">
          Operação concluída.
        </p>
      )}
    </>
  );
}
export function Loading() {
  return (
    <section className="panel" role="status">
      Carregando dados…
    </section>
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
    <section className="panel">
      <FormError error={error} />
      <Button onClick={retry}>Tentar novamente</Button>
    </section>
  );
}
