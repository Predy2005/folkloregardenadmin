import type { Ref, Dispatch, SetStateAction } from "react";
import type { Contact } from "@shared/types";
import type { SharedContact } from "@modules/reservations/types";

export interface ContactSectionProps {
  readonly sharedContact: SharedContact;
  readonly setSharedContact: Dispatch<SetStateAction<SharedContact>>;
  readonly contactQuery: string;
  readonly setContactQuery: (value: string) => void;
  readonly isContactDropdownOpen: boolean;
  readonly setIsContactDropdownOpen: (value: boolean) => void;
  readonly contactBoxRef: Ref<HTMLDivElement>;
  readonly isSearchingContacts: boolean;
  readonly contactSearchItems: Contact[] | undefined;
  readonly applyContactToForm: (contact: Contact) => void;
}
