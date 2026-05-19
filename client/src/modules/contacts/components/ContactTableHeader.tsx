import type { KeyboardEvent, ReactNode } from "react";
import { TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { ContactSortColumn } from "../hooks/useContactsSort";

interface ContactTableHeaderProps {
  readonly sortColumn: ContactSortColumn | null;
  readonly sortDirection: "asc" | "desc";
  readonly toggleSort: (col: ContactSortColumn) => void;
  readonly pageAllSelected: boolean;
  readonly pageSomeSelected: boolean;
  readonly onToggleSelectAll: () => void;
}

const sortIcon = (active: boolean, direction: "asc" | "desc") => {
  if (!active) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40 inline-block" />;
  return direction === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3 inline-block" />
    : <ArrowDown className="ml-1 h-3 w-3 inline-block" />;
};

// jsx-a11y: non-interactive elementy (TableHead = <th>, span) s onClick musí
// být tabbable + reagovat na Enter/Space. Helper sjednocuje accessibility
// boilerplate pro klikací sort triggery.
const activateOnKey = (handler: () => void) => (e: KeyboardEvent<HTMLElement>) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    handler();
  }
};

interface SortableHeadProps {
  readonly active: boolean;
  readonly direction: "asc" | "desc";
  readonly onActivate: () => void;
  readonly children: ReactNode;
}

function SortableHead({ active, direction, onActivate, children }: Readonly<SortableHeadProps>) {
  return (
    <TableHead
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={activateOnKey(onActivate)}
      className="cursor-pointer select-none hover:bg-muted/50"
    >
      {children}{sortIcon(active, direction)}
    </TableHead>
  );
}

interface SortableSpanProps {
  readonly onActivate: () => void;
  readonly children: ReactNode;
  readonly className?: string;
}

function SortableSpan({ onActivate, children, className }: Readonly<SortableSpanProps>) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onActivate(); }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onActivate();
        }
      }}
      className={className}
    >
      {children}
    </span>
  );
}

export function ContactTableHeader({
  sortColumn,
  sortDirection,
  toggleSort,
  pageAllSelected,
  pageSomeSelected,
  onToggleSelectAll,
}: Readonly<ContactTableHeaderProps>) {
  const checkboxState: boolean | "indeterminate" =
    pageAllSelected ? true : pageSomeSelected ? "indeterminate" : false;

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="w-[40px]">
          <Checkbox checked={checkboxState} onCheckedChange={onToggleSelectAll} />
        </TableHead>
        <SortableHead active={sortColumn === "name"} direction={sortDirection} onActivate={() => toggleSort("name")}>
          Kontakt
        </SortableHead>
        <SortableHead active={sortColumn === "phone"} direction={sortDirection} onActivate={() => toggleSort("phone")}>
          Telefon
        </SortableHead>
        <SortableHead active={sortColumn === "company"} direction={sortDirection} onActivate={() => toggleSort("company")}>
          Firma
        </SortableHead>
        <TableHead className="select-none">
          <SortableSpan onActivate={() => toggleSort("invoiceIc")}>IČO</SortableSpan>
          {sortIcon(sortColumn === "invoiceIc", sortDirection)}
          <span className="mx-1 text-muted-foreground">/</span>
          <SortableSpan onActivate={() => toggleSort("invoiceDic")} className="hover:underline">
            DIČ
          </SortableSpan>
          {sortIcon(sortColumn === "invoiceDic", sortDirection)}
        </TableHead>
        <TableHead>Zdroj</TableHead>
        <TableHead className="text-right">Akce</TableHead>
      </TableRow>
    </TableHeader>
  );
}
