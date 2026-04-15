import type { FoodDrinkPairing } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Plus, Trash2, Link2 } from "lucide-react";

interface PairingsSectionProps {
  pairings?: FoodDrinkPairing[];
  isLoading: boolean;
  onCreatePairing: () => void;
  onDeletePairing: (id: number) => void;
}

export function PairingsSection({
  pairings,
  isLoading,
  onCreatePairing,
  onDeletePairing,
}: PairingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {"Propojeni jidlo \u2194 napoj"}
            </CardTitle>
            <CardDescription>Celkem: {pairings?.length || 0} propojeni</CardDescription>
          </div>
          <Button onClick={onCreatePairing} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Pridat propojeni
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Nacitani...</div>
        ) : pairings && pairings.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jidlo</TableHead>
                <TableHead>Napoj</TableHead>
                <TableHead>Vychozi</TableHead>
                <TableHead>V cene</TableHead>
                <TableHead>Priplatek</TableHead>
                <TableHead className="text-right">Akce</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairings.map((pairing) => (
                <TableRow key={pairing.id}>
                  <TableCell className="font-medium">{pairing.foodName}</TableCell>
                  <TableCell>
                    {pairing.drinkName}
                    <span className="text-muted-foreground text-xs ml-1">
                      ({pairing.drinkPrice} Kc)
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pairing.isDefault ? "default" : "outline"}>
                      {pairing.isDefault ? "Ano" : "Ne"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={pairing.isIncludedInPrice ? "default" : "outline"}>
                      {pairing.isIncludedInPrice ? "Ano" : "Ne"}
                    </Badge>
                  </TableCell>
                  <TableCell>{pairing.surcharge} Kc</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeletePairing(pairing.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Zatim zadna propojeni
          </div>
        )}
      </CardContent>
    </Card>
  );
}
