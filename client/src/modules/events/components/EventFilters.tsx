import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
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
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SearchInput } from "@/shared/components";
import { Calendar, CalendarDays } from "lucide-react";

interface EventFiltersProps {
  search: string;
  setSearch: (val: string) => void;
  timeFilter: "all" | "upcoming" | "past" | "nearest";
  setTimeFilter: (val: "all" | "upcoming" | "past" | "nearest") => void;
  typeFilter: string;
  setTypeFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  filteredCount: number;
  totalCount: number;
  isSuperAdmin: boolean;
  selectedIds: Set<number>;
  onBulkChangeStatus: () => void;
  onBulkChangeType: () => void;
  onBulkDelete: () => void;
  onClearSelection: () => void;
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
  filteredCount,
  totalCount,
  isSuperAdmin,
  selectedIds,
  onBulkChangeStatus,
  onBulkChangeType,
  onBulkDelete,
  onClearSelection,
}: EventFiltersProps) {
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

        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48" data-testid="select-type-filter">
              <SelectValue placeholder="Všechny typy"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny typy</SelectItem>
              <SelectItem value="folklorni_show">Folklorní show</SelectItem>
              <SelectItem value="svatba">Svatba</SelectItem>
              <SelectItem value="event">Event</SelectItem>
              <SelectItem value="privat">Soukromá akce</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="select-status-filter">
              <SelectValue placeholder="Všechny stavy"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny stavy</SelectItem>
              <SelectItem value="DRAFT">Koncept</SelectItem>
              <SelectItem value="PLANNED">Plánováno</SelectItem>
              <SelectItem value="IN_PROGRESS">Probíhá</SelectItem>
              <SelectItem value="COMPLETED">Dokončeno</SelectItem>
              <SelectItem value="CANCELLED">Zrušeno</SelectItem>
            </SelectContent>
          </Select>
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
