import { useEventStockRequirements } from "@/modules/stock/hooks/useStockRequirements";
import { Badge } from "@/shared/components/ui/badge";
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

interface StockRequirementsCardProps {
  eventId: number;
}

export function StockRequirementsCard({ eventId }: StockRequirementsCardProps) {
  const { data, isLoading } = useEventStockRequirements(eventId);
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        <p>Žádné receptury propojeny s menu tohoto eventu.</p>
        <p className="text-xs mt-1">Propojte receptury v sekci Jídla.</p>
      </div>
    );
  }

  const deficits = data.items.filter((i) => i.status === "DEFICIT");
  const topDeficits = deficits.slice(0, 5);

  const formatNum = (n: number) =>
    n.toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-4 space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {data.items.length} surovin
        </span>
        {deficits.length > 0 ? (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {deficits.length} chybí
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="text-xs bg-green-500/15 text-green-700 border-green-500/30"
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Vše na skladě
          </Badge>
        )}
      </div>

      {/* Top deficits */}
      {topDeficits.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
            Chybějící suroviny
          </h4>
          {topDeficits.map((item) => (
            <div
              key={item.stockItemId}
              className="flex items-center justify-between text-sm p-2 rounded-md bg-red-500/5 border border-red-500/10"
            >
              <span className="font-medium truncate flex-1 mr-2">
                {item.stockItemName}
              </span>
              <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                <span className="text-muted-foreground">
                  {formatNum(item.available)}/{formatNum(item.required)} {item.unit}
                </span>
                <span className="text-red-600 font-semibold">
                  -{formatNum(item.deficit)}
                </span>
              </div>
            </div>
          ))}
          {deficits.length > 5 && (
            <p className="text-xs text-muted-foreground text-center">
              +{deficits.length - 5} dalších
            </p>
          )}
        </div>
      )}

      {/* OK items summary */}
      {deficits.length === 0 && (
        <div className="space-y-1">
          {data.items.slice(0, 3).map((item) => (
            <div
              key={item.stockItemId}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground truncate flex-1 mr-2">
                {item.stockItemName}
              </span>
              <span className="font-mono text-xs">
                {formatNum(item.required)} {item.unit}
              </span>
            </div>
          ))}
          {data.items.length > 3 && (
            <p className="text-xs text-muted-foreground text-center">
              +{data.items.length - 3} dalších
            </p>
          )}
        </div>
      )}

      {/* Link to full page */}
      <button
        onClick={() => navigate("/stock-requirements")}
        className="w-full flex items-center justify-center gap-1 text-xs text-primary hover:underline pt-2 border-t touch-manipulation min-h-[36px]"
      >
        Zobrazit vše
        <ExternalLink className="h-3 w-3" />
      </button>
    </div>
  );
}
