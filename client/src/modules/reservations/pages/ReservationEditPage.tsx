import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { StatusBadge } from "@/shared/components/StatusBadge";
import dayjs from "dayjs";
import { Bot, Plus, Trash2 } from "lucide-react";
import { Receipt } from "lucide-react";
import { getShortAddress } from "@modules/contacts/utils/addressSearch";
import { InvoiceCreateDialog } from "@modules/reservations/components/InvoiceCreateDialog";
import {
  ContactSection,
  BillingSection,
  ReservationPersonsSection,
  PaymentInvoicesSection,
  SubmitProgressCard,
} from "@modules/reservations/components/edit";
import { AIAssistantTab } from "@modules/reservations/components/ai/AIAssistantTab";
import { ReservationFormHeader, CurrencyHeader } from "@modules/reservations/components/reservation/ReservationFormHeader";
import { PartnerDetectionCard } from "@modules/reservations/components/reservation/PartnerDetectionCard";
import { useReservationForm } from "@modules/reservations/hooks/useReservationForm";
import { useAIAssistant } from "@modules/reservations/hooks/useAIAssistant";
import type { ReservationEntry } from "@modules/reservations/types";

export default function ReservationEdit() {
  const form = useReservationForm();
  const ai = useAIAssistant({
    foods: form.foods,
    pricing: form.pricing,
    sharedContact: form.sharedContact,
    setSharedContact: form.setSharedContact,
    setReservations: form.setReservations,
    setActiveTabIndex: form.setActiveTabIndex,
  });

  if (form.isEdit && form.isLoadingReservation) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Načítání rezervace…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReservationFormHeader
        isEdit={form.isEdit}
        reservationId={form.reservationId}
        reservationCount={form.reservations.length}
        grandTotalPrice={form.grandTotalPrice}
        currency={form.sharedContact.currency}
        isSubmitting={form.isSubmitting}
        onNavigateBack={() => form.navigate("/reservations")}
        onSubmitSingle={form.handleSubmitSingle}
        onSubmitAll={form.handleSubmitAll}
      />

      <SubmitProgressCard
        isSubmitting={form.isSubmitting}
        submitProgress={form.submitProgress}
        submitResults={form.submitResults}
        reservationCount={form.reservations.length}
      />

      {/* Main form card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Formulář</CardTitle>
            <CurrencyHeader
              currency={form.sharedContact.currency}
              onCurrencyChange={(v) => form.setSharedContact(prev => ({ ...prev, currency: v }))}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={form.isEdit ? "reservations" : "ai"} className="w-full">
            <TabsList>
              <TabsTrigger value="ai">
                <Bot className="w-4 h-4 mr-2" /> AI asistent
              </TabsTrigger>
              <TabsTrigger value="contact">Kontakt</TabsTrigger>
              <TabsTrigger value="invoice">Fakturace</TabsTrigger>
              <TabsTrigger value="reservations">
                Rezervace ({form.reservations.length})
              </TabsTrigger>
              {form.isEdit && (
                <TabsTrigger value="payments">
                  <Receipt className="w-4 h-4 mr-2" /> Platby a faktury
                </TabsTrigger>
              )}
            </TabsList>

            {/* AI Tab */}
            <TabsContent value="ai">
              <AIAssistantTab
                aiInput={ai.aiInput}
                setAiInput={ai.setAiInput}
                aiJson={ai.aiJson}
                aiError={ai.aiError}
                aiLoading={ai.aiLoading}
                fileProcessing={ai.fileProcessing}
                fileInputRef={ai.fileInputRef}
                handleFileUpload={ai.handleFileUpload}
                handleAiAnalyze={ai.handleAiAnalyze}
                handleAiApply={ai.handleAiApply}
                currency={form.sharedContact.currency}
              />
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              {form.detectedPartner && (
                <PartnerDetectionCard
                  detectedPartner={form.detectedPartner}
                  onApplyPricing={form.applyPartnerPricing}
                />
              )}
              <ContactSection
                sharedContact={form.sharedContact}
                setSharedContact={form.setSharedContact}
                contactQuery={form.contactQuery}
                setContactQuery={form.setContactQuery}
                isContactDropdownOpen={form.isContactDropdownOpen}
                setIsContactDropdownOpen={form.setIsContactDropdownOpen}
                contactBoxRef={form.contactBoxRef}
                isSearchingContacts={form.isSearchingContacts}
                contactSearchItems={form.contactSearchItems}
                applyContactToForm={form.applyContactToForm}
              />
            </TabsContent>

            {/* Invoice Tab */}
            <TabsContent value="invoice" className="space-y-4">
              <BillingSection
                sharedContact={form.sharedContact}
                setSharedContact={form.setSharedContact}
                companyQuery={form.companyQuery}
                setCompanyQuery={form.setCompanyQuery}
                companyResults={form.companyResults}
                isCompanyDropdownOpen={form.isCompanyDropdownOpen}
                setIsCompanyDropdownOpen={form.setIsCompanyDropdownOpen}
                isCompanySearching={form.isCompanySearching}
                companyBoxRef={form.companyBoxRef}
                applyCompanyToForm={form.applyCompanyToForm}
                isEdit={form.isEdit}
                autoCreateInvoice={form.autoCreateInvoice}
                setAutoCreateInvoice={form.setAutoCreateInvoice}
                autoInvoiceType={form.autoInvoiceType}
                setAutoInvoiceType={form.setAutoInvoiceType}
                autoInvoicePercent={form.autoInvoicePercent}
                setAutoInvoicePercent={form.setAutoInvoicePercent}
              />
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="space-y-4">
              {/* Reservation tabs */}
              <div className="flex flex-wrap items-center gap-1 border-b pb-2">
                {form.reservations.map((r, i) => {
                  const isActive = form.activeTabIndex === i;
                  const hasDate = Boolean(r.date);
                  const hasPersons = r.persons.length > 0;
                  return (
                    <button
                      key={i}
                      className={`relative px-3 py-1.5 text-sm font-medium rounded-t-md border transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                      } ${!hasDate || !hasPersons ? "border-orange-400 border-dashed" : ""}`}
                      onClick={() => form.setActiveTabIndex(i)}
                    >
                      {r.date ? dayjs(r.date).format("D.M.YYYY") : `#${i + 1}`}
                      {hasPersons && (
                        <span className="ml-1 text-xs opacity-75">({r.persons.length})</span>
                      )}
                      {form.reservations.length > 1 && (
                        <span
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[10px] flex items-center justify-center cursor-pointer hover:bg-destructive/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            form.removeReservation(i);
                          }}
                        >
                          ×
                        </span>
                      )}
                    </button>
                  );
                })}
                <Button variant="ghost" size="sm" onClick={form.addReservation}>
                  <Plus className="w-4 h-4 mr-1" /> Přidat
                </Button>
              </div>

              {/* Current reservation form */}
              {form.currentReservation && (
                <div className="space-y-4">
                  {/* Date, status, type, note row */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Datum *</Label>
                      <Input
                        type="date"
                        value={form.currentReservation.date}
                        onChange={(e) =>
                          form.updateReservation(form.activeTabIndex, {
                            date: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={form.currentReservation.status}
                        onValueChange={(v) =>
                          form.updateReservation(form.activeTabIndex, {
                            status: v as ReservationEntry["status"],
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="RECEIVED">
                            <StatusBadge status="RECEIVED" type="reservation" />
                          </SelectItem>
                          <SelectItem value="WAITING_PAYMENT">
                            <StatusBadge status="WAITING_PAYMENT" type="reservation" />
                          </SelectItem>
                          <SelectItem value="PAID">
                            <StatusBadge status="PAID" type="reservation" />
                          </SelectItem>
                          <SelectItem value="AUTHORIZED">
                            <StatusBadge status="AUTHORIZED" type="reservation" />
                          </SelectItem>
                          <SelectItem value="CONFIRMED">
                            <StatusBadge status="CONFIRMED" type="reservation" />
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <StatusBadge status="CANCELLED" type="reservation" />
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Druh rezervace</Label>
                      <Select
                        value={form.currentReservation.reservationTypeId?.toString() || ""}
                        onValueChange={(v) =>
                          form.updateReservation(form.activeTabIndex, {
                            reservationTypeId: v ? Number(v) : undefined,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Vyberte druh" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.reservationTypes?.map((rt) => (
                            <SelectItem key={rt.id} value={rt.id.toString()}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: rt.color }}
                                />
                                {rt.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Poznámka</Label>
                      <Input
                        value={form.currentReservation.contactNote}
                        onChange={(e) =>
                          form.updateReservation(form.activeTabIndex, {
                            contactNote: e.target.value,
                          })
                        }
                        className="mt-1"
                        placeholder="Poznámka k rezervaci"
                      />
                    </div>
                  </div>

                  {/* Transfers */}
                  <div className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Transfer</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.addTransfer(form.activeTabIndex)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Přidat destinaci
                      </Button>
                    </div>

                    {form.currentReservation.transfers.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Žádné transfery. Klikněte na "Přidat destinaci" pro přidání transferu.
                      </p>
                    )}

                    {form.currentReservation.transfers.map((transfer, transferIndex) => (
                      <div key={transferIndex} className="space-y-2 p-3 bg-muted/50 rounded-md">
                        <div className="flex items-start gap-3">
                        <div className="w-24">
                          <Label className="text-xs text-muted-foreground">Počet osob</Label>
                          <Input
                            type="number"
                            min={1}
                            value={transfer.personCount}
                            onChange={(e) =>
                              form.updateTransfer(form.activeTabIndex, transferIndex, {
                                personCount: Number(e.target.value) || 1,
                              })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div className="flex-1 relative" ref={form.activeTransferIndex === transferIndex ? form.addressBoxRef : undefined}>
                          <Label className="text-xs text-muted-foreground">Adresa destinace</Label>
                          <Input
                            value={transfer.address}
                            onChange={(e) => {
                              form.updateTransfer(form.activeTabIndex, transferIndex, {
                                address: e.target.value,
                              });
                              form.setActiveTransferIndex(transferIndex);
                              form.setIsAddressDropdownOpen(true);
                            }}
                            onFocus={() => {
                              form.setActiveTransferIndex(transferIndex);
                              form.setIsAddressDropdownOpen(true);
                            }}
                            className="mt-1"
                            placeholder="Začněte psát adresu..."
                          />
                          {form.isAddressDropdownOpen && form.activeTransferIndex === transferIndex && transfer.address.length >= 3 && (
                            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                              <div className="max-h-64 overflow-auto p-1 text-sm">
                                {form.isAddressSearching && (
                                  <div className="px-3 py-2 text-muted-foreground">
                                    Hledám adresy...
                                  </div>
                                )}
                                {!form.isAddressSearching && form.addressResults.length === 0 && (
                                  <div className="px-3 py-2 text-muted-foreground">
                                    Žádné výsledky
                                  </div>
                                )}
                                {form.addressResults.map((result) => (
                                  <button
                                    type="button"
                                    key={result.place_id}
                                    className="flex w-full items-start gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left rounded-sm"
                                    onClick={() => {
                                      form.updateTransfer(form.activeTabIndex, transferIndex, {
                                        address: getShortAddress(result),
                                      });
                                      form.setIsAddressDropdownOpen(false);
                                    }}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">
                                        {getShortAddress(result)}
                                      </div>
                                      <div className="text-xs text-muted-foreground truncate">
                                        {result.display_name}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="mt-6 text-destructive hover:text-destructive"
                          onClick={() => form.removeTransfer(form.activeTabIndex, transferIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        </div>

                        {/* Transport company/vehicle/driver assignment */}
                        {form.transportCompanies && form.transportCompanies.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Dopravce</Label>
                              <Select
                                value={transfer.transportCompanyId?.toString() ?? "none"}
                                onValueChange={(v) => {
                                  const companyId = v === "none" ? null : parseInt(v);
                                  form.updateTransfer(form.activeTabIndex, transferIndex, {
                                    transportCompanyId: companyId,
                                    transportVehicleId: null,
                                    transportDriverId: null,
                                  });
                                }}
                              >
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                  <SelectValue placeholder="Vybrat dopravce" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">-- Bez dopravce --</SelectItem>
                                  {form.transportCompanies.filter(tc => tc.isActive).map((tc) => (
                                    <SelectItem key={tc.id} value={tc.id.toString()}>
                                      {tc.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            {transfer.transportCompanyId && (
                              <>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Vozidlo</Label>
                                  <Select
                                    value={transfer.transportVehicleId?.toString() ?? "none"}
                                    onValueChange={(v) =>
                                      form.updateTransfer(form.activeTabIndex, transferIndex, {
                                        transportVehicleId: v === "none" ? null : parseInt(v),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs">
                                      <SelectValue placeholder="Vozidlo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-- Libovolné --</SelectItem>
                                      {(form.transportCompanies.find(tc => tc.id === transfer.transportCompanyId)?.vehicles ?? [])
                                        .filter(v => v.isActive)
                                        .map((v) => (
                                          <SelectItem key={v.id} value={v.id.toString()}>
                                            {v.licensePlate} ({v.brand ?? v.vehicleType})
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs text-muted-foreground">Řidič</Label>
                                  <Select
                                    value={transfer.transportDriverId?.toString() ?? "none"}
                                    onValueChange={(v) =>
                                      form.updateTransfer(form.activeTabIndex, transferIndex, {
                                        transportDriverId: v === "none" ? null : parseInt(v),
                                      })
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8 text-xs">
                                      <SelectValue placeholder="Řidič" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-- Libovolný --</SelectItem>
                                      {(form.transportCompanies.find(tc => tc.id === transfer.transportCompanyId)?.drivers ?? [])
                                        .filter(d => d.isActive)
                                        .map((d) => (
                                          <SelectItem key={d.id} value={d.id.toString()}>
                                            {d.firstName} {d.lastName}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {form.currentReservation.transfers.length > 0 && (
                      <div className="text-sm text-muted-foreground pt-2 border-t">
                        Celkem osob k transferu: {form.currentReservation.transfers.reduce((sum, t) => sum + t.personCount, 0)}
                      </div>
                    )}
                  </div>

                  <ReservationPersonsSection
                    currentReservation={form.currentReservation}
                    activeTabIndex={form.activeTabIndex}
                    foods={form.foods}
                    drinks={form.drinks}
                    currency={form.sharedContact.currency}
                    currentTotalPrice={form.currentTotalPrice}
                    bulkCount={form.bulkCount}
                    setBulkCount={form.setBulkCount}
                    bulkType={form.bulkType}
                    setBulkType={form.setBulkType}
                    bulkMenu={form.bulkMenu}
                    setBulkMenu={form.setBulkMenu}
                    bulkPrice={form.bulkPrice}
                    setBulkPrice={form.setBulkPrice}
                    bulkNationality={form.bulkNationality}
                    setBulkNationality={form.setBulkNationality}
                    bulkPriceChange={form.bulkPriceChange}
                    setBulkPriceChange={form.setBulkPriceChange}
                    bulkMenuChange={form.bulkMenuChange}
                    setBulkMenuChange={form.setBulkMenuChange}
                    bulkDrinkChange={form.bulkDrinkChange}
                    setBulkDrinkChange={form.setBulkDrinkChange}
                    addPerson={form.addPerson}
                    addBulkPersons={form.addBulkPersons}
                    applyBulkPriceChange={form.applyBulkPriceChange}
                    applyBulkMenuChange={form.applyBulkMenuChange}
                    applyBulkDrinkChange={form.applyBulkDrinkChange}
                    handleTypeChange={form.handleTypeChange}
                    handleMenuChange={form.handleMenuChange}
                    updatePerson={form.updatePerson}
                    removePerson={form.removePerson}
                  />
                </div>
              )}
            </TabsContent>

            {/* Payments & Invoices Tab (only in edit mode) */}
            {form.isEdit && (
              <TabsContent value="payments" className="space-y-6">
                <PaymentInvoicesSection
                  reservationId={Number(form.reservationId)}
                  paymentSummary={form.paymentSummary}
                  summaryLoading={form.summaryLoading}
                  invoices={form.invoices}
                  invoicesLoading={form.invoicesLoading}
                  markPaidMutation={form.markPaidMutation}
                  markInvoicePaidMutation={form.markInvoicePaidMutation}
                  isAnyInvoiceMutationPending={form.isAnyInvoiceMutationPending}
                  setInvoiceDialogType={form.setInvoiceDialogType}
                  setInvoiceDialogPercent={form.setInvoiceDialogPercent}
                  setInvoiceDialogOpen={form.setInvoiceDialogOpen}
                />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Invoice Create Dialog */}
      {form.isEdit && form.reservationId && (
        <InvoiceCreateDialog
          open={form.invoiceDialogOpen}
          onOpenChange={form.setInvoiceDialogOpen}
          reservationId={Number(form.reservationId)}
          invoiceType={form.invoiceDialogType}
          depositPercent={form.invoiceDialogPercent}
          onSuccess={form.invalidateInvoices}
        />
      )}
    </div>
  );
}
