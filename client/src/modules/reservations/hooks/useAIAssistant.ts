import React, { useState } from "react";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import { getCurrencySymbol } from "@/shared/lib/formatting";
import type { ReservationFood, PricingDefault } from "@shared/types";
import {
  isAiConfigured,
  parseMultiReservationWithAI,
  type AiParsedMultiReservation,
  type AiMultiReservationEntry,
} from "@modules/reservations/utils/ai";
import {
  extractTextFromFile,
  getFileType,
} from "@modules/reservations/utils/fileExtractor";
import type { PersonEntry, ReservationEntry, SharedContact } from "@modules/reservations/types";

interface UseAIAssistantParams {
  foods: ReservationFood[] | undefined;
  pricing: PricingDefault | undefined;
  sharedContact: SharedContact;
  setSharedContact: React.Dispatch<React.SetStateAction<SharedContact>>;
  setReservations: React.Dispatch<React.SetStateAction<ReservationEntry[]>>;
  setActiveTabIndex: (index: number) => void;
}

export function useAIAssistant({
  foods,
  pricing,
  sharedContact,
  setSharedContact,
  setReservations,
  setActiveTabIndex,
}: UseAIAssistantParams) {
  const [aiInput, setAiInput] = useState("");
  const [aiJson, setAiJson] = useState<AiParsedMultiReservation | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = getFileType(file);
    if (!fileType) {
      setAiError("Nepodporovaný typ souboru. Podporované: PDF, Excel, Word, CSV, TXT");
      return;
    }

    setFileProcessing(true);
    setAiError(null);
    try {
      const text = await extractTextFromFile(file);
      if (!text.trim()) {
        setAiError("Ze souboru se nepodařilo extrahovat žádný text. Zkuste jiný formát.");
        return;
      }
      setAiInput(prev => prev ? prev + "\n\n--- Obsah souboru: " + file.name + " ---\n" + text : text);
    } catch (err: unknown) {
      setAiError("Chyba při čtení souboru: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setFileProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAiAnalyze = async () => {
    setAiError(null);
    setAiJson(null);
    if (!isAiConfigured()) {
      setAiError("AI není nakonfigurováno. Žádné AI servery nejsou dostupné.");
      return;
    }
    setAiLoading(true);
    try {
      const result = await parseMultiReservationWithAI({ text: aiInput });
      setAiJson(result);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Chyba při volání AI");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiApply = () => {
    if (!aiJson) return;

    try {
      // Apply shared contact + currency
      setSharedContact(prev => ({
        ...prev,
        contactName: aiJson.contact.name || prev.contactName,
        contactEmail: aiJson.contact.email || prev.contactEmail,
        contactPhone: aiJson.contact.phone || prev.contactPhone,
        contactNationality: aiJson.contact.nationality || prev.contactNationality,
        invoiceSameAsContact: !(aiJson.contact.invoiceCompany || aiJson.contact.invoiceIc),
        invoiceName: aiJson.contact.invoiceName || prev.invoiceName,
        invoiceCompany: aiJson.contact.invoiceCompany || aiJson.contact.company || prev.invoiceCompany,
        invoiceIc: aiJson.contact.invoiceIc || prev.invoiceIc,
        invoiceDic: aiJson.contact.invoiceDic || prev.invoiceDic,
        invoiceEmail: aiJson.contact.invoiceEmail || prev.invoiceEmail,
        invoicePhone: aiJson.contact.invoicePhone || prev.invoicePhone,
        currency: aiJson.priceCurrency || prev.currency,
      }));

      // Helper to find best matching menu from available foods
      const findMenuMatch = (menuText: string | null | undefined): string => {
        const defaultMenu = foods?.find(f =>
          f.name.toLowerCase().includes("traditional") || f.name.toLowerCase().includes("tradiční")
        )?.name || foods?.[0]?.name || "Traditional";

        if (!menuText || !foods?.length) return defaultMenu;

        const lowerMenu = menuText.toLowerCase();
        const lowerFoodName = (f: ReservationFood) => f.name.toLowerCase();

        const exactMatch = foods.find(f => lowerFoodName(f) === lowerMenu);
        if (exactMatch) return exactMatch.name;

        if (lowerMenu.includes("chicken") && lowerMenu.includes("halal")) {
          const match = foods.find(f =>
            (lowerFoodName(f).includes("chicken") || lowerFoodName(f).includes("kuřec")) &&
            lowerFoodName(f).includes("halal")
          );
          if (match) return match.name;
        }

        if (lowerMenu.includes("chicken") && !lowerMenu.includes("halal")) {
          const nonHalalMatch = foods.find(f =>
            (lowerFoodName(f).includes("chicken") || lowerFoodName(f).includes("kuřec")) &&
            !lowerFoodName(f).includes("halal")
          );
          if (nonHalalMatch) return nonHalalMatch.name;
          const anyChicken = foods.find(f =>
            lowerFoodName(f).includes("chicken") || lowerFoodName(f).includes("kuřec")
          );
          if (anyChicken) return anyChicken.name;
        }

        if (lowerMenu.includes("vegetarian") || lowerMenu.includes("vegan") ||
            lowerMenu.includes("vegetariánsk") || lowerMenu.includes("veganské")) {
          const match = foods.find(f =>
            lowerFoodName(f).includes("vegetarian") || lowerFoodName(f).includes("vegan") ||
            lowerFoodName(f).includes("vegetariánsk") || lowerFoodName(f).includes("veganské")
          );
          if (match) return match.name;
        }

        if (lowerMenu.includes("traditional") || lowerMenu.includes("tradiční")) {
          const match = foods.find(f =>
            lowerFoodName(f).includes("traditional") || lowerFoodName(f).includes("tradiční")
          );
          if (match) return match.name;
        }

        return defaultMenu;
      };

      const defaultAdultPrice = pricing?.adultPrice ?? 1250;
      const defaultChildPrice = pricing?.childPrice ?? 800;

      const newReservations: ReservationEntry[] = aiJson.reservations.map((r: AiMultiReservationEntry) => {
        const persons: PersonEntry[] = [];

        const groupMenu = findMenuMatch(r.menu);
        const adultPrice = r.pricePerPerson ?? defaultAdultPrice;
        const groupNationality = aiJson.contact?.nationality || "";

        for (let i = 0; i < r.adults; i++) {
          persons.push({ type: "adult", menu: groupMenu, price: adultPrice, nationality: groupNationality, drinkOption: "none", drinkName: "", drinkPrice: 0, drinkItemId: null });
        }

        const childMenu = foods?.find(f => f.isChildrenMenu)?.name || "Dětské menu";
        const childPrice = r.pricePerPerson
          ? Math.round(r.pricePerPerson * 0.64)
          : defaultChildPrice;
        for (let i = 0; i < r.children; i++) {
          persons.push({ type: "child", menu: childMenu, price: childPrice, nationality: groupNationality, drinkOption: "none", drinkName: "", drinkPrice: 0, drinkItemId: null });
        }

        for (let i = 0; i < r.infants; i++) {
          persons.push({ type: "infant", menu: "Bez jídla", price: 0, nationality: groupNationality, drinkOption: "none", drinkName: "", drinkPrice: 0, drinkItemId: null });
        }

        for (let i = 0; i < r.freeTourLeaders; i++) {
          persons.push({ type: "guide", menu: "Bez jídla", price: 0, nationality: "", drinkOption: "none", drinkName: "", drinkPrice: 0, drinkItemId: null });
        }

        for (let i = 0; i < r.freeDrivers; i++) {
          persons.push({ type: "driver", menu: "Bez jídla", price: 0, nationality: "", drinkOption: "none", drinkName: "", drinkPrice: 0, drinkItemId: null });
        }

        const noteParts: string[] = [];
        if (r.groupCode) noteParts.push(r.groupCode);
        if (r.menu) noteParts.push(`Menu: ${r.menu}`);
        if (r.pricePerPerson) noteParts.push(`Cena: ${r.pricePerPerson} ${getCurrencySymbol(sharedContact.currency)}/os`);
        if (r.notes) noteParts.push(r.notes);

        return {
          date: r.date,
          persons,
          status: "RECEIVED" as const,
          contactNote: noteParts.join(" | "),
          transfers: [],
        };
      });

      setReservations(newReservations);
      setActiveTabIndex(0);
      successToast(`AI načetl ${newReservations.length} rezervací do formuláře`);
    } catch (e: unknown) {
      errorToast(e instanceof Error ? e.message : "Chyba při aplikaci AI dat");
    }
  };

  return {
    aiInput,
    setAiInput,
    aiJson,
    aiError,
    aiLoading,
    fileProcessing,
    fileInputRef,
    handleFileUpload,
    handleAiAnalyze,
    handleAiApply,
  };
}
