import { useEffect, useRef } from "react";
import dayjs from "dayjs";
import type { Contact } from "@shared/types";
import type {
  ReservationEntry,
  SharedContact,
  TransferEntry,
} from "@modules/reservations/types";

interface LoadedReservation {
  contactName: string;
  contactEmail?: string | null;
  contactPhone: string;
  contactNationality: string;
  clientComeFrom?: string;
  currency?: string;
  invoiceSameAsContact: boolean;
  invoiceName?: string;
  invoiceCompany?: string;
  invoiceIc?: string;
  invoiceDic?: string;
  invoiceEmail?: string;
  invoicePhone?: string;
  date: string;
  status: ReservationEntry["status"];
  contactNote?: string | null;
  orderedBy?: string | null;
  reservationTypeId?: number;
  persons?: Array<{
    type: ReservationEntry["persons"][number]["type"];
    menu: string;
    price: number | string;
    nationality?: string;
    drinkOption?: ReservationEntry["persons"][number]["drinkOption"];
    drinkName?: string;
    drinkPrice?: number | string;
    drinkItemId?: number | null; // legacy single ID — fallback
    drinkItemIds?: number[] | null;
  }>;
  transfers?: Array<{
    personCount?: number;
    address?: string;
    transportCompanyId?: number | null;
    transportVehicleId?: number | null;
    transportDriverId?: number | null;
  }>;
  transferSelected?: boolean;
  transferAddress?: string;
  transferCount?: number;
}

interface UseReservationLoadAndPrefillArgs {
  isEdit: boolean;
  reservation: LoadedReservation | undefined;
  prefillContact: Contact | undefined;
  linkedContact: Contact | undefined;
  setSharedContact: React.Dispatch<React.SetStateAction<SharedContact>>;
  setReservations: React.Dispatch<React.SetStateAction<ReservationEntry[]>>;
}

export function useReservationLoadAndPrefill({
  isEdit,
  reservation,
  prefillContact,
  linkedContact,
  setSharedContact,
  setReservations,
}: UseReservationLoadAndPrefillArgs) {
  useEffect(() => {
    if (!isEdit || !reservation) return;
    setSharedContact({
      contactName: reservation.contactName,
      contactEmail: reservation.contactEmail ?? "",
      contactPhone: reservation.contactPhone,
      contactNationality: reservation.contactNationality,
      clientComeFrom: reservation.clientComeFrom || "",
      currency: reservation.currency || "CZK",
      invoiceSameAsContact: reservation.invoiceSameAsContact,
      invoiceName: reservation.invoiceName || "",
      invoiceCompany: reservation.invoiceCompany || "",
      invoiceIc: reservation.invoiceIc || "",
      invoiceDic: reservation.invoiceDic || "",
      invoiceEmail: reservation.invoiceEmail || "",
      invoicePhone: reservation.invoicePhone || "",
    });

    let loadedTransfers: TransferEntry[] = [];
    if (reservation.transfers && reservation.transfers.length > 0) {
      loadedTransfers = reservation.transfers.map((t) => ({
        personCount: t.personCount || 1,
        address: t.address || "",
        transportCompanyId: t.transportCompanyId || null,
        transportVehicleId: t.transportVehicleId || null,
        transportDriverId: t.transportDriverId || null,
      }));
    } else if (reservation.transferSelected && reservation.transferAddress) {
      loadedTransfers = [
        {
          personCount: reservation.transferCount || 1,
          address: reservation.transferAddress || "",
        },
      ];
    }

    setReservations([
      {
        date: dayjs(reservation.date).format("YYYY-MM-DD"),
        persons:
          reservation.persons?.map((p) => ({
            type: p.type,
            menu: p.menu,
            price: Number(p.price),
            nationality: p.nationality || "",
            drinkOption: p.drinkOption || "none",
            drinkName: p.drinkName || "",
            drinkPrice: Number(p.drinkPrice || 0),
            // Welcome combo (víno+medovina+sodovka) → array; legacy single drink
            // se promítne jako `[id]` aby existující rezervace nesketly o data.
            drinkItemIds: Array.isArray(p.drinkItemIds) && p.drinkItemIds.length > 0
              ? p.drinkItemIds
              : (p.drinkItemId != null ? [p.drinkItemId] : []),
          })) || [],
        status: reservation.status,
        contactNote: reservation.contactNote || "",
        orderedBy: reservation.orderedBy || "",
        transfers: loadedTransfers,
        reservationTypeId: reservation.reservationTypeId,
      },
    ]);
  }, [isEdit, reservation, setSharedContact, setReservations]);

  useEffect(() => {
    if (isEdit || !prefillContact) return;
    const c = prefillContact;
    setSharedContact((prev) => ({
      ...prev,
      contactName: c.name || prev.contactName,
      contactEmail: c.email || prev.contactEmail,
      contactPhone: c.phone || prev.contactPhone,
      invoiceSameAsContact: !(c.invoiceName || c.company || c.invoiceIc),
      invoiceName: c.invoiceName || prev.invoiceName,
      invoiceCompany: c.company || prev.invoiceCompany,
      invoiceIc: c.invoiceIc || prev.invoiceIc,
      invoiceDic: c.invoiceDic || prev.invoiceDic,
      invoiceEmail: c.invoiceEmail || prev.invoiceEmail,
      invoicePhone: c.invoicePhone || prev.invoicePhone,
      clientComeFrom: c.clientComeFrom || prev.clientComeFrom,
    }));
  }, [isEdit, prefillContact, setSharedContact]);

  const autoPrefilledRef = useRef(false);
  useEffect(() => {
    if (!isEdit || !linkedContact || autoPrefilledRef.current) return;
    const c = linkedContact;
    const hasBilling =
      c.invoiceName || c.company || c.invoiceIc || c.invoiceDic || c.invoiceEmail || c.invoicePhone;
    if (!hasBilling) return;
    setSharedContact((prev) => ({
      ...prev,
      invoiceName: prev.invoiceName || c.invoiceName || c.name || "",
      invoiceCompany: prev.invoiceCompany || c.company || "",
      invoiceIc: prev.invoiceIc || c.invoiceIc || "",
      invoiceDic: prev.invoiceDic || c.invoiceDic || "",
      invoiceEmail: prev.invoiceEmail || c.invoiceEmail || "",
      invoicePhone: prev.invoicePhone || c.invoicePhone || "",
    }));
    autoPrefilledRef.current = true;
  }, [isEdit, linkedContact, setSharedContact]);
}
