import { useState, useMemo, useRef, useEffect } from "react";
import {
  Users,
  MapPin,
  Globe,
  Search,
  X,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/lib/utils";
import { ReservationView } from "./ReservationView";
import { SpaceView } from "./SpaceView";
import { NationalityView } from "./NationalityView";
import type { EventGuestSummary } from "@shared/types";

type ViewMode = "reservations" | "spaces" | "nationalities";

interface GuestCommandCenterProps {
  data: EventGuestSummary;
  eventId: number;
}

/**
 * Unified Guest Command Center
 *
 * Combines guest stats, check-in, and space management into one
 * tablet-optimized interface with multiple view modes.
 */
export function GuestCommandCenter({ data, eventId }: GuestCommandCenterProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("reservations");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Calculate nationality breakdown from all reservations
  const nationalityBreakdown = useMemo(() => {
    const breakdown: Record<string, { count: number; present: number; reservations: number }> = {};

    for (const res of data.byReservation) {
      const nat = res.nationality || "unknown";
      if (!breakdown[nat]) {
        breakdown[nat] = { count: 0, present: 0, reservations: 0 };
      }
      breakdown[nat].count += res.types.total;
      breakdown[nat].present += res.presence.present;
      breakdown[nat].reservations += 1;
    }

    return breakdown;
  }, [data.byReservation]);

  // Focus input when search opens
  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Close search and clear query when switching tabs
  const handleModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode !== "reservations") {
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      setIsSearchOpen(false);
    }
  };

  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setIsSearchOpen(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Mode Tabs with search */}
      <div className="flex items-center border-b">
        <ViewModeTabs
          mode={viewMode}
          onModeChange={handleModeChange}
          reservationCount={data.byReservation.length}
          spaceCount={data.bySpace.length}
          nationalityCount={Object.keys(nationalityBreakdown).length}
        />

        {/* Search - only for reservations tab */}
        {viewMode === "reservations" && (
          <div className="shrink-0 border-l">
            {isSearchOpen ? (
              <div className="flex items-center gap-1 px-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Hledat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    onBlur={handleSearchBlur}
                    className="pl-6 h-7 w-28 text-xs"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setSearchQuery("");
                    setIsSearchOpen(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setIsSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Content based on view mode */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "reservations" && (
          <ReservationView
            reservations={data.byReservation}
            eventId={eventId}
            searchQuery={searchQuery}
          />
        )}
        {viewMode === "spaces" && (
          <SpaceView
            spaces={data.bySpace}
            reservations={data.byReservation}
            eventId={eventId}
          />
        )}
        {viewMode === "nationalities" && (
          <NationalityView
            breakdown={nationalityBreakdown}
            reservations={data.byReservation}
            eventId={eventId}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Compact tab selector
 */
function ViewModeTabs({
  mode,
  onModeChange,
  reservationCount,
  spaceCount,
  nationalityCount,
}: {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  reservationCount: number;
  spaceCount: number;
  nationalityCount: number;
}) {
  const options: { value: ViewMode; label: string; icon: React.ReactNode; count: number }[] = [
    {
      value: "reservations",
      label: "Rezervace",
      icon: <Users className="h-3.5 w-3.5" />,
      count: reservationCount,
    },
    {
      value: "spaces",
      label: "Prostory",
      icon: <MapPin className="h-3.5 w-3.5" />,
      count: spaceCount,
    },
    {
      value: "nationalities",
      label: "Národnosti",
      icon: <Globe className="h-3.5 w-3.5" />,
      count: nationalityCount,
    },
  ];

  return (
    <div className="flex flex-1">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onModeChange(option.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium transition-colors touch-manipulation",
            mode === option.value
              ? "text-primary border-b-2 border-primary bg-primary/5"
              : "text-muted-foreground hover:bg-muted/50"
          )}
        >
          {option.icon}
          <span className="hidden sm:inline">{option.label}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {option.count}
          </Badge>
        </button>
      ))}
    </div>
  );
}
