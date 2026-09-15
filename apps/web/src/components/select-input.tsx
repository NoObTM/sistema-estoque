import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

const EMPTY_OPTION = '__estoque_empty_selection__';

export interface SelectInputProps extends Omit<
  ComponentProps<typeof SelectTrigger>,
  'value' | 'defaultValue' | 'onChange' | 'children' | 'name'
> {
  value: string;
  onValueChange: (value: string) => void;
  name?: string;
  required?: boolean;
  emptyLabel?: string;
  options: { value: string; label: ReactNode; disabled?: boolean }[];
}

export function SelectInput({
  value,
  onValueChange,
  options,
  emptyLabel = 'Selecione',
  name,
  required,
  disabled,
  className,
  ...triggerProps
}: SelectInputProps) {
  return (
    <Select
      name={name}
      value={value || (required ? '' : EMPTY_OPTION)}
      onValueChange={(next) => onValueChange(next === EMPTY_OPTION ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger
        {...triggerProps}
        aria-required={required}
        className={cn('w-full min-w-0 bg-white text-left', className)}
      >
        <SelectValue placeholder={emptyLabel} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        align="start"
        className="max-h-72 max-w-[calc(100vw-2rem)] border-border"
      >
        {!required && (
          <SelectItem value={EMPTY_OPTION}>{emptyLabel}</SelectItem>
        )}
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </SelectItem>
        ))}
        {!options.length && (
          <SelectItem value="__estoque_no_options__" disabled>
            Nenhuma opção disponível
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
