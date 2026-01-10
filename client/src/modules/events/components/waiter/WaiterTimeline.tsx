import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Badge } from "@/shared/components/ui/badge";
import { CheckCircle2, Circle, Clock, Utensils } from "lucide-react";
import type { WaiterViewScheduleItem, WaiterViewMenuSummary, WaiterViewEvent } from "./types";

interface WaiterTimelineProps {
  event: WaiterViewEvent;
  schedule: WaiterViewScheduleItem[];
  menuSummary: WaiterViewMenuSummary[];
  onToggleComplete?: (itemId: number, isCompleted: boolean) => void;
}

export default function WaiterTimeline({
  event,
  schedule,
  menuSummary,
  onToggleComplete,
}: WaiterTimelineProps) {
  // Calculate current progress
  const now = new Date();
  const eventStart = new Date(`${event.eventDate}T${event.eventTime}`);
  const eventEnd = new Date(eventStart.getTime() + event.durationMinutes * 60000);

  const isEventActive = now >= eventStart && now <= eventEnd;
  const eventProgress = isEventActive
    ? ((now.getTime() - eventStart.getTime()) / (eventEnd.getTime() - eventStart.getTime())) * 100
    : now > eventEnd
    ? 100
    : 0;

  // Get current time string
  const getCurrentTimeString = () => {
    return now.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-4">
        {/* Event Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{event.name}</span>
              <Badge variant={isEventActive ? "default" : "secondary"}>
                {isEventActive ? "Probíhá" : event.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {event.eventTime} - {new Date(eventEnd).toLocaleTimeString("cs-CZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="text-muted-foreground">
                  ({event.durationMinutes} min)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(eventProgress, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{event.eventTime}</span>
                <span className="font-semibold text-foreground">
                  {getCurrentTimeString()}
                </span>
                <span>
                  {new Date(eventEnd).toLocaleTimeString("cs-CZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Staff notes */}
            {event.notesStaff && (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">Pro personál:</p>
                <p className="text-sm text-yellow-700">{event.notesStaff}</p>
              </div>
            )}

            {/* Special requirements */}
            {event.specialRequirements && (
              <div className="mt-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800">Speciální požadavky:</p>
                <p className="text-sm text-red-700">{event.specialRequirements}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menu Summary Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Přehled menu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {menuSummary.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <span className="font-medium">{item.menuName}</span>
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    {item.quantity}×
                  </Badge>
                </div>
              ))}
              {menuSummary.length === 0 && (
                <p className="text-muted-foreground text-sm">Žádná menu</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Harmonogram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              <div className="space-y-4">
                {schedule.map((item) => {
                  const isCurrentTime =
                    item.startTime &&
                    item.endTime &&
                    now >=
                      new Date(`${event.eventDate}T${item.startTime}`) &&
                    now <= new Date(`${event.eventDate}T${item.endTime}`);

                  return (
                    <div
                      key={item.id}
                      className={`relative flex items-start gap-4 pl-8 py-2 rounded-lg touch-manipulation ${
                        isCurrentTime ? "bg-blue-50" : ""
                      }`}
                      onClick={() => onToggleComplete?.(item.id, !item.isCompleted)}
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-2.5 top-3">
                        {item.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : isCurrentTime ? (
                          <div className="h-4 w-4 rounded-full bg-blue-500 animate-pulse" />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {item.startTime}
                            {item.endTime && ` - ${item.endTime}`}
                          </span>
                          {isCurrentTime && (
                            <Badge variant="default" className="text-xs">
                              Nyní
                            </Badge>
                          )}
                        </div>
                        <p
                          className={`font-medium ${
                            item.isCompleted ? "line-through text-muted-foreground" : ""
                          }`}
                        >
                          {item.activity}
                        </p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {schedule.length === 0 && (
                  <p className="text-muted-foreground text-sm pl-8">
                    Žádné položky harmonogramu
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
