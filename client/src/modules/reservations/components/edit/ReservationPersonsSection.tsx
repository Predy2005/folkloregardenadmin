import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
import type { ReservationFood, DrinkItem } from "@shared/types";
import { PERSON_TYPE_LABELS, DRINK_OPTION_LABELS } from "@shared/types";
import type { PersonEntry, ReservationEntry } from "@modules/reservations/types";

export interface ReservationPersonsSectionProps {
  currentReservation: ReservationEntry;
  activeTabIndex: number;
  foods: ReservationFood[] | undefined;
  drinks?: DrinkItem[];
  currentTotalPrice: number;
  // Bulk add persons state
  bulkCount: number;
  setBulkCount: (value: number) => void;
  bulkType: PersonEntry["type"];
  setBulkType: (value: PersonEntry["type"]) => void;
  bulkMenu: string;
  setBulkMenu: (value: string) => void;
  bulkPrice: number | "";
  setBulkPrice: (value: number | "") => void;
  bulkNationality: string;
  setBulkNationality: (value: string) => void;
  // Bulk change state
  bulkPriceChange: number | "";
  setBulkPriceChange: (value: number | "") => void;
  bulkMenuChange: string;
  setBulkMenuChange: (value: string) => void;
  bulkDrinkChange: string;
  setBulkDrinkChange: (value: string) => void;
  // Handlers
  addPerson: (resIndex: number, type: PersonEntry["type"]) => void;
  addBulkPersons: (resIndex: number) => void;
  applyBulkPriceChange: (resIndex: number) => void;
  applyBulkMenuChange: (resIndex: number) => void;
  applyBulkDrinkChange: (resIndex: number) => void;
  handleTypeChange: (resIndex: number, personIndex: number, newType: PersonEntry["type"]) => void;
  handleMenuChange: (resIndex: number, personIndex: number, newMenuValue: string) => void;
  updatePerson: (resIndex: number, personIndex: number, updates: Partial<PersonEntry>) => void;
  removePerson: (resIndex: number, personIndex: number) => void;
}

export function ReservationPersonsSection({
  currentReservation,
  activeTabIndex,
  foods,
  drinks,
  currentTotalPrice,
  bulkCount,
  setBulkCount,
  bulkType,
  setBulkType,
  bulkMenu,
  setBulkMenu,
  bulkPrice,
  setBulkPrice,
  bulkNationality,
  setBulkNationality,
  bulkPriceChange,
  setBulkPriceChange,
  bulkMenuChange,
  setBulkMenuChange,
  bulkDrinkChange,
  setBulkDrinkChange,
  addPerson,
  addBulkPersons,
  applyBulkPriceChange,
  applyBulkMenuChange,
  applyBulkDrinkChange,
  handleTypeChange,
  handleMenuChange,
  updatePerson,
  removePerson,
}: ReservationPersonsSectionProps) {
  return (
    <>
      {/* Bulk actions section */}
      <div className="border rounded-md p-4 bg-muted/50 space-y-4">
        <Label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hromadné akce
        </Label>

        {/* Bulk add persons */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-2">
            <Label className="text-xs">Počet osob</Label>
            <Input
              type="number"
              min={1}
              value={bulkCount}
              onChange={(e) => setBulkCount(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Typ osoby</Label>
            <Select
              value={bulkType}
              onValueChange={(v) => setBulkType(v as any)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="adult">
                  {PERSON_TYPE_LABELS.adult}
                </SelectItem>
                <SelectItem value="child">
                  {PERSON_TYPE_LABELS.child}
                </SelectItem>
                <SelectItem value="infant">
                  {PERSON_TYPE_LABELS.infant}
                </SelectItem>
                <SelectItem value="driver">
                  {PERSON_TYPE_LABELS.driver}
                </SelectItem>
                <SelectItem value="guide">
                  {PERSON_TYPE_LABELS.guide}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Menu</Label>
            <Select
              value={bulkMenu}
              onValueChange={(v) => setBulkMenu(v)}
              disabled={
                bulkType === "infant" ||
                bulkType === "driver" ||
                bulkType === "guide"
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Vyberte menu" />
              </SelectTrigger>
              <SelectContent>
                {foods?.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.name}
                  >
                    {f.name}
                    {f.surcharge > 0 && (
                      <span className="text-orange-600 ml-1">
                        (+{f.surcharge} Kč)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-xs">Národnost</Label>
            <NationalityInput
              value={bulkNationality}
              onChange={setBulkNationality}
              placeholder="např. CZ, DE, US"
              className="mt-1"
            />
          </div>
          <div className="md:col-span-1">
            <Label className="text-xs">Cena</Label>
            <Input
              type="number"
              min={0}
              value={bulkPrice}
              onChange={(e) =>
                setBulkPrice(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              className="mt-1"
              disabled={bulkType === "driver" || bulkType === "guide"}
            />
          </div>
          <div className="md:col-span-1">
            <Button
              type="button"
              variant="secondary"
              className="w-full mt-5"
              onClick={() => addBulkPersons(activeTabIndex)}
            >
              Přidat
            </Button>
          </div>
        </div>

        {/* Bulk menu and price change */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t">
          {/* Bulk menu change */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs whitespace-nowrap">
              Změnit menu všem:
            </Label>
            <Select
              value={bulkMenuChange}
              onValueChange={setBulkMenuChange}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Vyberte menu" />
              </SelectTrigger>
              <SelectContent>
                {foods?.map((f) => (
                  <SelectItem
                    key={f.id}
                    value={f.name}
                  >
                    {f.name}
                    {f.surcharge > 0 && (
                      <span className="text-orange-600 ml-1">
                        (+{f.surcharge} Kč)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyBulkMenuChange(activeTabIndex)}
              disabled={
                !bulkMenuChange ||
                currentReservation.persons.length === 0
              }
            >
              Aplikovat
            </Button>
          </div>
          {/* Bulk price change */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs whitespace-nowrap">
              Změnit cenu všem:
            </Label>
            <Input
              type="number"
              min={0}
              value={bulkPriceChange}
              onChange={(e) =>
                setBulkPriceChange(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              placeholder="Nová cena"
              className="w-28"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyBulkPriceChange(activeTabIndex)}
              disabled={
                bulkPriceChange === "" ||
                currentReservation.persons.length === 0
              }
            >
              Aplikovat
            </Button>
          </div>
          {/* Bulk drink change */}
          <div className="flex items-center gap-2 flex-wrap">
            <Label className="text-xs whitespace-nowrap">
              Změnit nápoj všem:
            </Label>
            <Select
              value={bulkDrinkChange}
              onValueChange={setBulkDrinkChange}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Nápoj" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DRINK_OPTION_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => applyBulkDrinkChange(activeTabIndex)}
              disabled={!bulkDrinkChange || currentReservation.persons.length === 0}
            >
              Aplikovat
            </Button>
          </div>
        </div>
      </div>

      {/* Quick add buttons + Total */}
      <div className="flex items-center justify-between flex-wrap gap-3 py-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground mr-1">Rychle přidat:</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPerson(activeTabIndex, "adult")}
          >
            + Dospělý
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPerson(activeTabIndex, "child")}
          >
            + Dítě (3-12)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPerson(activeTabIndex, "infant")}
          >
            + Dítě (0-2)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPerson(activeTabIndex, "driver")}
          >
            + Řidič
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addPerson(activeTabIndex, "guide")}
          >
            + Průvodce
          </Button>
        </div>
        {/* Total price */}
        <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-semibold text-lg">
          Celkem: {formatCurrency(currentTotalPrice)}
        </div>
      </div>

      {/* Persons list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {currentReservation.persons.length === 0 ? (
          <div className="text-sm text-muted-foreground p-4 text-center border rounded-md">
            Zatím žádné osoby. Přidejte pomocí tlačítek výše.
          </div>
        ) : (
          currentReservation.persons.map((person, pIndex) => (
            <div
              key={pIndex}
              className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center border rounded-md p-2"
            >
              <div className="md:col-span-1 text-sm text-muted-foreground">
                #{pIndex + 1}
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
                    <SelectItem value="adult">
                      {PERSON_TYPE_LABELS.adult}
                    </SelectItem>
                    <SelectItem value="child">
                      {PERSON_TYPE_LABELS.child}
                    </SelectItem>
                    <SelectItem value="infant">
                      {PERSON_TYPE_LABELS.infant}
                    </SelectItem>
                    <SelectItem value="driver">
                      {PERSON_TYPE_LABELS.driver}
                    </SelectItem>
                    <SelectItem value="guide">
                      {PERSON_TYPE_LABELS.guide}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Select
                  value={person.menu}
                  onValueChange={(v) =>
                    handleMenuChange(activeTabIndex, pIndex, v)
                  }
                  disabled={
                    person.type === "infant" ||
                    person.type === "driver" ||
                    person.type === "guide"
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte menu" />
                  </SelectTrigger>
                  <SelectContent>
                    {foods?.map((f) => (
                      <SelectItem
                        key={f.id}
                        value={f.name}
                      >
                        {f.name}
                        {f.surcharge > 0 && (
                          <span className="text-orange-600 ml-1">
                            (+{f.surcharge} Kč)
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
                    updatePerson(activeTabIndex, pIndex, {
                      nationality: val,
                    })
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Input
                  type="number"
                  value={person.price}
                  onChange={(e) =>
                    updatePerson(activeTabIndex, pIndex, {
                      price: Number(e.target.value),
                    })
                  }
                  disabled={
                    person.type === "driver" ||
                    person.type === "guide"
                  }
                />
              </div>
              <div className="md:col-span-2">
                <Select
                  value={person.drinkOption || "none"}
                  onValueChange={(v) =>
                    updatePerson(activeTabIndex, pIndex, {
                      drinkOption: v,
                    })
                  }
                  disabled={person.type === "infant"}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DRINK_OPTION_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {drinks && drinks.length > 0 && (person.drinkOption === "welcome" || person.drinkOption === "allin") && (
                <div className="md:col-span-2">
                  <Select
                    value={person.drinkItemId?.toString() ?? "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        updatePerson(activeTabIndex, pIndex, {
                          drinkItemId: null,
                          drinkName: "",
                          drinkPrice: 0,
                        });
                      } else {
                        const selectedDrink = drinks.find((d) => d.id === Number(v));
                        if (selectedDrink) {
                          updatePerson(activeTabIndex, pIndex, {
                            drinkItemId: selectedDrink.id,
                            drinkName: selectedDrink.name,
                            drinkPrice: Number(selectedDrink.price) || 0,
                          });
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Vyberte napoj" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Bez napoje</SelectItem>
                      {drinks.filter((d) => d.isActive).map((d) => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.name} ({d.price} Kc)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    removePerson(activeTabIndex, pIndex)
                  }
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
