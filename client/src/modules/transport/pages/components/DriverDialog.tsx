import { UseFormReturn } from "react-hook-form";
import { UseMutationResult } from "@tanstack/react-query";
import type { TransportDriver } from "@shared/types";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Separator } from "@/shared/components/ui/separator";
import { MobileAccountCard } from "@/shared/components/MobileAccountCard";
import { Loader2 } from "lucide-react";
import { z } from "zod";

export const driverSchema = z.object({
  firstName: z.string().min(1, "Zadejte jmeno"),
  lastName: z.string().min(1, "Zadejte prijmeni"),
  phone: z.string().optional(),
  email: z.string().email("Zadejte platny email").or(z.literal("")).optional(),
  licenseNumber: z.string().optional(),
  licenseCategories: z.string().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export type DriverForm = z.infer<typeof driverSchema>;

interface DriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingDriver: TransportDriver | null;
  form: UseFormReturn<DriverForm>;
  saveMutation: UseMutationResult<unknown, Error, DriverForm>;
  onClose: () => void;
}

export function DriverDialog({ open, onOpenChange, editingDriver, form, saveMutation, onClose }: DriverDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDriver ? "Upravit ridice" : "Pridat ridice"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => saveMutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Jmeno *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Prijmeni *</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefon</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Cislo ridicaku</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="licenseCategories" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategorie ridicaku</FormLabel>
                  <FormControl><Input {...field} placeholder="B, C, D..." /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="isActive" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel>Aktivni</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Poznamky</FormLabel>
                <FormControl><Textarea rows={3} {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Zrusit</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingDriver ? "Ulozit" : "Pridat"}
              </Button>
            </DialogFooter>
          </form>
        </Form>

        {editingDriver && (
          <>
            <Separator className="my-4" />
            <MobileAccountCard
              basePath={`/api/transport/drivers/${editingDriver.id}`}
              entityEmail={editingDriver.email ?? null}
              canCreate={!!editingDriver.email}
              derivedRole="STAFF_DRIVER"
              supportsSyncRole={false}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
