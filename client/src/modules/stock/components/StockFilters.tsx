import { STOCK_UNIT_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { SearchInput } from "@/shared/components";
import { Package } from "lucide-react";

interface StockFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  unitFilter: string;
  setUnitFilter: (val: string) => void;
  supplierFilter: string;
  setSupplierFilter: (val: string) => void;
  stockLevelFilter: string;
  setStockLevelFilter: (val: string) => void;
  uniqueSuppliers: string[];
  totalCount: number;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onBulkChangeSupplier: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

export function StockFilters({
  search,
  setSearch,
  unitFilter,
  setUnitFilter,
  supplierFilter,
  setSupplierFilter,
  stockLevelFilter,
  setStockLevelFilter,
  uniqueSuppliers,
  totalCount,
  isSuperAdmin,
  selectedIds,
  onBulkChangeSupplier,
  onBulkDelete,
  onClearSelection,
}: StockFiltersProps) {
  return (
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Skladové položky
          </CardTitle>
          <CardDescription>
            Celkem: {totalCount} položek
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Hledat položku..."
            className="w-64"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-4 flex-wrap">
        <Select value={unitFilter} onValueChange={setUnitFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Všechny jednotky" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny jednotky</SelectItem>
            {Object.entries(STOCK_UNIT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={supplierFilter} onValueChange={setSupplierFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Všichni dodavatelé" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všichni dodavatelé</SelectItem>
            {uniqueSuppliers.map((supplier) => (
              <SelectItem key={supplier} value={supplier}>
                {supplier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={stockLevelFilter} onValueChange={setStockLevelFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Všechny" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všechny</SelectItem>
            <SelectItem value="low">Nízké zásoby</SelectItem>
            <SelectItem value="sufficient">Dostatečné zásoby</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {isSuperAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 mt-4 bg-primary/5 border rounded-lg">
          <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
          <Button size="sm" variant="outline" onClick={onBulkChangeSupplier}>
            Změnit dodavatele
          </Button>
          <Button size="sm" variant="destructive" onClick={onBulkDelete}>
            Smazat
          </Button>
          <Button size="sm" variant="ghost" onClick={onClearSelection}>
            Zrušit výběr
          </Button>
        </div>
      )}
    </CardHeader>
  );
}
