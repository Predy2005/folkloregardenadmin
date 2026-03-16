import { useState, useMemo } from "react";
import { PAGE_SIZE_OPTIONS } from "@/shared/lib/constants";

/**
 * Reusable pagination hook.
 * Replaces 4+ duplicate pagination implementations across list pages.
 *
 * @example
 * const { page, pageSize, setPage, setPageSize, paginatedData, totalPages } = usePagination(filteredData);
 */
export function usePagination<T>(data: T[], defaultPageSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const totalPages = Math.ceil(data.length / pageSize);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, page, pageSize]);

  const safeSetPage = (newPage: number) => {
    setPage(Math.max(1, Math.min(newPage, totalPages || 1)));
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  return {
    page,
    pageSize,
    setPage: safeSetPage,
    setPageSize: handlePageSizeChange,
    paginatedData,
    totalPages,
    totalItems: data.length,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
  };
}
