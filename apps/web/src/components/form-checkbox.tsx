import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';
import { Checkbox } from './ui/checkbox';

export function FormCheckbox<T extends FieldValues>({
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
    <Checkbox
      id={id}
      name={name}
      ref={ref}
      checked={value === true}
      onCheckedChange={(checked) => onChange(checked === true)}
      onBlur={onBlur}
    />
  );
}
