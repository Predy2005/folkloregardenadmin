import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Input } from "@/shared/components/ui/input";
import {
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SearchInput } from "@/shared/components";
import { MultiSelectFilter } from "@/shared/components/MultiSelectFilter";
import {
  Calendar,
  CalendarDays,
  Star,
  X,
  ChevronDown,
  ChevronUp,
  Music,
  UserCog,
  ConciergeBell,
  Users as UsersIcon,
  HandCoins,
  Inbox,
} from "lucide-react";
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
  spacesFilter: Set<string>;
  setSpacesFilter: (val: Set<string>) => void;
  highlightOnly: boolean;
  setHighlightOnly: (val: boolean) => void;
  dateFrom: string | null;
  setDateFrom: (val: string | null) => void;
  dateTo: string | null;
  setDateTo: (val: string | null) => void;
  hasBand: boolean | null;
  setHasBand: (val: boolean | null) => void;
  hasCoordinator: boolean | null;
  setHasCoordinator: (val: boolean | null) => void;
  hasHeadWaiter: boolean | null;
  setHasHeadWaiter: (val: boolean | null) => void;
  hasFreeGuests: boolean | null;
  setHasFreeGuests: (val: boolean | null) => void;
  hasGuests: boolean | null;
  setHasGuests: (val: boolean | null) => void;
  minGuests: number | null;
  setMinGuests: (val: number | null) => void;
  maxGuests: number | null;
  setMaxGuests: (val: number | null) => void;
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

/**
 * Tri-state toggle pro boolean filtr: null → true → false → null …
 * Vizuálně: neaktivní (outline), "ano" (zelený), "ne" (červený).
 */
function TriToggle({
  value,
  onChange,
  icon: Icon,
  label,
}: {
  value: boolean | null;
  onChange: (next: boolean | null) => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  const next = value === null ? true : value === true ? false : null;
  const className =
    value === false
      ? "border-red-300 text-red-700 bg-red-50 hover:bg-red-100"
      : value === true
      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
      : "";
  const prefix = value === false ? "✕ " : value === true ? "✓ " : "";
  return (
    <Button
      variant={value === true ? "default" : "outline"}
      size="sm"
      onClick={() => onChange(next)}
      className={className}
      title={
        value === null
          ? "Klikni pro 'ano' → 'ne' → vypnuto"
          : value === true
          ? "Klikni pro 'ne'"
          : "Klikni pro vypnutí"
      }
    >
      <Icon className="w-3.5 h-3.5 mr-1" />
      {prefix}
      {label}
    </Button>
  );
}

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
  spacesFilter,
  setSpacesFilter,
  highlightOnly,
  setHighlightOnly,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  hasBand,
  setHasBand,
  hasCoordinator,
  setHasCoordinator,
  hasHeadWaiter,
  setHasHeadWaiter,
  hasFreeGuests,
  setHasFreeGuests,
  hasGuests,
  setHasGuests,
  minGuests,
  setMinGuests,
  maxGuests,
  setMaxGuests,
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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const coordinatorOptions = useMemo(() => {
    const set = new Map<string, string>();
    (events ?? []).forEach((e) => {
      if (e.coordinator?.name) set.set(e.coordinator.name, e.coordinator.name);
    });
    return Array.from(set.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "cs"));
  }, [events]);

  const spaceOptions = useMemo(() => {
    const set = new Map<string, string>();
    (events ?? []).forEach((e) => {
      (e.spaces ?? []).forEach((s) => {
        const label = s.buildingName ?? s.spaceName;
        set.set(s.spaceName, label);
      });
    });
    return Array.from(set.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "cs"));
  }, [events]);

  const dateRangeActive = !!(dateFrom || dateTo);

  const advancedFilterCount =
    (spacesFilter.size > 0 ? 1 : 0) +
    (hasBand !== null ? 1 : 0) +
    (hasCoordinator !== null ? 1 : 0) +
    (hasHeadWaiter !== null ? 1 : 0) +
    (hasFreeGuests !== null ? 1 : 0) +
    (hasGuests !== null ? 1 : 0) +
    (minGuests !== null ? 1 : 0) +
    (maxGuests !== null ? 1 : 0);

  const activeFilterCount =
    (typeFilter.size > 0 ? 1 : 0) +
    (statusFilter.size > 0 ? 1 : 0) +
    (coordinatorFilter.size > 0 ? 1 : 0) +
    (highlightOnly ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    advancedFilterCount;

  const clearAll = () => {
    setTypeFilter(new Set());
    setStatusFilter(new Set());
    setCoordinatorFilter(new Set());
    setSpacesFilter(new Set());
    setHighlightOnly(false);
    setDateFrom(null);
    setDateTo(null);
    setHasBand(null);
    setHasCoordinator(null);
    setHasHeadWaiter(null);
    setHasFreeGuests(null);
    setHasFreeGuests(null);
    setHasGuests(null);
    setMinGuests(null);
    setMaxGuests(null);
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
              {timeFilter === "nearest" && !dateRangeActive
                ? "Nejbližší akce k dnešnímu datu"
                : `Zobrazeno: ${filteredCount} z ${totalCount} akcí`}
            </CardDescription>
          </div>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Hledat napříč týmem, kapelou..."
            className="w-72"
          />
        </div>

        {/* Time tabs — disabled když je date range aktivní */}
        <Tabs
          value={timeFilter}
          onValueChange={(value) => setTimeFilter(value as typeof timeFilter)}
          className={`w-full ${dateRangeActive ? "opacity-50 pointer-events-none" : ""}`}
        >
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

        {/* Date range — má přednost před time tabem */}
        <div className="flex items-end flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Od:</span>
            <Input
              type="date"
              value={dateFrom ?? ""}
              onChange={(e) => setDateFrom(e.target.value || null)}
              className="w-40 h-9"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Do:</span>
            <Input
              type="date"
              value={dateTo ?? ""}
              onChange={(e) => setDateTo(e.target.value || null)}
              className="w-40 h-9"
            />
          </div>
          {dateRangeActive && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(null); setDateTo(null); }}>
              <X className="w-3 h-3 mr-1" />
              Zrušit rozsah
            </Button>
          )}
          <div className="text-xs text-muted-foreground italic">
            {dateRangeActive ? "(rozsah přebíjí časové záložky)" : "Datum od / do — přebíjí časové záložky"}
          </div>
        </div>

        {/* Hlavní filtry */}
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="ml-auto"
          >
            {showAdvanced ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
            Pokročilé filtry
            {advancedFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">
                {advancedFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <X className="w-4 h-4 mr-1" />
              Zrušit vše ({activeFilterCount})
            </Button>
          )}
        </div>

        {/* Pokročilé filtry — collapsible */}
        {showAdvanced && (
          <div className="space-y-3 p-3 rounded-md border bg-muted/30">
            {spaceOptions.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Prostor
                </div>
                <MultiSelectFilter
                  label="Prostor"
                  options={spaceOptions}
                  selected={spacesFilter}
                  onChange={setSpacesFilter}
                />
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Tým a hosté <span className="font-normal italic normal-case text-[10px]">(klik = ano → ne → vypnuto)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <TriToggle value={hasBand} onChange={setHasBand} icon={Music} label="Kapela" />
                <TriToggle value={hasCoordinator} onChange={setHasCoordinator} icon={UserCog} label="Manažerka" />
                <TriToggle value={hasHeadWaiter} onChange={setHasHeadWaiter} icon={ConciergeBell} label="Hl. číšník" />
                <TriToggle value={hasFreeGuests} onChange={setHasFreeGuests} icon={HandCoins} label="Neplatící" />
                <TriToggle value={hasGuests} onChange={setHasGuests} icon={UsersIcon} label="Má hosty" />
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Počet hostů
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Inbox className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Min:</span>
                  <Input
                    type="number"
                    min={0}
                    value={minGuests ?? ""}
                    onChange={(e) => setMinGuests(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                    className="w-24 h-9"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Max:</span>
                  <Input
                    type="number"
                    min={0}
                    value={maxGuests ?? ""}
                    onChange={(e) => setMaxGuests(e.target.value === "" ? null : Math.max(0, Number(e.target.value)))}
                    className="w-24 h-9"
                    placeholder="∞"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

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
