import type { Ref } from "react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import type { SharedContact } from "@modules/reservations/types";

export interface ContactSectionProps {
  sharedContact: SharedContact;
  setSharedContact: React.Dispatch<React.SetStateAction<SharedContact>>;
  contactQuery: string;
  setContactQuery: (value: string) => void;
  isContactDropdownOpen: boolean;
  setIsContactDropdownOpen: (value: boolean) => void;
  contactBoxRef: Ref<HTMLDivElement>;
  isSearchingContacts: boolean;
  contactSearchItems: any[] | undefined;
  applyContactToForm: (contact: any) => void;
}

export function ContactSection({
  sharedContact,
  setSharedContact,
  contactQuery,
  setContactQuery,
  isContactDropdownOpen,
  setIsContactDropdownOpen,
  contactBoxRef,
  isSearchingContacts,
  contactSearchItems,
  applyContactToForm,
}: ContactSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Contact autocomplete */}
      <div className="md:col-span-2" ref={contactBoxRef}>
        <Label>Kontakt (vyhledat)</Label>
        <div className="relative mt-1">
          <Input
            value={contactQuery}
            onChange={(e) => {
              setContactQuery(e.target.value);
              setIsContactDropdownOpen(true);
            }}
            placeholder="Začněte psát jméno, e-mail nebo telefon\u2026"
          />
          {isContactDropdownOpen &&
            contactQuery.trim().length >= 2 && (
              <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                <div className="max-h-64 overflow-auto p-1 text-sm">
                  {isSearchingContacts && (
                    <div className="px-3 py-2 text-muted-foreground">
                      Hledám\u2026
                    </div>
                  )}
                  {!isSearchingContacts &&
                    (contactSearchItems?.length ?? 0) === 0 && (
                      <div className="px-3 py-2 text-muted-foreground">
                        Nenalezen žádný kontakt
                      </div>
                    )}
                  {contactSearchItems?.map((c: any) => (
                    <button
                      type="button"
                      key={c.id}
                      className="flex w-full items-start gap-2 px-3 py-2 hover:bg-accent hover:text-accent-foreground text-left"
                      onClick={() => {
                        applyContactToForm(c);
                        setContactQuery("");
                        setIsContactDropdownOpen(false);
                      }}
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          {c.name || "Bez jména"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {[c.email, c.phone]
                            .filter(Boolean)
                            .join(" \u2022 ")}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>

      <div>
        <Label>Jméno *</Label>
        <Input
          value={sharedContact.contactName}
          onChange={(e) =>
            setSharedContact((prev) => ({
              ...prev,
              contactName: e.target.value,
            }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Email *</Label>
        <Input
          type="email"
          value={sharedContact.contactEmail}
          onChange={(e) =>
            setSharedContact((prev) => ({
              ...prev,
              contactEmail: e.target.value,
            }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Telefon *</Label>
        <Input
          value={sharedContact.contactPhone}
          onChange={(e) =>
            setSharedContact((prev) => ({
              ...prev,
              contactPhone: e.target.value,
            }))
          }
          className="mt-1"
        />
      </div>
      <div>
        <Label>Národnost *</Label>
        <Input
          value={sharedContact.contactNationality}
          onChange={(e) =>
            setSharedContact((prev) => ({
              ...prev,
              contactNationality: e.target.value,
            }))
          }
          className="mt-1"
        />
      </div>
      <div className="md:col-span-2">
        <Label>Odkud klient přišel</Label>
        <Input
          value={sharedContact.clientComeFrom}
          onChange={(e) =>
            setSharedContact((prev) => ({
              ...prev,
              clientComeFrom: e.target.value,
            }))
          }
          className="mt-1"
        />
      </div>
    </div>
  );
}
