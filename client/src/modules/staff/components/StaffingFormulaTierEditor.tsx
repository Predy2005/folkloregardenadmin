import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Plus, X } from "lucide-react";
import type { StaffingFormulaForm } from "../types";

interface StaffingFormulaTierEditorProps {
  readonly form: UseFormReturn<StaffingFormulaForm>;
}

export function StaffingFormulaTierEditor({ form }: Readonly<StaffingFormulaTierEditorProps>) {
  const watchedTiers = form.watch("tiers") ?? null;

  const addTier = () => {
    const current = form.getValues("tiers") ?? [];
    const last = current[current.length - 1];
    const nextMin = last && last.maxGuests !== null ? last.maxGuests + 1 : 0;
    const nextMax = nextMin + 30;
    form.setValue(
      "tiers",
      [
        ...current,
        { minGuests: nextMin, maxGuests: nextMax, staffCount: (last?.staffCount ?? 0) + 1 },
      ],
      { shouldDirty: true },
    );
  };

  const removeTier = (index: number) => {
    const current = form.getValues("tiers") ?? [];
    const next = current.filter((_, i) => i !== index);
    form.setValue("tiers", next.length > 0 ? next : null, { shouldDirty: true });
  };

  const clearTiers = () => {
    form.setValue("tiers", null, { shouldDirty: true });
  };

  const updateTier = (
    index: number,
    field: "minGuests" | "maxGuests" | "staffCount",
    value: string,
  ) => {
    const next = [...(form.getValues("tiers") ?? [])];
    if (field === "maxGuests") {
      next[index] = { ...next[index], maxGuests: value === "" ? null : parseInt(value) || 0 };
    } else {
      next[index] = { ...next[index], [field]: parseInt(value) || 0 };
    }
    form.setValue("tiers", next, { shouldDirty: true });
  };

  return (
    <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-medium">Stupňovitá pásma</div>
          <div className="text-sm text-muted-foreground">
            Když je vyplněno, má přednost před lineárním poměrem.
          </div>
        </div>
        <div className="flex gap-2">
          {watchedTiers && watchedTiers.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={clearTiers}>
              Vyčistit
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTier}
            data-testid="button-add-tier"
          >
            <Plus className="h-3 w-3 mr-1" />
            Přidat pásmo
          </Button>
        </div>
      </div>

      {watchedTiers && watchedTiers.length > 0 ? (
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 px-1 text-xs font-medium text-muted-foreground">
            <div>Hostů od</div>
            <div>Hostů do (prázdné = a více)</div>
            <div>Počet personálu</div>
            <div />
          </div>
          {watchedTiers.map((tier, idx) => (
            <div
              // eslint-disable-next-line react/no-array-index-key -- tiers form draft, idx je užit v handlers
              key={idx}
              className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2"
            >
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={tier.minGuests}
                onChange={(e) => updateTier(idx, "minGuests", e.target.value)}
              />
              <Input
                type="number"
                min="0"
                placeholder="a více"
                value={tier.maxGuests ?? ""}
                onChange={(e) => updateTier(idx, "maxGuests", e.target.value.trim())}
              />
              <Input
                type="number"
                min="0"
                placeholder="1"
                value={tier.staffCount}
                onChange={(e) => updateTier(idx, "staffCount", e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTier(idx)}
                aria-label="Odstranit pásmo"
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground italic">
          Žádná pásma. Vzorec aktuálně používá lineární poměr výše.
        </div>
      )}
    </div>
  );
}
