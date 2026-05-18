import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { NationalityInput } from "@/shared/components/NationalityInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Trash2 } from "lucide-react";
import { formatCurrency } from "@/shared/lib/formatting";
import {
  DRINK_OPTION_LABELS,
  PERSON_TYPE_LABELS,
  type DrinkItem,
  type ReservationFood,
} from "@shared/types";
import type { PersonEntry } from "@modules/reservations/types";

interface PersonRowProps {
  person: PersonEntry;
  pIndex: number;
  isSelected: boolean;
  activeTabIndex: number;
  foods: ReservationFood[] | undefined;
  drinks: DrinkItem[] | undefined;
  currency: string;
  toggleSelect: (i: number) => void;
  handleTypeChange: (
    reservationIndex: number,
    personIndex: number,
    type: PersonEntry["type"],
  ) => void;
  handleMenuChange: (
    reservationIndex: number,
    personIndex: number,
    menu: string,
  ) => void;
  updatePerson: (
    reservationIndex: number,
    personIndex: number,
    updates: Partial<PersonEntry>,
  ) => void;
  removePerson: (reservationIndex: number, personIndex: number) => void;
}

export function PersonRow({
  person,
  pIndex,
  isSelected,
  activeTabIndex,
  foods,
  drinks,
  currency,
  toggleSelect,
  handleTypeChange,
  handleMenuChange,
  updatePerson,
  removePerson,
}: PersonRowProps) {
  const menuDisabled =
    person.type === "infant" || person.type === "driver" || person.type === "guide";
  const priceDisabled = person.type === "driver" || person.type === "guide";
  const drinkDisabled = person.type === "infant";
  const showDrinkPicker =
    drinks &&
    drinks.length > 0 &&
    (person.drinkOption === "welcome" || person.drinkOption === "allin");

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center border rounded-md p-2 ${
        isSelected ? "bg-primary/5 border-primary/30" : ""
      }`}
    >
      <div className="md:col-span-1 flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(pIndex)} />
        <span>#{pIndex + 1}</span>
      </div>
      <div className="md:col-span-2">
        <Select
          value={person.type}
          onValueChange={(v) =>
            handleTypeChange(activeTabIndex, pIndex, v as PersonEntry["type"])
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adult">{PERSON_TYPE_LABELS.adult}</SelectItem>
            <SelectItem value="child">{PERSON_TYPE_LABELS.child}</SelectItem>
            <SelectItem value="infant">{PERSON_TYPE_LABELS.infant}</SelectItem>
            <SelectItem value="driver">{PERSON_TYPE_LABELS.driver}</SelectItem>
            <SelectItem value="guide">{PERSON_TYPE_LABELS.guide}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-3">
        <Select
          value={person.menu}
          onValueChange={(v) => handleMenuChange(activeTabIndex, pIndex, v)}
          disabled={menuDisabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Vyberte menu" />
          </SelectTrigger>
          <SelectContent>
            {foods?.map((f) => (
              <SelectItem key={f.id} value={f.name}>
                {f.name}
                {f.surcharge > 0 && (
                  <span className="text-warning ml-1">
                    (+{formatCurrency(f.surcharge, currency)})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-2">
        <NationalityInput
          value={person.nationality}
          onChange={(val) =>
            updatePerson(activeTabIndex, pIndex, { nationality: val })
          }
        />
      </div>
      <div className="md:col-span-2">
        <Input
          type="number"
          value={person.price}
          onChange={(e) =>
            updatePerson(activeTabIndex, pIndex, { price: Number(e.target.value) })
          }
          disabled={priceDisabled}
        />
      </div>
      <div>
        <Select
          value={person.drinkOption || "none"}
          onValueChange={(v) => updatePerson(activeTabIndex, pIndex, { drinkOption: v })}
          disabled={drinkDisabled}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DRINK_OPTION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {showDrinkPicker && (
        <div>
          <Select
            value={person.drinkItemId?.toString() ?? "none"}
            onValueChange={(v) => {
              if (v === "none") {
                updatePerson(activeTabIndex, pIndex, {
                  drinkItemId: null,
                  drinkName: "",
                  drinkPrice: 0,
                });
                return;
              }
              const selectedDrink = drinks?.find((d) => d.id === Number(v));
              if (selectedDrink) {
                updatePerson(activeTabIndex, pIndex, {
                  drinkItemId: selectedDrink.id,
                  drinkName: selectedDrink.name,
                  drinkPrice: Number(selectedDrink.price) || 0,
                });
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Vyberte napoj" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Bez napoje</SelectItem>
              {drinks
                ?.filter((d) => {
                  if (!d.isActive) return false;
                  // Pro welcome drink omezení na nápoje s isWelcomeDrink=true
                  // (admin si nadefinuje v /drinks). U allin se nabízí všechny.
                  if (person.drinkOption === "welcome") {
                    return d.isWelcomeDrink;
                  }
                  return true;
                })
                .map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.name} ({d.price} Kc)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removePerson(activeTabIndex, pIndex)}
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
