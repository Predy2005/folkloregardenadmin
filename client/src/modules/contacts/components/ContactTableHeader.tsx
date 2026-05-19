import type { ReactNode } from "react";
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

// Native <button> uvnitř <th> — žádné role="button" / tabIndex hacky.
// Browser už ovládá Enter/Space, focus ring, screen reader announcement.
interface SortButtonProps {
  readonly active: boolean;
  readonly direction: "asc" | "desc";
  readonly onActivate: () => void;
  readonly children: ReactNode;
  readonly stopPropagation?: boolean;
}

function SortButton({ active, direction, onActivate, children, stopPropagation }: Readonly<SortButtonProps>) {
  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        onActivate();
      }}
      className="inline-flex items-center font-medium text-left hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
    >
      {children}{sortIcon(active, direction)}
    </button>
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
        <TableHead className="hover:bg-muted/50">
          <SortButton active={sortColumn === "name"} direction={sortDirection} onActivate={() => toggleSort("name")}>
            Kontakt
          </SortButton>
        </TableHead>
        <TableHead className="hover:bg-muted/50">
          <SortButton active={sortColumn === "phone"} direction={sortDirection} onActivate={() => toggleSort("phone")}>
            Telefon
          </SortButton>
        </TableHead>
        <TableHead className="hover:bg-muted/50">
          <SortButton active={sortColumn === "company"} direction={sortDirection} onActivate={() => toggleSort("company")}>
            Firma
          </SortButton>
        </TableHead>
        <TableHead>
          <SortButton
            active={sortColumn === "invoiceIc"}
            direction={sortDirection}
            onActivate={() => toggleSort("invoiceIc")}
            stopPropagation
          >
            IČO
          </SortButton>
          <span className="mx-1 text-muted-foreground">/</span>
          <SortButton
            active={sortColumn === "invoiceDic"}
            direction={sortDirection}
            onActivate={() => toggleSort("invoiceDic")}
            stopPropagation
          >
            DIČ
          </SortButton>
        </TableHead>
        <TableHead>Zdroj</TableHead>
        <TableHead className="text-right">Akce</TableHead>
      </TableRow>
    </TableHeader>
  );
}
