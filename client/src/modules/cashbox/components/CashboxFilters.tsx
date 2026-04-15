import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Card, CardContent,
} from "@/shared/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { Filter, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Label } from "@/shared/components/ui/label";
import { CategoryCombobox } from "@/shared/components/CategoryCombobox";

export interface CashboxFiltersState {
  dateFrom: string;
  dateTo: string;
  category: string;
  movementType: string;
  currency: string;
}

export const emptyFilters: CashboxFiltersState = {
  dateFrom: "",
  dateTo: "",
  category: "",
  movementType: "",
  currency: "",
};

interface CashboxFiltersProps {
  filters: CashboxFiltersState;
  showFilters: boolean;
  onToggleFilters: () => void;
  onUpdateFilter: (key: keyof CashboxFiltersState, value: string) => void;
  onClearFilters: () => void;
  totalMovements: number;
}

export function CashboxFilters({
  filters,
  showFilters,
  onToggleFilters,
  onUpdateFilter,
  onClearFilters,
  totalMovements,
}: CashboxFiltersProps) {
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant={showFilters ? "default" : "outline"}
          size="sm"
          onClick={onToggleFilters}
        >
          <Filter className="w-4 h-4 mr-1" />
          Filtry
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X className="w-4 h-4 mr-1" /> Vymazat filtry
          </Button>
        )}
        {activeFilterCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {totalMovements} výsledků
          </span>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <Label className="text-xs">Datum od</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => onUpdateFilter("dateFrom", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Datum do</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => onUpdateFilter("dateTo", e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Typ pohybu</Label>
                <Select value={filters.movementType || "ALL"} onValueChange={(v) => onUpdateFilter("movementType", v === "ALL" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Vše</SelectItem>
                    <SelectItem value="INCOME">Příjem</SelectItem>
                    <SelectItem value="EXPENSE">Výdaj</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Kategorie</Label>
                <CategoryCombobox
                  value={filters.category}
                  onChange={(v) => onUpdateFilter("category", v)}
                  type={filters.movementType === "INCOME" ? "INCOME" : "EXPENSE"}
                  placeholder="Vše"
                />
              </div>
              <div>
                <Label className="text-xs">Měna</Label>
                <Select value={filters.currency || "ALL"} onValueChange={(v) => onUpdateFilter("currency", v === "ALL" ? "" : v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Vše</SelectItem>
                    <SelectItem value="CZK">CZK</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.dateFrom && (
            <Badge variant="outline" className="gap-1">
              Od: {filters.dateFrom}
              <button type="button" onClick={() => onUpdateFilter("dateFrom", "")}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="outline" className="gap-1">
              Do: {filters.dateTo}
              <button type="button" onClick={() => onUpdateFilter("dateTo", "")}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.movementType && (
            <Badge variant="outline" className="gap-1">
              {filters.movementType === "INCOME" ? "Příjem" : "Výdaj"}
              <button type="button" onClick={() => onUpdateFilter("movementType", "")}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.category && (
            <Badge variant="outline" className="gap-1">
              {filters.category}
              <button type="button" onClick={() => onUpdateFilter("category", "")}><X className="w-3 h-3" /></button>
            </Badge>
          )}
          {filters.currency && (
            <Badge variant="outline" className="gap-1">
              {filters.currency}
              <button type="button" onClick={() => onUpdateFilter("currency", "")}><X className="w-3 h-3" /></button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
