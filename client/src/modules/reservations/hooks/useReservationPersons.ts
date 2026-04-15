import { useState } from "react";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { ReservationFood, PricingDefault } from "@shared/types";
import type { PersonEntry, ReservationEntry } from "@modules/reservations/types";

export function useReservationPersons(params: {
  reservations: ReservationEntry[];
  updateReservation: (index: number, updates: Partial<ReservationEntry>) => void;
  foods: ReservationFood[] | undefined;
  pricing: PricingDefault | undefined;
}) {
  const { reservations, updateReservation, foods, pricing } = params;

  // Bulk add persons state
  const [bulkCount, setBulkCount] = useState<number>(1);
  const [bulkType, setBulkType] = useState<PersonEntry["type"]>("adult");
  const [bulkMenu, setBulkMenu] = useState<string>("");
  const [bulkPrice, setBulkPrice] = useState<number | "">("");
  const [bulkNationality, setBulkNationality] = useState<string>("");

  // Bulk price change state
  const [bulkPriceChange, setBulkPriceChange] = useState<number | "">("");

  // Bulk menu/drink change state
  const [bulkMenuChange, setBulkMenuChange] = useState<string>("");
  const [bulkDrinkChange, setBulkDrinkChange] = useState<string>("");

  const findFoodByValue = (value: string): ReservationFood | undefined => {
    if (!foods) return undefined;
    return foods.find(f => f.externalId === value || f.name === value);
  };

  const addPerson = (resIndex: number, type: PersonEntry["type"], nationality: string = "") => {
    const defaultPrice =
      type === "adult" ? pricing?.adultPrice || 1250 :
      type === "child" ? pricing?.childPrice || 800 :
      0;

    const menu = (type === "infant" || type === "driver" || type === "guide") ? "Bez jídla" : "";

    updateReservation(resIndex, {
      persons: [...reservations[resIndex].persons, { type, menu, price: defaultPrice, nationality, drinkOption: "none", drinkName: "", drinkPrice: 0, drinkItemId: null }],
    });
  };

  const updatePerson = (resIndex: number, personIndex: number, updates: Partial<PersonEntry>) => {
    const newPersons = [...reservations[resIndex].persons];
    newPersons[personIndex] = { ...newPersons[personIndex], ...updates };
    updateReservation(resIndex, { persons: newPersons });
  };

  const removePerson = (resIndex: number, personIndex: number) => {
    updateReservation(resIndex, {
      persons: reservations[resIndex].persons.filter((_, i) => i !== personIndex),
    });
  };

  const handleTypeChange = (resIndex: number, personIndex: number, newType: PersonEntry["type"]) => {
    const isFreeType = newType === "driver" || newType === "guide" || newType === "infant";

    if (isFreeType) {
      updatePerson(resIndex, personIndex, {
        type: newType,
        menu: "Bez jídla",
        price: 0,
      });
    } else {
      const person = reservations[resIndex].persons[personIndex];
      const defaultPrice = newType === "adult"
        ? pricing?.adultPrice || 1250
        : pricing?.childPrice || 800;

      updatePerson(resIndex, personIndex, {
        type: newType,
        price: person.price === 0 ? defaultPrice : person.price,
        menu: person.menu === "Bez jídla" ? "" : person.menu,
      });
    }
  };

  const handleMenuChange = (resIndex: number, personIndex: number, newMenuValue: string) => {
    const person = reservations[resIndex].persons[personIndex];
    const oldFood = findFoodByValue(person.menu);
    const newFood = findFoodByValue(newMenuValue);

    const oldSurcharge = oldFood?.surcharge ?? 0;
    const newSurcharge = newFood?.surcharge ?? 0;

    const newPrice = person.price - oldSurcharge + newSurcharge;

    updatePerson(resIndex, personIndex, {
      menu: newMenuValue,
      price: Math.max(0, newPrice),
    });
  };

  const addBulkPersons = (resIndex: number) => {
    const count = Number(bulkCount || 0);
    if (!Number.isFinite(count) || count <= 0) {
      errorToast("Zadejte platný počet osob");
      return;
    }

    const isMenuDisabled = bulkType === "infant" || bulkType === "driver" || bulkType === "guide";
    const menuValue = isMenuDisabled ? "Bez jídla" : bulkMenu || "";

    const selectedFood = findFoodByValue(menuValue);
    const surcharge = selectedFood?.surcharge ?? 0;

    const derivedPrice = () => {
      if (bulkPrice !== "" && Number.isFinite(Number(bulkPrice))) return Number(bulkPrice);
      const basePrice = bulkType === "adult" ? Number(pricing?.adultPrice ?? 1250)
        : bulkType === "child" ? Number(pricing?.childPrice ?? 800)
        : 0;
      return basePrice + surcharge;
    };

    const pricePerPerson = derivedPrice();

    const newPersons: PersonEntry[] = Array.from({ length: count }).map(() => ({
      type: bulkType,
      menu: menuValue,
      price: pricePerPerson,
      nationality: bulkNationality,
      drinkOption: "none",
      drinkName: "",
      drinkPrice: 0,
      drinkItemId: null,
    }));

    updateReservation(resIndex, {
      persons: [...reservations[resIndex].persons, ...newPersons],
    });
    setBulkCount(1);
    setBulkNationality("");
  };

  const applyBulkPriceChange = (resIndex: number) => {
    const newPrice = Number(bulkPriceChange);
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      errorToast("Zadejte platnou cenu");
      return;
    }
    const updatedPersons = reservations[resIndex].persons.map(p =>
      (p.type === "adult" || p.type === "child") ? { ...p, price: newPrice } : p
    );
    updateReservation(resIndex, { persons: updatedPersons });
    setBulkPriceChange("");
    const affectedCount = reservations[resIndex].persons.filter(p => p.type === "adult" || p.type === "child").length;
    successToast(`Cena změněna u ${affectedCount} platících osob`);
  };

  const applyBulkMenuChange = (resIndex: number) => {
    if (!bulkMenuChange) {
      errorToast("Vyberte menu");
      return;
    }
    const newFood = findFoodByValue(bulkMenuChange);
    const newSurcharge = newFood?.surcharge ?? 0;

    const updatedPersons = reservations[resIndex].persons.map(p => {
      if (p.type !== "adult" && p.type !== "child") return p;

      const oldFood = findFoodByValue(p.menu);
      const oldSurcharge = oldFood?.surcharge ?? 0;
      const newPrice = Math.max(0, p.price - oldSurcharge + newSurcharge);

      return { ...p, menu: bulkMenuChange, price: newPrice };
    });
    updateReservation(resIndex, { persons: updatedPersons });
    setBulkMenuChange("");
    const affectedCount = reservations[resIndex].persons.filter(p => p.type === "adult" || p.type === "child").length;
    successToast(`Menu změněno u ${affectedCount} osob`);
  };

  const applyBulkDrinkChange = (resIndex: number) => {
    if (!bulkDrinkChange) return;
    const updatedPersons = reservations[resIndex].persons.map(p => {
      if (p.type === "infant") return p;
      return { ...p, drinkOption: bulkDrinkChange };
    });
    updateReservation(resIndex, { persons: updatedPersons });
    setBulkDrinkChange("");
    const affectedCount = reservations[resIndex].persons.filter(p => p.type !== "infant").length;
    successToast(`Nápoj změněn u ${affectedCount} osob`);
  };

  return {
    // Bulk state
    bulkCount, setBulkCount,
    bulkType, setBulkType,
    bulkMenu, setBulkMenu,
    bulkPrice, setBulkPrice,
    bulkNationality, setBulkNationality,
    bulkPriceChange, setBulkPriceChange,
    bulkMenuChange, setBulkMenuChange,
    bulkDrinkChange, setBulkDrinkChange,

    // Actions
    addPerson,
    updatePerson,
    removePerson,
    handleTypeChange,
    handleMenuChange,
    addBulkPersons,
    applyBulkPriceChange,
    applyBulkMenuChange,
    applyBulkDrinkChange,
    findFoodByValue,
  };
}
