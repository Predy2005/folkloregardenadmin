import type { PricingDateOverride } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Badge } from "@/shared/components/ui/badge";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Plus, Edit, Trash2, Calendar } from "lucide-react";
import dayjs from "dayjs";

interface OverridesTableProps {
  overrides?: PricingDateOverride[];
  filteredOverrides?: PricingDateOverride[];
  isLoading: boolean;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  defaultCurrency: string;
  isSuperAdmin: boolean;
  selectedOverrideIds: Set<number>;
  onToggleOverrideSelection: (id: number) => void;
  onToggleAllOverrides: (overrides: PricingDateOverride[]) => void;
  onBulkDeleteOpen: () => void;
  onClearSelection: () => void;
  onCreateOverride: () => void;
  onEditOverride: (override: PricingDateOverride) => void;
  onDeleteOverride: (id: number) => void;
}

export function OverridesTable({
  filteredOverrides,
  isLoading,
  searchTerm,
  setSearchTerm,
  defaultCurrency,
  isSuperAdmin,
  selectedOverrideIds,
  onToggleOverrideSelection,
  onToggleAllOverrides,
  onBulkDeleteOpen,
  onClearSelection,
  onCreateOverride,
  onEditOverride,
  onDeleteOverride,
}: OverridesTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Datum-specifické ceny
          </CardTitle>
          <Button
            onClick={onCreateOverride}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-create-override"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nový přepis
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Input
            placeholder="Hledat podle data nebo důvodu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-overrides"
          />
        </div>

        {isSuperAdmin && selectedOverrideIds.size > 0 && (
          <div className="mb-4 flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Badge variant="secondary">{selectedOverrideIds.size} vybráno</Badge>
            <Button
              size="sm"
              variant="destructive"
              onClick={onBulkDeleteOpen}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Smazat vybrané
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClearSelection}
            >
              Zrušit výběr
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Načítání...</div>
        ) : filteredOverrides && filteredOverrides.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {isSuperAdmin && (
                    <TableHead className="w-12">
                      <Checkbox
                        checked={filteredOverrides!.length > 0 && selectedOverrideIds.size === filteredOverrides!.length}
                        onCheckedChange={() => onToggleAllOverrides(filteredOverrides!)}
                      />
                    </TableHead>
                  )}
                  <TableHead>Datum</TableHead>
                  <TableHead>Důvod</TableHead>
                  <TableHead className="text-right">Dospělí</TableHead>
                  <TableHead className="text-right">Děti 3-12</TableHead>
                  <TableHead className="text-right">Batolata 0-2</TableHead>
                  <TableHead>Zahrnuje jídlo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOverrides.map((override) => {
                  const isPast = dayjs(override.date).isBefore(dayjs(), 'day');
                  const isToday = dayjs(override.date).isSame(dayjs(), 'day');
                  return (
                    <TableRow key={override.id} data-testid={`row-override-${override.id}`}>
                      {isSuperAdmin && (
                        <TableCell>
                          <Checkbox
                            checked={selectedOverrideIds.has(override.id)}
                            onCheckedChange={() => onToggleOverrideSelection(override.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-mono">
                        {dayjs(override.date).format('DD.MM.YYYY')}
                      </TableCell>
                      <TableCell>{override.reason || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(override.adultPrice, defaultCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(override.childPrice, defaultCurrency)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(override.infantPrice, defaultCurrency)}
                      </TableCell>
                      <TableCell>
                        {override.includeMeal ? (
                          <Badge variant="default" className="bg-green-600">
                            Ano
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Ne</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {isToday && (
                          <Badge variant="default" className="bg-green-600">
                            Dnes
                          </Badge>
                        )}
                        {isPast && !isToday && (
                          <Badge variant="secondary">Minulost</Badge>
                        )}
                        {!isPast && !isToday && (
                          <Badge variant="default" className="bg-purple-600">
                            Budoucnost
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onEditOverride(override)}
                            data-testid={`button-edit-override-${override.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => onDeleteOverride(override.id)}
                            data-testid={`button-delete-override-${override.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? 'Žádné výsledky' : 'Zatím nebyly vytvořeny žádné datum-specifické přepisy'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
