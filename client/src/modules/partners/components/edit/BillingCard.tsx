import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import type { PartnerForm } from "../edit/types";

interface BillingCardProps {
  form: UseFormReturn<PartnerForm>;
}

export function BillingCard({ form }: BillingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fakturace a detekce</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="billingPeriod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fakturacni obdobi</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte obdobi" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PER_RESERVATION">Za kazdou rezervaci</SelectItem>
                  <SelectItem value="MONTHLY">Mesicne</SelectItem>
                  <SelectItem value="QUARTERLY">Ctvrtletne</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="billingEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fakturacni email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="fakturace@partner.cz" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoiceCompany"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fakturacni firma</FormLabel>
                <FormControl>
                  <Input placeholder="Nazev firmy" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="invoiceStreet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Ulice</FormLabel>
                <FormControl>
                  <Input placeholder="Ulice a cislo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="invoiceCity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mesto</FormLabel>
                <FormControl>
                  <Input placeholder="Mesto" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="invoiceZipcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PSC</FormLabel>
                <FormControl>
                  <Input placeholder="12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="commissionRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Provize (%)</FormLabel>
              <FormControl>
                <Input type="number" min="0" max="100" step="0.1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Automaticka detekce partnera
          </h3>
          <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            Pokud email nebo jmeno kontaktu v rezervaci odpovida nize uvedenym hodnotam,
            partner bude automaticky detekovan.
          </div>
          <FormField
            control={form.control}
            name="detectionEmails"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detekcni emaily (jeden na radek)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={"recepce@hotel.cz\nbooking@hotel.cz"}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="detectionKeywords"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detekcni klicova slova (jedno na radek)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder={"Hotel Prague\nPrague Tours"}
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
}
