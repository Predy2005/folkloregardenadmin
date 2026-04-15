import type { DrinkItem, DrinkCategory } from "@shared/types";
import { DRINK_CATEGORY_LABELS } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { SearchInput } from "@/shared/components";
import { Pencil, Trash2, Wine, ChevronDown, Power, PowerOff } from "lucide-react";
import { EmptyState } from "@/shared/components";

const CATEGORIES: DrinkCategory[] = ["BEER", "WINE", "SPIRIT", "SOFT", "COCKTAIL", "OTHER"];

interface DrinksTableProps {
  drinks?: DrinkItem[];
  filteredDrinks?: DrinkItem[];
  isLoading: boolean;
  search: string;
  setSearch: (val: string) => void;
  categoryFilter: string;
  setCategoryFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  alcoholicFilter: string;
  setAlcoholicFilter: (val: string) => void;
  selected: Set<number>;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: () => void;
  onBulkAction: (action: string) => void;
  onEdit: (drink: DrinkItem) => void;
  onDelete: (id: number) => void;
}

const categoryBadgeVariant = (cat: DrinkCategory) => {
  switch (cat) {
    case "BEER": return "default" as const;
    case "WINE": return "secondary" as const;
    case "SPIRIT": return "destructive" as const;
    case "COCKTAIL": return "outline" as const;
    default: return "outline" as const;
  }
};

export function DrinksTable({
  drinks,
  filteredDrinks,
  isLoading,
  search,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
  alcoholicFilter,
  setAlcoholicFilter,
  selected,
  onToggleSelect,
  onToggleSelectAll,
  onBulkAction,
  onEdit,
  onDelete,
}: DrinksTableProps) {
  return (
    <>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wine className="w-5 h-5" />
              Napoje
            </CardTitle>
            <CardDescription>Celkem: {drinks?.length || 0} napoju</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {selected.size > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Hromadne ({selected.size})
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onBulkAction("activate")}>
                    <Power className="w-4 h-4 mr-2" />
                    Aktivovat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkAction("deactivate")}>
                    <PowerOff className="w-4 h-4 mr-2" />
                    Deaktivovat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onBulkAction("delete")} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Smazat
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vsechny kategorie</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {DRINK_CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vsechny</SelectItem>
                <SelectItem value="active">Aktivni</SelectItem>
                <SelectItem value="inactive">Neaktivni</SelectItem>
              </SelectContent>
            </Select>
            <Select value={alcoholicFilter} onValueChange={setAlcoholicFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Vsechny</SelectItem>
                <SelectItem value="alcoholic">Alkoholicke</SelectItem>
                <SelectItem value="non-alcoholic">Nealkoholicke</SelectItem>
              </SelectContent>
            </Select>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Hledat napoj..."
              className="w-64"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Nacitani...</div>
        ) : filteredDrinks && filteredDrinks.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filteredDrinks.length > 0 && selected.size === filteredDrinks.length}
                    onCheckedChange={onToggleSelectAll}
                  />
                </TableHead>
                <TableHead>Nazev</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Cena (Kc)</TableHead>
                <TableHead>Alkoholicky</TableHead>
                <TableHead>Aktivni</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrinks.map((drink) => (
                <TableRow key={drink.id}>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(drink.id)}
                      onCheckedChange={() => onToggleSelect(drink.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{drink.name}</TableCell>
                  <TableCell>
                    <Badge variant={categoryBadgeVariant(drink.category)}>
                      {DRINK_CATEGORY_LABELS[drink.category] || drink.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{drink.price} Kc</TableCell>
                  <TableCell>
                    <Badge variant={drink.isAlcoholic ? "destructive" : "secondary"}>
                      {drink.isAlcoholic ? "Ano" : "Ne"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={drink.isActive ? "default" : "secondary"}>
                      {drink.isActive ? "Aktivni" : "Neaktivni"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(drink)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(drink.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title={search || categoryFilter !== "all" || statusFilter !== "all" || alcoholicFilter !== "all"
              ? "Zadne napoje nenalezeny"
              : "Zatim zadne napoje"}
          />
        )}
      </CardContent>
    </>
  );
}
