import { useState, Fragment } from "react";
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
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Filter,
  List,
  Clock,
  Users,
} from "lucide-react";
import { useStockRequirements } from "../hooks/useStockRequirements";
import type { StockRequirementItem, TimelineEvent } from "@shared/types";
import dayjs from "dayjs";
import { useLocation } from "wouter";
import { PageHeader } from "@/shared/components/PageHeader";

type FilterMode = "all" | "deficit";
type ViewMode = "summary" | "timeline";

export default function StockRequirementsPage() {
  const today = dayjs().format("YYYY-MM-DD");
  const defaultTo = dayjs().add(30, "day").format("YYYY-MM-DD");

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("summary");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const { data, isLoading } = useStockRequirements(dateFrom, dateTo);
  const [, navigate] = useLocation();

  const toggleExpand = (stockItemId: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(stockItemId)) {
        next.delete(stockItemId);
      } else {
        next.add(stockItemId);
      }
      return next;
    });
  };

  const toggleEventExpand = (eventId: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const filteredItems: StockRequirementItem[] =
    filter === "deficit"
      ? (data?.items ?? []).filter((i) => i.status === "DEFICIT")
      : (data?.items ?? []);

  const formatNumber = (n: number) =>
    n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatCurrency = (n: number) =>
    n.toLocaleString("cs-CZ", { style: "currency", currency: "CZK", minimumFractionDigits: 0 });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <PageHeader title="Požadavky skladu" description="Přehled potřebných surovin pro nadcházející akce" />

      {/* Date range + filter + view toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Od</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Do</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44"
              />
            </div>

            {/* View mode toggle */}
            <div className="flex gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "summary" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("summary")}
              >
                <List className="w-4 h-4 mr-1" />
                Souhrn
              </Button>
              <Button
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("timeline")}
              >
                <Clock className="w-4 h-4 mr-1" />
                Po eventech
              </Button>
            </div>

            {viewMode === "summary" && (
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  Vše
                </Button>
                <Button
                  variant={filter === "deficit" ? "destructive" : "outline"}
                  size="sm"
                  onClick={() => setFilter("deficit")}
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Pouze deficity
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Eventů
              </div>
              <p className="text-2xl font-bold mt-1">
                {data.summary.totalEvents}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Surovin
              </div>
              <p className="text-2xl font-bold mt-1">{data.items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Deficitů
              </div>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {data.summary.totalDeficits}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground">
                Odhadovaná cena
              </div>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(data.summary.totalEstimatedCost)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== SUMMARY VIEW ===== */}
      {viewMode === "summary" && (
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
      )}

      {/* ===== TIMELINE VIEW ===== */}
      {viewMode === "timeline" && (
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
      )}
    </div>
  );
}
