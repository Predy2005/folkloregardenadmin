import { UseFormReturn } from "react-hook-form";
import type { StaffForm } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Switch } from "@/shared/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/shared/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Users } from "lucide-react";

interface StaffInfoFormProps {
  form: UseFormReturn<StaffForm>;
  watchIsGroup: boolean;
  roleOptions: { value: string; label: string }[];
  column: "left" | "right";
}

export function StaffInfoForm({ form, watchIsGroup, roleOptions, column }: StaffInfoFormProps) {
  if (column === "right") {
    return (
      <>
        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Kontakt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
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
            {!watchIsGroup && (
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresa</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ulice, město..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </CardContent>
        </Card>

        {/* Emergency + Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {watchIsGroup ? "Poznámky" : "Nouzový kontakt & poznámky"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!watchIsGroup && (
              <>
                <FormField
                  control={form.control}
                  name="emergencyContact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouzový kontakt</FormLabel>
                      <FormControl>
                        <Input placeholder="Jméno osoby" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="emergencyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouzový telefon</FormLabel>
                      <FormControl>
                        <Input placeholder="+420..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poznámky</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={watchIsGroup ? "Repertoár, kontaktní údaje členů..." : "Interní poznámky..."}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Základní údaje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Group toggle */}
          <FormField
            control={form.control}
            name="isGroup"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <FormLabel className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Skupina / kapela
                  </FormLabel>
                  <FormDescription className="text-xs">
                    Zapněte pro hudební skupiny, kapely apod. s fixní cenou za celek
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{watchIsGroup ? "Název skupiny *" : "Jméno *"}</FormLabel>
                  <FormControl>
                    <Input placeholder={watchIsGroup ? "Kapela Xyz" : "Jan"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{watchIsGroup ? "Kontaktní osoba *" : "Příjmení *"}</FormLabel>
                  <FormControl>
                    <Input placeholder={watchIsGroup ? "Vedoucí kapely" : "Novák"} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {watchIsGroup && (
            <FormField
              control={form.control}
              name="groupSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Počet členů skupiny</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="5"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role / pozice *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Vyberte roli" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleOptions.map((opt) => (
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

          {!watchIsGroup && (
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum narození</FormLabel>
                  <FormControl>
                    <Input placeholder="20.05.1982" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between">
                <FormLabel>Aktivní</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </>
  );
}
