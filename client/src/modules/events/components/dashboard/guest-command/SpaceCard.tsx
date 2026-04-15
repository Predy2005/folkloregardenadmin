import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ArrowRightLeft,
  UtensilsCrossed,
  Minus,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { formatCurrency } from "@/shared/lib/formatting";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { FlagIcon } from "@/shared/components/FlagIcon";
import { getIsoCode } from "@/shared/lib/nationality";
import { getSpaceColor, getSpaceTint } from "@/shared/lib/constants";
import { cn } from "@/shared/lib/utils";
import type { SpaceGuestData, ReservationGuestData } from "@shared/types";

interface SpaceCardProps {
  space: SpaceGuestData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onMoveGuests: () => void;
  onUpdatePresence: (count: number) => void;
  isPending: boolean;
  otherSpaces: SpaceGuestData[];
  spaceReservations: ReservationGuestData[];
}

export function SpaceCard({
  space,
  index,
  isExpanded,
  onToggle,
  onMoveGuests,
  onUpdatePresence,
  isPending,
  otherSpaces,
}: SpaceCardProps) {
  const [menuExpanded, setMenuExpanded] = useState(false);
  const spaceColor = getSpaceColor(index);
  const spaceTint = getSpaceTint(index);
  const presencePercentage = space.presence.percentage;
  const isComplete = space.presence.present >= space.presence.total;

  return (
    <div className={cn("rounded-lg my-1 border", spaceTint.bg, spaceTint.border)}>
      {/* Header - clickable */}
      <div className={cn("flex items-center gap-2 p-3 transition-colors touch-manipulation rounded-t-lg", spaceTint.hover)}>
        <button
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 text-left"
        >
          {/* Expand icon */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          )}

          {/* Space badge */}
          <Badge className={cn(spaceColor, "text-white text-xs py-0.5 px-2")}>
            {space.spaceName.charAt(0).toUpperCase() + space.spaceName.slice(1)}
          </Badge>

          {/* Guest count */}
          <span className="text-sm">
            <span className="font-medium">{space.types.total}</span>
            <span className="text-muted-foreground ml-1">hostů</span>
          </span>
        </button>

        {/* Presence controls */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePresence(Math.max(0, space.presence.present - 1));
            }}
            disabled={isPending || space.presence.present <= 0}
          >
            <Minus className="h-3 w-3" />
          </Button>

          <span className={cn(
            "min-w-[50px] text-center font-medium text-sm",
            isComplete ? "text-green-600" : ""
          )}>
            {space.presence.present}/{space.presence.total}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 touch-manipulation"
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePresence(Math.min(space.presence.total, space.presence.present + 1));
            }}
            disabled={isPending || space.presence.present >= space.presence.total}
          >
            <Plus className="h-3 w-3" />
          </Button>

          <Button
            variant={isComplete ? "default" : "outline"}
            size="icon"
            className={cn("h-8 w-8 touch-manipulation", isComplete && "bg-green-600 hover:bg-green-700")}
            onClick={(e) => {
              e.stopPropagation();
              onUpdatePresence(space.presence.total);
            }}
            disabled={isPending || isComplete}
            title="Všichni přítomni"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Move guests icon button */}
        {otherSpaces.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMoveGuests();
            }}
            title="Přesunout hosty"
          >
            <ArrowRightLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Presence progress */}
          <Progress value={presencePercentage} className="h-1.5" />

          {/* Compact stats row - types & nationalities inline */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Type badges inline */}
            <Badge variant="outline" className="py-0 gap-1 text-green-600">
              {space.types.paying} platících
            </Badge>
            {space.types.free > 0 && (
              <Badge variant="outline" className="py-0 gap-1 text-orange-500">
                {space.types.free} zdarma
              </Badge>
            )}

            {/* Separator */}
            <span className="text-muted-foreground">|</span>

            {/* Nationality badges inline */}
            {Object.entries(space.nationalityBreakdown)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([nationality, count]) => {
                const isoCode = getIsoCode(nationality);
                return (
                  <Badge
                    key={nationality}
                    variant="outline"
                    className="py-0 gap-1"
                  >
                    {isoCode ? (
                      <FlagIcon code={isoCode} className="h-3 w-4 rounded-sm" />
                    ) : (
                      <span>{nationality.slice(0, 2).toUpperCase()}</span>
                    )}
                    {count}
                  </Badge>
                );
              })}
            {Object.keys(space.nationalityBreakdown).length > 4 && (
              <span className="text-muted-foreground">
                +{Object.keys(space.nationalityBreakdown).length - 4}
              </span>
            )}
          </div>

          {/* Menu breakdown - collapsible with compact rows */}
          {space.menuBreakdown.length > 0 && (
            <div className="border rounded-lg overflow-hidden bg-background">
              <button
                onClick={() => setMenuExpanded(!menuExpanded)}
                className="w-full bg-muted/30 px-2 py-1.5 flex items-center gap-2 border-b text-left hover:bg-muted/50 transition-colors"
              >
                {menuExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
                <UtensilsCrossed className="h-3 w-3 text-primary" />
                <span className="font-medium text-xs">Menu</span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1 ml-auto">
                  {space.menuBreakdown.length}
                </Badge>
              </button>
              {menuExpanded && (
                <div className="divide-y">
                  {space.menuBreakdown.map((menu, idx) => (
                    <div key={idx} className="flex items-center justify-between px-2 py-1 text-xs">
                      <span className="font-medium truncate">{menu.menuName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{menu.count}×</span>
                        {menu.surcharge > 0 ? (
                          <span className="text-green-600 w-16 text-right">+{formatCurrency(menu.surcharge)}</span>
                        ) : (
                          <span className="text-muted-foreground w-16 text-right">v ceně</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
