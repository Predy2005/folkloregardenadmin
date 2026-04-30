import { useMemo } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SearchInput } from "@/shared/components";
import { MultiSelectFilter } from "@/shared/components/MultiSelectFilter";
import { Calendar, CalendarDays, Star, X } from "lucide-react";
import type { Event } from "@shared/types";

interface EventFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  timeFilter: "all" | "upcoming" | "past" | "nearest";
  setTimeFilter: (val: "all" | "upcoming" | "past" | "nearest") => void;
  typeFilter: Set<string>;
  setTypeFilter: (val: Set<string>) => void;
  statusFilter: Set<string>;
  setStatusFilter: (val: Set<string>) => void;
  coordinatorFilter: Set<string>;
  setCoordinatorFilter: (val: Set<string>) => void;
  highlightOnly: boolean;
  setHighlightOnly: (val: boolean) => void;
  /** Pro vyplnění coordinator dropdownu — unikátní jména z aktuálních eventů. */
  events: Event[] | undefined;
  filteredCount: number;
  totalCount: number;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onBulkChangeStatus: () => void;
  onBulkChangeType: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
}

const TYPE_OPTIONS = [
  { value: "folklorni_show", label: "Folklorní show" },
  { value: "svatba", label: "Svatba" },
  { value: "event", label: "Event" },
  { value: "privat", label: "Soukromá akce" },
];

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "Koncept" },
  { value: "PLANNED", label: "Plánováno" },
  { value: "IN_PROGRESS", label: "Probíhá" },
  { value: "COMPLETED", label: "Dokončeno" },
  { value: "CANCELLED", label: "Zrušeno" },
];

export function EventFilters({
  search,
  setSearch,
  timeFilter,
  setTimeFilter,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
  coordinatorFilter,
  setCoordinatorFilter,
  highlightOnly,
  setHighlightOnly,
  events,
  filteredCount,
  totalCount,
  isSuperAdmin,
  selectedIds,
  onBulkChangeStatus,
  onBulkChangeType,
  onBulkDelete,
  onClearSelection,
}: EventFiltersProps) {
  const coordinatorOptions = useMemo(() => {
    const set = new Map<string, string>();
    (events ?? []).forEach((e) => {
      if (e.coordinator?.name) set.set(e.coordinator.name, e.coordinator.name);
    });
    return Array.from(set.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "cs"));
  }, [events]);

  const activeFilterCount =
    (typeFilter.size > 0 ? 1 : 0) +
    (statusFilter.size > 0 ? 1 : 0) +
    (coordinatorFilter.size > 0 ? 1 : 0) +
    (highlightOnly ? 1 : 0);

  const clearAll = () => {
    setTypeFilter(new Set());
    setStatusFilter(new Set());
    setCoordinatorFilter(new Set());
    setHighlightOnly(false);
  };

  return (
    <CardHeader>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5"/>
              Akce
            </CardTitle>
            <CardDescription>
              {timeFilter === "nearest"
                ? "Nejbližší akce k dnešnímu datu"
                : `Zobrazeno: ${filteredCount} z ${totalCount} akcí`}
            </CardDescription>
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Hledat akci..."
            className="w-64"
          />
        </div>

        <Tabs value={timeFilter} onValueChange={(value) => setTimeFilter(value as typeof timeFilter)} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="nearest" data-testid="tab-nearest">
              <Calendar className="w-4 h-4 mr-2"/>
              Nejbližší
            </TabsTrigger>
            <TabsTrigger value="upcoming" data-testid="tab-upcoming">
              Nadcházející
            </TabsTrigger>
            <TabsTrigger value="past" data-testid="tab-past">
              Prošlé
            </TabsTrigger>
            <TabsTrigger value="all" data-testid="tab-all">
              Všechny
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <MultiSelectFilter label="Typ" options={TYPE_OPTIONS} selected={typeFilter} onChange={setTypeFilter} />
          <MultiSelectFilter label="Status" options={STATUS_OPTIONS} selected={statusFilter} onChange={setStatusFilter} />
          {coordinatorOptions.length > 0 && (
            <MultiSelectFilter
              label="Manažerka"
              options={coordinatorOptions}
              selected={coordinatorFilter}
              onChange={setCoordinatorFilter}
              searchable
            />
          )}
          <Button
            variant={highlightOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setHighlightOnly(!highlightOnly)}
            className={highlightOnly ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
          >
            <Star className={`w-4 h-4 mr-1 ${highlightOnly ? "fill-white" : ""}`} />
            Highlight
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="w-4 h-4 mr-1" />
              Zrušit filtry ({activeFilterCount})
            </Button>
          )}
        </div>

        {isSuperAdmin && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border rounded-lg">
            <Badge variant="secondary">{selectedIds.size} vybráno</Badge>
            <Button size="sm" variant="outline" onClick={onBulkChangeStatus}>
              Změnit status
            </Button>
            <Button size="sm" variant="outline" onClick={onBulkChangeType}>
              Změnit typ
            </Button>
            <Button size="sm" variant="destructive" onClick={onBulkDelete}>
              Smazat
            </Button>
            <Button size="sm" variant="ghost" onClick={onClearSelection}>
              Zrušit výběr
            </Button>
          </div>
        )}
      </div>
    </CardHeader>
  );
}
