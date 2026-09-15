import { useState, type ComponentProps } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export interface DatePickerProps extends Omit<
  ComponentProps<typeof Button>,
  'value' | 'onChange' | 'children'
> {
  value: string;
  onValueChange: (value: string) => void;
}

export function DatePicker({
  value,
  onValueChange,
  ...props
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined;
  const selected = parsed && isValid(parsed) ? parsed : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          {...props}
          type="button"
          variant="outline"
          className="w-full min-w-40 justify-between bg-white font-normal"
        >
          {selected ? format(selected, 'dd/MM/yyyy') : 'Selecione a data'}
          <CalendarIcon aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto border-border p-0">
        <Calendar
          mode="single"
          locale={ptBR}
          labels={{
            labelNext: () => 'Próximo mês',
            labelPrevious: () => 'Mês anterior',
          }}
          defaultMonth={selected}
          selected={selected}
          onSelect={(date) => {
            onValueChange(date ? format(date, 'yyyy-MM-dd') : '');
            setOpen(false);
          }}
          autoFocus
        />
        <div className="flex justify-end border-t border-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onValueChange('');
              setOpen(false);
            }}
          >
            Limpar data
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
