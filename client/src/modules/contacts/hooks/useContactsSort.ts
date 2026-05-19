import { useMemo, useState } from "react";
import type { Contact } from "@shared/types";

export type ContactSortColumn = "name" | "phone" | "company" | "invoiceIc" | "invoiceDic";

/**
 * Lokální sort pro tabulku kontaktů. `toggleSort` přepíná `asc → desc → off`
 * (vypnutý sort = default order podle backendu). Český `Intl.Collator` s
 * `numeric: true` řeší diakritiku (Č/Š/Ž na správném místě) a číselné porovnání
 * IČO/DIČ/telefonu ať se "123" nesetřídí před "9".
 */
export function useContactsSort(contacts: Contact[]) {
  const [sortColumn, setSortColumn] = useState<ContactSortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const toggleSort = (col: ContactSortColumn) => {
    if (sortColumn !== col) {
      setSortColumn(col);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortColumn(null);
      setSortDirection("asc");
    }
  };

  const sortedContacts = useMemo(() => {
    if (!sortColumn) return contacts;
    const collator = new Intl.Collator("cs", { sensitivity: "base", numeric: true });
    const copy = [...contacts];
    copy.sort((a, b) => {
      const av = (a[sortColumn] ?? "") as string;
      const bv = (b[sortColumn] ?? "") as string;
      // Prázdné hodnoty padají na konec bez ohledu na směr.
      if (!av && bv) return 1;
      if (av && !bv) return -1;
      const cmp = collator.compare(av, bv);
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [contacts, sortColumn, sortDirection]);

  return { sortColumn, sortDirection, toggleSort, sortedContacts };
}
