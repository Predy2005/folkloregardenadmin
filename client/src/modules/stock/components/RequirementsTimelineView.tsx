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
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Users,
} from "lucide-react";
import type { TimelineEvent } from "@shared/types";
import dayjs from "dayjs";

interface RequirementsTimelineViewProps {
  data: {
    perEvent?: TimelineEvent[];
  } | undefined;
  isLoading: boolean;
  expandedEvents: Set<number>;
  toggleEventExpand: (eventId: number) => void;
  formatNumber: (n: number) => string;
  formatCurrency: (n: number) => string;
  navigate: (path: string) => void;
}

export function RequirementsTimelineView({
  data,
  isLoading,
  expandedEvents,
  toggleEventExpand,
  formatNumber,
  formatCurrency,
  navigate,
}: RequirementsTimelineViewProps) {
  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Načítání...
        </div>
      ) : data?.perEvent && data.perEvent.length > 0 ? (
        data.perEvent.map((ev: TimelineEvent) => {
          const hasDeficits = ev.summary.totalDeficits > 0;
          const deficitItems = ev.items.filter((i) => i.status === "DEFICIT");
          const isExpanded = expandedEvents.has(ev.eventId);

          return (
            <Card
              key={ev.eventId}
              className={`border-l-4 ${
                hasDeficits ? "border-l-red-500" : "border-l-green-500"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      {dayjs(ev.eventDate).format("DD.MM.YYYY")}
                    </div>
                    <CardTitle className="text-base">
                      <button
                        className="hover:underline text-left"
                        onClick={() => navigate(`/events/${ev.eventId}/dashboard`)}
                      >
                        {ev.eventName}
                      </button>
                    </CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {ev.guestsTotal} hostů
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasDeficits ? (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {ev.summary.totalDeficits} {ev.summary.totalDeficits === 1 ? "deficit" : ev.summary.totalDeficits < 5 ? "deficity" : "deficitů"}
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
                    <span className="text-xs text-muted-foreground">
                      {ev.summary.totalItems} surovin
                    </span>
                    {!hasDeficits && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => toggleEventExpand(ev.eventId)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {/* Show deficit items always for deficit events, or all items when expanded for OK events */}
              {(hasDeficits || isExpanded) && (
                <CardContent className="pt-0">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Surovina</TableHead>
                          <TableHead className="text-right">Potřeba</TableHead>
                          <TableHead className="text-right">Zbývá na skladě</TableHead>
                          <TableHead className="text-right">Deficit</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(hasDeficits ? deficitItems : ev.items).map((item) => (
                          <TableRow key={item.stockItemId}>
                            <TableCell className="font-medium">
                              {item.stockItemName}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.required)} {item.unit}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatNumber(item.runningAvailable)} {item.unit}
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
                            <TableCell className="text-center">
                              {item.status === "DEFICIT" ? (
                                <Badge variant="destructive" className="text-xs">
                                  Chybí
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-xs bg-green-500/15 text-green-700 border-green-500/30"
                                >
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {hasDeficits && ev.summary.totalEstimatedCost > 0 && (
                    <div className="mt-2 text-sm text-muted-foreground text-right">
                      Odhadovaná cena surovin: {formatCurrency(ev.summary.totalEstimatedCost)}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          {data
            ? "Žádné eventy s požadavky v tomto období"
            : "Vyberte období pro zobrazení časové osy"}
        </div>
      )}
    </div>
  );
}
