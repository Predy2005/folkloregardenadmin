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
        <TableHead onClick={() => toggleSort("name")} className="cursor-pointer select-none hover:bg-muted/50">
          Kontakt{sortIcon(sortColumn === "name", sortDirection)}
        </TableHead>
        <TableHead onClick={() => toggleSort("phone")} className="cursor-pointer select-none hover:bg-muted/50">
          Telefon{sortIcon(sortColumn === "phone", sortDirection)}
        </TableHead>
        <TableHead onClick={() => toggleSort("company")} className="cursor-pointer select-none hover:bg-muted/50">
          Firma{sortIcon(sortColumn === "company", sortDirection)}
        </TableHead>
        <TableHead className="cursor-pointer select-none hover:bg-muted/50">
          <span onClick={(e) => { e.stopPropagation(); toggleSort("invoiceIc"); }}>IČO</span>
          {sortIcon(sortColumn === "invoiceIc", sortDirection)}
          <span className="mx-1 text-muted-foreground">/</span>
          <span
            onClick={(e) => { e.stopPropagation(); toggleSort("invoiceDic"); }}
            className="hover:underline"
          >
            DIČ
          </span>
          {sortIcon(sortColumn === "invoiceDic", sortDirection)}
        </TableHead>
        <TableHead>Zdroj</TableHead>
        <TableHead className="text-right">Akce</TableHead>
      </TableRow>
    </TableHeader>
  );
}
