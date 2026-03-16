import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { useCategoryAutocomplete, useCreateCategory } from "@/modules/cashbox/hooks/useCashMovementCategories";
import { useDebounce } from "@/shared/hooks/useDebounce";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  type: "INCOME" | "EXPENSE";
  placeholder?: string;
  disabled?: boolean;
}

export function CategoryCombobox({
  value,
  onChange,
  type,
  placeholder = "Vyberte kategorii...",
  disabled = false,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: categories = [] } = useCategoryAutocomplete(debouncedSearch, type);
  const createMutation = useCreateCategory();

  const exactMatch = categories.some(
    (c) => c.name.toLowerCase() === search.trim().toLowerCase(),
  );

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    try {
      await createMutation.mutateAsync({ name, type });
      handleSelect(name);
    } catch {
      // Category may already exist, just select it
      handleSelect(name);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value || <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Hledat nebo napsat..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                  onClick={handleCreate}
                >
                  <Plus className="h-4 w-4" />
                  Vytvořit &ldquo;{search.trim()}&rdquo;
                </button>
              ) : (
                "Žádné kategorie"
              )}
            </CommandEmpty>
            <CommandGroup>
              {categories.map((cat) => (
                <CommandItem
                  key={cat.id}
                  value={cat.name}
                  onSelect={() => handleSelect(cat.name)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === cat.name ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="flex-1">{cat.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {cat.usageCount}×
                  </span>
                </CommandItem>
              ))}
              {search.trim() && !exactMatch && categories.length > 0 && (
                <CommandItem onSelect={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Vytvořit &ldquo;{search.trim()}&rdquo;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
