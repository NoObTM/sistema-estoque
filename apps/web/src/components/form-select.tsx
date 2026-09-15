import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { SelectInput, type SelectInputProps } from './select-input';

interface FormSelectProps<T extends FieldValues> extends Omit<
  SelectInputProps,
  'name' | 'value' | 'onValueChange' | 'ref'
> {
  control: Control<T>;
  name: FieldPath<T>;
}

export function FormSelect<T extends FieldValues>({
  control,
  name,
  required,
  ...props
}: FormSelectProps<T>) {
  const {
    field: { value, onChange, onBlur, ref },
    fieldState,
  } = useController({
    control,
    name,
    rules: { required: required ? 'Selecione uma opção.' : false },
  });
  const errorId = props.id ? `${props.id}-error` : undefined;
  return (
    <>
      <SelectInput
        {...props}
        name={name}
        ref={ref}
        value={typeof value === 'string' ? value : ''}
        onValueChange={onChange}
        onBlur={onBlur}
        required={required}
        aria-invalid={fieldState.invalid}
        aria-describedby={
          fieldState.error ? errorId : props['aria-describedby']
        }
      />
      {fieldState.error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {fieldState.error.message}
        </p>
      )}
    </>
  );
}
