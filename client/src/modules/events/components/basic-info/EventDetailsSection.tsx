import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { UseFormReturn } from "react-hook-form";
import {
  EVENT_SPACE_LABELS,
  EVENT_STATUS_LABELS,
  EVENT_TYPE_LABELS,
  EVENT_SUBCATEGORY_LABELS,
  type EventTag,
  type Building,
} from "@shared/types";
import { api } from "@/shared/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { X, Plus, RefreshCw, Users } from "lucide-react";
import type { BasicInfoForm } from "../BasicInfoTab";
import { useGuestSummary } from "../../hooks/useGuestSummary";
import NationalityBadge from "../waiter/NationalityBadge";

interface EventDetailsSectionProps {
  form: UseFormReturn<BasicInfoForm>;
  existingTags: EventTag[] | undefined;
  eventId?: number;
}

export default function EventDetailsSection({ form, existingTags, eventId }: EventDetailsSectionProps) {
  const [newTag, setNewTag] = useState("");

  const watchedEventType = form.watch("eventType");
  const watchedTags = form.watch("eventTags") || [];
  const guestsTotal = (form.watch("guestsPaid") || 0) + (form.watch("guestsFree") || 0);
  const isFolklorniShow = watchedEventType === "folklorni_show";

  // Fetch buildings/rooms for dynamic space selection
  const { data: buildings = [] } = useQuery<Building[]>({
    queryKey: ["buildings"],
    queryFn: () => api.get("/api/venue/buildings"),
  });

  // Build space options from buildings/rooms
  const roomOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    buildings.forEach((b) => {
      (b.rooms ?? []).filter(r => r.isActive).forEach((r) => {
        options.push({ value: r.slug, label: `${b.name} — ${r.name}` });
      });
    });
    // Always include "cely_areal" fallback
    if (!options.some(o => o.value === "cely_areal")) {
      options.push({ value: "cely_areal", label: "Celý areál" });
    }
    return options;
  }, [buildings]);

  // If no buildings configured, fall back to legacy hardcoded spaces
  const spaceOptions = roomOptions.length > 1
    ? roomOptions
    : Object.entries(EVENT_SPACE_LABELS).map(([value, label]) => ({ value, label }));

  // Fetch computed guest data from reservations
  const { data: guestSummary } = useGuestSummary(eventId ?? 0);

  // Compute nationality breakdown from reservations
  const nationalityBreakdown = useMemo(() => {
    if (!guestSummary?.byReservation) return [];
    const counts: Record<string, number> = {};
    for (const res of guestSummary.byReservation) {
      const nat = res.nationality || "unknown";
      counts[nat] = (counts[nat] || 0) + res.types.total;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([nationality, count]) => ({ nationality, count }));
  }, [guestSummary?.byReservation]);

  const syncGuestCounts = () => {
    if (!guestSummary) return;
    form.setValue("guestsPaid", guestSummary.types.paying);
    form.setValue("guestsFree", guestSummary.types.free);
  };

  // Filtrované tagy pro našeptávání
  const suggestedTags = useMemo(() => {
    if (!existingTags || !newTag) return [];
    const lowerTag = newTag.toLowerCase();
    return existingTags
      .filter(t => t.name.toLowerCase().includes(lowerTag) && !watchedTags.includes(t.name))
      .slice(0, 5);
  }, [existingTags, newTag, watchedTags]);

  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (trimmed && !watchedTags.includes(trimmed)) {
      form.setValue("eventTags", [...watchedTags, trimmed]);
    }
    setNewTag("");
  };

  const removeTag = (tagName: string) => {
    form.setValue("eventTags", watchedTags.filter(t => t !== tagName));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Základní údaje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Název *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Typ akce *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-event-type">
                      <SelectValue placeholder="Vyberte typ" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isFolklorniShow && (
            <FormField
              control={form.control}
              name="eventSubcategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subkategorie</FormLabel>
                  <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte subkategorii" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                      {Object.entries(EVENT_SUBCATEGORY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Vyberte status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Tagy */}
        {!isFolklorniShow && (
          <FormField
            control={form.control}
            name="eventTags"
            render={() => (
              <FormItem>
                <FormLabel>Tagy</FormLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {watchedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Přidat tag..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag(newTag);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="icon" onClick={() => addTag(newTag)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {suggestedTags.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-md">
                      {suggestedTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-accent text-sm"
                          onClick={() => addTag(tag.name)}
                        >
                          {tag.name} <span className="text-muted-foreground">({tag.usageCount}x)</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <FormDescription>Stiskněte Enter nebo klikněte na + pro přidání tagu</FormDescription>
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="eventDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Datum *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-event-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="eventTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Čas *</FormLabel>
                <FormControl>
                  <Input type="time" {...field} data-testid="input-event-time" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="durationMinutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Doba trvání (min) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-duration"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Language input + nationality badges */}
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Jazyk *</FormLabel>
                <FormControl>
                  <Input {...field} data-testid="input-language" className="w-48" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {nationalityBreakdown.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Národnosti z rezervací:</span>
              {nationalityBreakdown.map(({ nationality, count }) => (
                <div key={nationality} className="flex items-center gap-1">
                  <NationalityBadge nationality={nationality === "unknown" ? null : nationality} showName size="sm" />
                  <span className="text-xs text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Computed guest counts info bar */}
        {guestSummary && guestSummary.types.total > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Z rezervací:</span>
            <Badge variant="secondary">{guestSummary.types.total} celkem</Badge>
            <Badge variant="outline">{guestSummary.types.paying} placených</Badge>
            <Badge variant="outline">{guestSummary.types.free} volných</Badge>
            <Badge variant="outline">{guestSummary.types.adults} dosp.</Badge>
            {guestSummary.types.children > 0 && (
              <Badge variant="outline">{guestSummary.types.children} dětí</Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={syncGuestCounts}
              className="ml-auto"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Synchronizovat
            </Button>
          </div>
        )}

        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="guestsPaid"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Placení hosté</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-guests-paid"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="guestsFree"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Volní hosté</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    data-testid="input-guests-free"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end pb-2">
            <div className="text-sm font-medium" data-testid="text-guests-total">
              Celkem: <span className="text-lg">{guestsTotal}</span>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="spaces"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prostory *</FormLabel>
              <div className="grid grid-cols-2 gap-2">
                {spaceOptions.map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={field.value?.includes(value as any)}
                      onCheckedChange={(checked) => {
                        const current = new Set(field.value || []);
                        if (checked) current.add(value as any);
                        else current.delete(value as any);
                        field.onChange(Array.from(current));
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
