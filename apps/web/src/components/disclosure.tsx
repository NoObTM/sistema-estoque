import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

export function Disclosure({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <Collapsible className="history">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group h-auto w-full justify-between whitespace-normal text-left text-primary"
        >
          {title}
          <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
