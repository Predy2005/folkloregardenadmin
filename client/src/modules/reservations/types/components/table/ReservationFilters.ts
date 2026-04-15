export interface FilterState {
  statusFilter: string;
  nationalityFilter: string;
  dateFrom: string;
  dateTo: string;
}

export interface ReservationFiltersProps {
  readonly searchTerm: string;
  readonly onSearchChange: (value: string) => void;
  readonly filters: FilterState;
  readonly onFilterChange: (filters: Partial<FilterState>) => void;
  readonly onClearAll: () => void;
  readonly nationalities: string[];
  readonly showFilters: boolean;
  readonly onToggleFilters: () => void;
  readonly pageSize: number;
  readonly onPageSizeChange: (value: string) => void;
}
