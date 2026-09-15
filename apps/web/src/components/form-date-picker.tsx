import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { DatePicker } from './date-picker';

export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  id,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  id?: string;
}) {
  const {
    field: { value, onChange, onBlur, ref },
  } = useController({ control, name });
  return (
    <DatePicker
      id={id}
      ref={ref}
      onBlur={onBlur}
      value={typeof value === 'string' ? value : ''}
      onValueChange={(date) => onChange(date || null)}
    />
  );
}
