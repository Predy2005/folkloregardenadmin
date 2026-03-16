import { useState, useCallback } from "react";

/**
 * Reusable hook for dialog + form state management.
 * Replaces 35+ duplicate dialog state patterns across the codebase.
 *
 * @example
 * const { isOpen, editingItem, openCreate, openEdit, close } = useFormDialog<StaffMember>();
 */
export function useFormDialog<T extends { id: number } | null = null>() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setIsOpen(true);
  }, []);

  const openEdit = useCallback((item: T) => {
    setEditingItem(item);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
  }, []);

  const isEditing = editingItem !== null;

  return { isOpen, setIsOpen, editingItem, isEditing, openCreate, openEdit, close };
}
