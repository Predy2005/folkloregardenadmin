import { Fragment } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Badge } from "@/shared/components/ui/badge";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { StockRequirementItem } from "@shared/types";
import dayjs from "dayjs";

interface RequirementsSummaryViewProps {
  data: {
    events: { eventId: number; eventDate: string; eventName: string; deficits: number }[];
    items: StockRequirementItem[];
  } | undefined;
  filteredItems: StockRequirementItem[];
  isLoading: boolean;
  expandedItems: Set<number>;
  toggleExpand: (stockItemId: number) => void;
  formatNumber: (n: number) => string;
  formatCurrency: (n: number) => string;
}

export function RequirementsSummaryView({
  data,
  filteredItems,
  isLoading,
  expandedItems,
  toggleExpand,
  formatNumber,
  formatCurrency,
}: RequirementsSummaryViewProps) {
  return (
    <>
      {/* Events in period */}
      {data && data.events.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Eventy v období</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {data.events.map((ev) => (
                <Badge
                  key={ev.eventId}
                  variant={ev.deficits > 0 ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {dayjs(ev.eventDate).format("DD.MM.")} {ev.eventName}
                  {ev.deficits > 0 && ` (${ev.deficits} deficit${ev.deficits > 1 ? "ů" : ""})`}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Požadavky na suroviny
          </CardTitle>
          <CardDescription>
            Celkem: {filteredItems.length} položek
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Načítání...
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Surovina</TableHead>
                    <TableHead className="text-right">Potřeba</TableHead>
                    <TableHead className="text-right">Na skladě</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                    <TableHead className="text-right">Cena</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isExpanded = expandedItems.has(item.stockItemId);
                    return (
                      <Fragment key={item.stockItemId}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleExpand(item.stockItemId)}
                        >
                          <TableCell className="w-8">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.stockItemName}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(item.required)} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatNumber(item.available)} {item.unit}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {item.deficit > 0 ? (
                              <span className="text-red-600 font-semibold">
                                -{formatNumber(item.deficit)} {item.unit}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(item.estimatedCost)}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.status === "DEFICIT" ? (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Chybí
                              </Badge>
                            ) : (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-green-500/15 text-green-700 border-green-500/30"
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                        {isExpanded && item.details.length > 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              <div className="bg-muted/30 px-8 py-3 space-y-1">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                  Složení požadavku:
                                </p>
                                {item.details.map((d, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="text-muted-foreground">
                                      {d.eventName && (
                                        <span className="font-medium text-foreground">
                                          {d.eventName} &middot;{" "}
                                        </span>
                                      )}
                                      {d.menuName} &rarr; {d.recipeName}
                                      {d.courseType && (
                                        <span className="ml-1 text-xs opacity-60">
                                          ({d.courseType})
                                        </span>
                                      )}
                                      <span className="ml-2 text-xs">
                                        ({d.guestCount} hostů)
                                      </span>
                                    </span>
                                    <span className="font-mono text-sm">
                                      {formatNumber(d.subtotal)} {item.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {data
                ? "Žádné požadavky na suroviny v tomto období"
                : "Vyberte období pro zobrazení požadavků"}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
