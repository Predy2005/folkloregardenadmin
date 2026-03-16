import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Button } from "@/shared/components/ui/button";
import type { UseFormReturn } from "react-hook-form";
import { Textarea } from "@/shared/components/ui/textarea";
import type { Option } from "../types";

interface StaffFormDialogProps {
  open: boolean;
  isEdit: boolean;
  form: UseFormReturn<any>;
  onClose: () => void;
  onSubmit: (data: any) => void;
  options: Option[];
  pending: boolean;
}

export function StaffFormDialog({
  open,
  isEdit,
  form,
  onClose,
  onSubmit,
  options,
  pending,
}: StaffFormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upravit člena" : "Nový člen personálu"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Upravte údaje člena personálu"
              : "Přidejte nového člena týmu"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={"firstName" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Jméno *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Jan"
                        data-testid="input-first-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"lastName" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Příjmení *</FormLabel>
                    <FormControl>
                      <Input placeholder="Novák" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={"dateOfBirth" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Datum narození *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="20.05.1982"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={"email" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"phone" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+420..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={"emergencyContact" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouzový kontakt</FormLabel>
                    <FormControl>
                      <Input placeholder="Např. volat maminku..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={"emergencyPhone" as any}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouzový Telefon</FormLabel>
                    <FormControl>
                      <Input placeholder="+420..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={"address" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adresa</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Aloisina..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"position" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role / pozice *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value ?? ""}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-role">
                        <SelectValue placeholder="Vyberte roli" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {options.map((opt: Option) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"hourlyRate" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hodinová sazba (Kč)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="150"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"fixedRate" as any}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fixní sazba (Kč)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="150"
                      {...field}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value
                            ? parseFloat(e.target.value)
                            : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={"isActive" as any}
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <FormLabel>Aktivní</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Zrušit
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-gradient-to-r from-primary to-purple-600"
              >
                {pending ? "Ukládání..." : isEdit ? "Uložit" : "Vytvořit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
