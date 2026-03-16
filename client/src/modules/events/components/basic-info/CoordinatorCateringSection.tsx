import { UseFormReturn } from "react-hook-form";
import { CATERING_TYPE_LABELS, type StaffMember } from "@shared/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import type { BasicInfoForm } from "../BasicInfoTab";

interface CoordinatorCateringSectionProps {
  form: UseFormReturn<BasicInfoForm>;
  staffMembers: StaffMember[] | undefined;
  isFolklorniShow: boolean;
}

export default function CoordinatorCateringSection({
  form,
  staffMembers,
  isFolklorniShow,
}: CoordinatorCateringSectionProps) {
  const watchedIsExternalCoordinator = form.watch("isExternalCoordinator");
  const watchedCateringType = form.watch("cateringType");

  return (
    <>
      {/* Koordinátor */}
      <Card>
        <CardHeader>
          <CardTitle>Koordinátor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="isExternalCoordinator"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0 cursor-pointer">Externí koordinátor (ne z našeho personálu)</FormLabel>
              </FormItem>
            )}
          />

          {!watchedIsExternalCoordinator ? (
            <FormField
              control={form.control}
              name="coordinatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Koordinátor z personálu</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v && v !== "__none__" ? parseInt(v) : null)}
                    value={field.value?.toString() || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Vyberte koordinátora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                      {staffMembers?.filter(s => s.isActive).map((member) => (
                        <SelectItem key={member.id} value={member.id.toString()}>
                          {member.firstName} {member.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(!staffMembers || staffMembers.length === 0) && (
                    <FormDescription className="text-orange-600">
                      Žádný personál nebyl nalezen. Zkontrolujte oprávnění nebo přidejte členy personálu.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="externalCoordinatorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jméno koordinátora *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Jméno a příjmení" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="externalCoordinatorPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefon</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+420 xxx xxx xxx" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="externalCoordinatorEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="externalCoordinatorNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Poznámka ke koordinátorovi</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Poznámka..." rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catering - pouze pro non-folklorni_show */}
      {!isFolklorniShow && (
        <Card>
          <CardHeader>
            <CardTitle>Catering</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cateringType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typ cateringu</FormLabel>
                    <Select onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)} value={field.value || "__none__"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Vyberte typ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Nevybráno --</SelectItem>
                        {Object.entries(CATERING_TYPE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedCateringType === "ventura" && (
                <>
                  <FormField
                    control={form.control}
                    name="cateringCommissionPercent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provize (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.1}
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                            placeholder="0"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
