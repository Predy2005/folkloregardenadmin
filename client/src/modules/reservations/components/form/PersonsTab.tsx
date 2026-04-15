import { Button } from '@/shared/components/ui/button';
import { SectionHeader } from '@/shared/components/SectionHeader';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/shared/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { formatCurrency, getCurrencySymbol } from '@/shared/lib/formatting';
import { useCurrency } from '@/shared/contexts/CurrencyContext';
import { PERSON_TYPE_LABELS } from '@shared/types';
import type { PersonsTabProps } from '@modules/reservations/types/components/form/PersonsTab';

export function PersonsTab({ personFields, onAdd, onRemove, foods, totalPrice, currency: currencyProp }: PersonsTabProps) {
  const form = useFormContext();
  const { defaultCurrency } = useCurrency();
  const cur = currencyProp ?? defaultCurrency;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionHeader title="Osoby a jídla" />
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd('adult')} data-testid="button-add-adult">
            <Plus className="w-4 h-4 mr-2" /> Dospělý
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd('child')} data-testid="button-add-child">
            <Plus className="w-4 h-4 mr-2" /> Dítě
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd('infant')} data-testid="button-add-infant">
            <Plus className="w-4 h-4 mr-2" /> Batole
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd('driver')} data-testid="button-add-driver">
            <Plus className="w-4 h-4 mr-2" /> Řidič (zdarma)
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onAdd('guide')} data-testid="button-add-guide">
            <Plus className="w-4 h-4 mr-2" /> Průvodce (zdarma)
          </Button>
        </div>
      </div>

      {personFields.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-md">Přidejte osoby pomocí tlačítek výše</div>
      ) : (
        <div className="space-y-3">
          {personFields.map((person, index) => (
            <div key={person.id} className="border rounded-md p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Osoba {index + 1} - {PERSON_TYPE_LABELS[person.type]}</h4>
                <Button type="button" variant="ghost" size="sm" onClick={() => onRemove(index)} className="text-destructive" data-testid={`button-remove-person-${index}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`persons.${index}.menu`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Menu</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={person.type === 'infant' || person.type === 'driver' || person.type === 'guide'}>
                        <FormControl>
                          <SelectTrigger data-testid={`select-menu-${index}`}>
                            <SelectValue placeholder="Vyberte menu" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {person.type === 'infant' ? (
                            <SelectItem value="Bez jídla">Bez jídla</SelectItem>
                          ) : (
                            <>
                              {foods?.filter((f) => (person.type === 'child' ? f.isChildrenMenu : !f.isChildrenMenu)).map((food) => (
                                <SelectItem key={food.id} value={food.name}>
                                  {food.name}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name={`persons.${index}.price`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cena</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(value === '' ? 0 : parseFloat(value));
                            }}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            disabled={person.type === 'driver' || person.type === 'guide'}
                            data-testid={`input-price-${index}`}
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{getCurrencySymbol(cur)}</div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Celková cena osob:</span>
              <span className="font-mono">{formatCurrency(Math.round(totalPrice), cur)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
