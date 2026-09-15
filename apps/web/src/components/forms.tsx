import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from 'react';
import type { UseMutationResult } from '@tanstack/react-query';
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
      <label htmlFor={id}>{label}</label>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        ['input', 'select', 'textarea'].includes(String(child.type))
          ? cloneElement(child as ReactElement<{ id?: string }>, { id })
          : child,
      )}
    </div>
  );
}
export function FormError({ error }: { error: Error | null }) {
  return error ? (
    <p className="form-error" role="alert">
      {error.message}
    </p>
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
      <button className="button" onClick={retry}>
        Tentar novamente
      </button>
    </section>
  );
}
