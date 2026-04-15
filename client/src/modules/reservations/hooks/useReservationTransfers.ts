import { useState, useRef, useEffect } from "react";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
  searchAddresses,
  type AddressResult,
} from "@modules/contacts/utils/addressSearch";
import type { ReservationEntry, TransferEntry } from "@modules/reservations/types";

export function useReservationTransfers(params: {
  reservations: ReservationEntry[];
  activeTabIndex: number;
  updateReservation: (index: number, updates: Partial<ReservationEntry>) => void;
}) {
  const { reservations, activeTabIndex, updateReservation } = params;

  // Address search autocomplete
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [isAddressDropdownOpen, setIsAddressDropdownOpen] = useState(false);
  const [isAddressSearching, setIsAddressSearching] = useState(false);
  const [activeTransferIndex, setActiveTransferIndex] = useState<number | null>(null);
  const addressBoxRef = useRef<HTMLDivElement | null>(null);

  // Debounced search values
  const currentAddress = activeTransferIndex !== null
    ? (reservations[activeTabIndex]?.transfers?.[activeTransferIndex]?.address || "")
    : "";
  const debouncedAddress = useDebounce(currentAddress, 400);

  // Address search handler with debounce
  useEffect(() => {
    if (activeTransferIndex === null || debouncedAddress.length < 3 || !isAddressDropdownOpen) {
      setAddressResults([]);
      return;
    }
    let cancelled = false;
    setIsAddressSearching(true);
    searchAddresses(debouncedAddress)
      .then(results => { if (!cancelled) setAddressResults(results); })
      .catch(() => { if (!cancelled) setAddressResults([]); })
      .finally(() => { if (!cancelled) setIsAddressSearching(false); });
    return () => { cancelled = true; };
  }, [debouncedAddress, activeTransferIndex, isAddressDropdownOpen]);

  // Transfer helpers
  const addTransfer = (resIndex: number) => {
    const newTransfers = [...reservations[resIndex].transfers, { personCount: 1, address: "" }];
    updateReservation(resIndex, { transfers: newTransfers });
  };

  const updateTransfer = (resIndex: number, transferIndex: number, updates: Partial<TransferEntry>) => {
    const newTransfers = [...reservations[resIndex].transfers];
    newTransfers[transferIndex] = { ...newTransfers[transferIndex], ...updates };
    updateReservation(resIndex, { transfers: newTransfers });
  };

  const removeTransfer = (resIndex: number, transferIndex: number) => {
    const newTransfers = reservations[resIndex].transfers.filter((_, i) => i !== transferIndex);
    updateReservation(resIndex, { transfers: newTransfers });
    if (activeTransferIndex === transferIndex) {
      setActiveTransferIndex(null);
      setIsAddressDropdownOpen(false);
    } else if (activeTransferIndex !== null && activeTransferIndex > transferIndex) {
      setActiveTransferIndex(activeTransferIndex - 1);
    }
  };

  return {
    // Address search
    addressResults,
    isAddressDropdownOpen, setIsAddressDropdownOpen,
    isAddressSearching,
    activeTransferIndex, setActiveTransferIndex,
    addressBoxRef,

    // Actions
    addTransfer,
    updateTransfer,
    removeTransfer,
  };
}
