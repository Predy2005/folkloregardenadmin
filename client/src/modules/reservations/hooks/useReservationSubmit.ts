import { useState } from "react";
import { api } from "@/shared/lib/api";
import { invalidateReservationQueries, invalidateInvoiceQueries } from "@/shared/lib/query-helpers";
import { successToast, errorToast } from "@/shared/lib/toast-helpers";
import type { Reservation } from "@shared/types";
import type { ReservationEntry, SharedContact } from "@modules/reservations/types";

export function useReservationSubmit(params: {
  isEdit: boolean;
  reservationId: number | null;
  reservations: ReservationEntry[];
  sharedContact: SharedContact;
  partnerId: number | null;
  navigate: (to: string) => void;
  autoCreateInvoice: boolean;
  autoInvoiceType: "DEPOSIT" | "FINAL";
  autoInvoicePercent: number;
}) {
  const {
    isEdit, reservationId, reservations, sharedContact, partnerId,
    navigate, autoCreateInvoice, autoInvoiceType, autoInvoicePercent,
  } = params;

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitResults, setSubmitResults] = useState<{ success: boolean; date: string; error?: string }[]>([]);

  const handleSubmitAll = async () => {
    const contactErrors: string[] = [];
    if (!sharedContact.contactName?.trim()) contactErrors.push("Jméno kontaktu");
    if (!sharedContact.contactEmail?.trim() || !sharedContact.contactEmail.includes("@")) contactErrors.push("Platný e-mail");
    if (!sharedContact.contactPhone?.trim()) contactErrors.push("Telefon");

    if (contactErrors.length > 0) {
      errorToast(`Vyplňte: ${contactErrors.join(", ")}`);
      return;
    }

    const invalidIndexes = reservations
      .map((r, i) => (!r.date || r.persons.length === 0) ? i + 1 : null)
      .filter(Boolean);
    if (invalidIndexes.length > 0) {
      errorToast(`Rezervace #${invalidIndexes.join(", #")} nemají datum nebo osoby`);
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(0);
    setSubmitResults([]);

    const results: typeof submitResults = [];

    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const payload = {
        date: res.date,
        currency: sharedContact.currency,
        contactName: sharedContact.contactName,
        contactEmail: sharedContact.contactEmail,
        contactPhone: sharedContact.contactPhone,
        contactNationality: sharedContact.contactNationality,
        clientComeFrom: sharedContact.clientComeFrom,
        contactNote: res.contactNote,
        invoiceSameAsContact: sharedContact.invoiceSameAsContact,
        invoiceName: sharedContact.invoiceName,
        invoiceCompany: sharedContact.invoiceCompany,
        invoiceIc: sharedContact.invoiceIc,
        invoiceDic: sharedContact.invoiceDic,
        invoiceEmail: sharedContact.invoiceEmail,
        invoicePhone: sharedContact.invoicePhone,
        transferSelected: res.transfers.length > 0,
        transfers: res.transfers,
        agreement: true,
        persons: res.persons,
        status: res.status,
        reservationTypeId: res.reservationTypeId,
        partnerId: partnerId || undefined,
      };

      try {
        await api.post("/api/reservations", payload);
        results.push({ success: true, date: res.date });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Chyba";
        results.push({ success: false, date: res.date, error: message });
      }

      setSubmitProgress(((i + 1) / reservations.length) * 100);
    }

    setSubmitResults(results);
    setIsSubmitting(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    invalidateReservationQueries();

    if (failCount === 0) {
      successToast(`Úspěšně vytvořeno ${successCount} rezervací`);
      navigate("/reservations");
    } else {
      errorToast(`Vytvořeno ${successCount} z ${reservations.length} rezervací, ${failCount} se nepodařilo`);
    }
  };

  const handleSubmitSingle = async () => {
    const errors: string[] = [];
    if (!sharedContact.contactName?.trim()) errors.push("Jméno kontaktu");
    if (!sharedContact.contactEmail?.trim() || !sharedContact.contactEmail.includes("@")) errors.push("Platný e-mail");
    if (!sharedContact.contactPhone?.trim()) errors.push("Telefon");

    if (errors.length > 0) {
      errorToast(`Vyplňte: ${errors.join(", ")}`);
      return;
    }

    const res = reservations[0];
    if (!res.date) {
      errorToast("Vyplňte datum rezervace");
      return;
    }
    if (res.persons.length === 0) {
      errorToast("Přidejte alespoň jednu osobu");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      date: res.date,
      contactName: sharedContact.contactName,
      contactEmail: sharedContact.contactEmail,
      contactPhone: sharedContact.contactPhone,
      contactNationality: sharedContact.contactNationality,
      clientComeFrom: sharedContact.clientComeFrom,
      contactNote: res.contactNote,
      invoiceSameAsContact: sharedContact.invoiceSameAsContact,
      invoiceName: sharedContact.invoiceName,
      invoiceCompany: sharedContact.invoiceCompany,
      invoiceIc: sharedContact.invoiceIc,
      invoiceDic: sharedContact.invoiceDic,
      invoiceEmail: sharedContact.invoiceEmail,
      invoicePhone: sharedContact.invoicePhone,
      transferSelected: res.transfers.length > 0,
      transfers: res.transfers,
      agreement: true,
      persons: res.persons,
      status: res.status,
      reservationTypeId: res.reservationTypeId,
      partnerId: partnerId || undefined,
    };

    try {
      if (isEdit && reservationId) {
        await api.put(`/api/reservations/${reservationId}`, payload);
        successToast("Rezervace byla aktualizována");
      } else {
        const newReservation = await api.post<Reservation>("/api/reservations", payload);
        successToast("Rezervace byla vytvořena");

        if (autoCreateInvoice && newReservation.id) {
          try {
            if (autoInvoiceType === "DEPOSIT") {
              await api.post(`/api/invoices/create-deposit/${newReservation.id}`, {
                percent: autoInvoicePercent,
              });
              successToast("Zálohová faktura vytvořena");
            } else {
              await api.post(`/api/invoices/create-final/${newReservation.id}`);
              successToast("Ostrá faktura vytvořena");
            }
          } catch (invoiceError: unknown) {
            const message = invoiceError instanceof Error ? invoiceError.message : "Rezervace vytvořena, ale faktura se nepodařila vytvořit";
            errorToast(message);
          }
        }
      }
      invalidateReservationQueries();
      invalidateInvoiceQueries();
      navigate("/reservations");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Chyba při ukládání";
      errorToast(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitProgress,
    submitResults,
    handleSubmitSingle,
    handleSubmitAll,
  };
}
