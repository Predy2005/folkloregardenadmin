import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Package,
  AlertTriangle,
  CalendarDays,
  Filter,
  List,
  Clock,
} from "lucide-react";
import { useStockRequirements } from "../hooks/useStockRequirements";
import type { StockRequirementItem } from "@shared/types";
import dayjs from "dayjs";
import { useLocation } from "wouter";
import { PageHeader } from "@/shared/components/PageHeader";
import { formatCurrency } from "@/shared/lib/formatting";
import { RequirementsSummaryView } from "../components/RequirementsSummaryView";
import { RequirementsTimelineView } from "../components/RequirementsTimelineView";

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

  const fmtDecimal = (n: number) =>
    n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtMoney = (n: number) => formatCurrency(n);

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
        <RequirementsSummaryView
          data={data}
          filteredItems={filteredItems}
          isLoading={isLoading}
          expandedItems={expandedItems}
          toggleExpand={toggleExpand}
          formatNumber={fmtDecimal}
          formatCurrency={fmtMoney}
        />
      )}

      {/* ===== TIMELINE VIEW ===== */}
      {viewMode === "timeline" && (
        <RequirementsTimelineView
          data={data}
          isLoading={isLoading}
          expandedEvents={expandedEvents}
          toggleEventExpand={toggleEventExpand}
          formatNumber={fmtDecimal}
          formatCurrency={fmtMoney}
          navigate={navigate}
        />
      )}
    </div>
  );
}
