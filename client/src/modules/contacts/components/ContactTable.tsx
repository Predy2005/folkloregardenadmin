import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableRow } from "@/shared/components/ui/table";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import type { Contact } from "@shared/types";
import { usePagination } from "@/shared/hooks/usePagination";
import { ContactFilters } from "./ContactFilters";
import { ContactBulkActionDialog } from "./ContactBulkActionDialog";
import { ContactTableHeader } from "./ContactTableHeader";
import { ContactTableRow } from "./ContactTableRow";
import { ContactTablePagination } from "./ContactTablePagination";
import { BulkCreatePartnersDialog } from "./BulkCreatePartnersDialog";
import { useContactsSort } from "../hooks/useContactsSort";
import { useContactsBulkActions } from "../hooks/useContactsBulkActions";

type Props = {
  readonly contacts: Contact[];
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly onEdit: (contact: Contact) => void;
  readonly onDelete: (id: number) => void;
  readonly onNewReservation: (contact: Contact) => void;
};

const COL_COUNT = 7;

export function ContactTable({ contacts, searchTerm, onSearchChange, onEdit, onDelete, onNewReservation }: Readonly<Props>) {
  // Filter states
  const [companyFilter, setCompanyFilter] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState("");
  const [clientComeFromFilter, setClientComeFromFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [createPartnersOpen, setCreatePartnersOpen] = useState(false);

  const clearSelection = () => setSelectedIds(new Set());

  const bulk = useContactsBulkActions({ selectedIds, clearSelection });

  // Filter contacts (search + side filters)
  const filtered = useMemo(() => {
    return (contacts || []).filter((contact) => {
      const search = (searchTerm || "").toLowerCase();
      const matchesSearch =
        (contact.name || "").toLowerCase().includes(search) ||
        (contact.email || "").toLowerCase().includes(search) ||
        (contact.phone || "").includes(search) ||
        (contact.company || "").toLowerCase().includes(search) ||
        (contact.invoiceIc || "").includes(search) ||
        (contact.invoiceDic || "").includes(search);
      if (!matchesSearch) return false;
      if (companyFilter === "with_company" && !contact.company) return false;
      if (companyFilter === "without_company" && contact.company) return false;
      if (invoiceFilter === "with_ic" && !contact.invoiceIc) return false;
      if (invoiceFilter === "without_ic" && contact.invoiceIc) return false;
      if (clientComeFromFilter && contact.clientComeFrom !== clientComeFromFilter) return false;
      return true;
    });
  }, [contacts, searchTerm, companyFilter, invoiceFilter, clientComeFromFilter]);

  const { sortColumn, sortDirection, toggleSort, sortedContacts } = useContactsSort(filtered);
  const { page, pageSize, setPage, setPageSize, paginatedData, totalPages, totalItems } = usePagination(sortedContacts);

  const clientSources = useMemo(() => {
    const set = new Set<string>();
    (contacts || []).forEach((c) => { if (c.clientComeFrom) set.add(c.clientComeFrom); });
    return Array.from(set).sort();
  }, [contacts]);

  const hasActiveFilters = !!(companyFilter || invoiceFilter || clientComeFromFilter);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageIds = paginatedData.map((c) => c.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleSearchChange = (value: string) => {
    onSearchChange(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: string) => setPageSize(Number(value));

  const handleCompanyFilterChange = (value: string) => { setCompanyFilter(value === "all" ? "" : value); setPage(1); };
  const handleInvoiceFilterChange = (value: string) => { setInvoiceFilter(value === "all" ? "" : value); setPage(1); };
  const handleClientComeFromChange = (value: string) => { setClientComeFromFilter(value === "all" ? "" : value); setPage(1); };

  const clearAllFilters = () => {
    setCompanyFilter("");
    setInvoiceFilter("");
    setClientComeFromFilter("");
    onSearchChange("");
    setPage(1);
  };

  const handleConfirmCreatePartners = (partnerType: string) => {
    if (selectedIds.size === 0) return;
    bulk.bulkCreatePartnersMutation.mutate(
      { ids: Array.from(selectedIds), partnerType },
      { onSettled: () => setCreatePartnersOpen(false) },
    );
  };

  const pageAllSelected = paginatedData.length > 0 && paginatedData.every((c) => selectedIds.has(c.id));
  const pageSomeSelected = paginatedData.some((c) => selectedIds.has(c.id)) && !pageAllSelected;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <ContactFilters
          searchTerm={searchTerm}
          onSearchChange={handleSearchChange}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          companyFilter={companyFilter}
          onCompanyFilterChange={handleCompanyFilterChange}
          invoiceFilter={invoiceFilter}
          onInvoiceFilterChange={handleInvoiceFilterChange}
          clientComeFromFilter={clientComeFromFilter}
          onClientComeFromChange={handleClientComeFromChange}
          clientSources={clientSources}
          hasActiveFilters={hasActiveFilters}
          onClearAllFilters={clearAllFilters}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          selectedCount={selectedIds.size}
          onBulkSource={() => bulk.openBulkAction("source")}
          onBulkDelete={() => bulk.openBulkAction("delete")}
          onBulkCreatePartners={() => setCreatePartnersOpen(true)}
          onClearSelection={clearSelection}
        />

        <div className="rounded-md border">
          <Table>
            <ContactTableHeader
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              toggleSort={toggleSort}
              pageAllSelected={pageAllSelected}
              pageSomeSelected={pageSomeSelected}
              onToggleSelectAll={toggleSelectAll}
            />
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COL_COUNT} className="text-center py-8 text-muted-foreground">
                    Žádné kontakty
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((contact) => (
                  <ContactTableRow
                    key={contact.id}
                    contact={contact}
                    isSelected={selectedIds.has(contact.id)}
                    onToggleSelect={toggleSelect}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onNewReservation={onNewReservation}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <ContactTablePagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalItems={totalItems}
          setPage={setPage}
        />

        <ContactBulkActionDialog
          open={bulk.bulkActionOpen}
          onOpenChange={(o) => { if (!o) bulk.closeBulkAction(); }}
          actionType={bulk.bulkActionType}
          selectedCount={selectedIds.size}
          bulkValue={bulk.bulkValue}
          onBulkValueChange={bulk.setBulkValue}
          onExecute={bulk.executeBulkAction}
          onClose={bulk.closeBulkAction}
          isPending={bulk.bulkDeleteMutation.isPending || bulk.bulkUpdateMutation.isPending}
        />

        <BulkCreatePartnersDialog
          open={createPartnersOpen}
          onOpenChange={setCreatePartnersOpen}
          selectedCount={selectedIds.size}
          isPending={bulk.bulkCreatePartnersMutation.isPending}
          onConfirm={handleConfirmCreatePartners}
        />
      </div>
    </TooltipProvider>
  );
}
