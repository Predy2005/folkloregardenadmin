import type { Recipe } from "@shared/types";
import { SectionHeader } from "@/shared/components/SectionHeader";
import { formatCurrency } from "@/shared/lib/formatting";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";

interface RecipeViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
}

export function RecipeViewDialog({ open, onOpenChange, recipe }: RecipeViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detail receptury</DialogTitle>
          <DialogDescription>Informace o receptuře a ingrediencích</DialogDescription>
        </DialogHeader>
        {recipe && (
          <div className="space-y-4">
            <div>
              <SectionHeader title="Název" className="mb-1" />
              <p className="text-muted-foreground">{recipe.name}</p>
            </div>
            {recipe.description && (
              <div>
                <SectionHeader title="Postup" className="mb-1" />
                <p className="text-muted-foreground whitespace-pre-wrap">{recipe.description}</p>
              </div>
            )}
            <div className="flex gap-6">
              <div>
                <SectionHeader title="Počet porcí" className="mb-1" />
                <Badge variant="secondary">{recipe.portions} ks</Badge>
              </div>
              {recipe.portionWeight && (
                <div>
                  <SectionHeader title="Hmotnost porce" className="mb-1" />
                  <Badge variant="secondary">{recipe.portionWeight} g</Badge>
                </div>
              )}
            </div>
            <div>
              <SectionHeader title="Ingredience" className="mb-2" />
              {recipe.ingredients && recipe.ingredients.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Surovina</TableHead>
                      <TableHead>Dodavatel</TableHead>
                      <TableHead className="text-right">Množství</TableHead>
                      <TableHead className="text-right">Cena za kg/l</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipe.ingredients.map((ing) => (
                      <TableRow key={ing.id}>
                        <TableCell>{ing.stockItem?.name || `ID: ${ing.stockItemId}`}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {ing.stockItem?.supplier || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.quantityRequired} {ing.stockItem?.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {ing.stockItem?.pricePerUnit ? formatCurrency(ing.stockItem.pricePerUnit) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">Zatím žádné ingredience</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Zavřít</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
