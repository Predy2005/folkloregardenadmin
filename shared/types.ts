// TypeScript interfaces pro všechny entity z Folklore Garden API

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserLoginLog {
  id: number;
  userId: number;
  loginAt: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ReservationPerson {
  id: number;
  type: "adult" | "child" | "infant" | "driver" | "guide";
  menu: string;
  price: number;
}

export interface Payment {
  id: number;
  transactionId: string;
  status: "PAID" | "CANCELLED" | "AUTHORIZED" | "PENDING" | "CREATED";
  reservationReference: string;
  amount: number;
  createdAt: string;
  updatedAt?: string;
}

// Payment-related types
export type ReservationSource = "WEB" | "ADMIN";
export type ReservationPaymentMethod =
  | "ONLINE"
  | "DEPOSIT"
  | "INVOICE"
  | "CASH"
  | "BANK_TRANSFER"
  | "MIXED";
export type ReservationPaymentStatus = "UNPAID" | "PARTIAL" | "PAID";

export interface Reservation {
  id: number;
  date: string;
  status:
    | "RECEIVED"
    | "WAITING_PAYMENT"
    | "PAID"
    | "CANCELLED"
    | "AUTHORIZED"
    | "CONFIRMED";
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactNationality: string;
  clientComeFrom?: string;
  contactNote?: string;
  invoiceSameAsContact: boolean;
  invoiceName?: string;
  invoiceCompany?: string;
  invoiceIc?: string;
  invoiceDic?: string;
  invoiceEmail?: string;
  invoicePhone?: string;
  invoiceStreet?: string;
  invoiceCity?: string;
  invoiceZipcode?: string;
  invoiceCountry?: string;
  transferSelected: boolean;
  transferCount?: number;
  transferAddress?: string;
  agreement: boolean;
  createdAt: string;
  updatedAt: string;
  persons?: ReservationPerson[];
  payments?: Payment[];
  invoices?: Invoice[];

  // Payment fields
  source?: ReservationSource;
  paymentMethod?: ReservationPaymentMethod;
  paymentStatus?: ReservationPaymentStatus;
  depositPercent?: string;
  depositAmount?: string;
  totalPrice?: string;
  paidAmount?: string;
  paymentNote?: string;
}

export interface ReservationFood {
  id: number;
  name: string;
  description?: string;
  price: number;
  isChildrenMenu: boolean;
  externalId?: string;
  surcharge: number;  // příplatek k základní ceně (0 = v ceně, 75 = +75 Kč)
}

export interface DisabledDate {
  id: number;
  dateFrom: string;
  dateTo?: string;
  reason?: string;
  project?: string;
}

// Auth types
export interface AuthResponse {
  status: string;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  resetToken: string;
  newPassword: string;
}

// Contacts (Adresář)
export interface Contact {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  note?: string;
  // Enriched billing/invoice fields
  invoiceName?: string;
  invoiceEmail?: string;
  invoicePhone?: string;
  invoiceIc?: string;
  invoiceDic?: string;
  clientComeFrom?: string;
  // Optional billing address fields (editable in UI)
  billingStreet?: string;
  billingCity?: string;
  billingZip?: string;
  billingCountry?: string;
  sourceReservationId?: number;
  createdAt: string;
  updatedAt: string;
}

// Status badge mappings
export const RESERVATION_STATUS_LABELS: Record<Reservation["status"], string> =
  {
    RECEIVED: "Přijato",
    WAITING_PAYMENT: "Čeká na platbu",
    PAID: "Zaplaceno",
    CANCELLED: "Zrušeno",
    AUTHORIZED: "Autorizováno",
    CONFIRMED: "Potvrzeno",
  };

export const PAYMENT_STATUS_LABELS: Record<Payment["status"], string> = {
  PAID: "Zaplaceno",
  PENDING: "Čeká",
  CANCELLED: "Zrušeno",
  AUTHORIZED: "Autorizováno",
  CREATED: "Vytvořeno",
};

export const PERSON_TYPE_LABELS: Record<ReservationPerson["type"], string> = {
  adult: "Dospělý",
  child: "Dítě",
  infant: "Miminko",
  driver: "Řidič",
  guide: "Průvodce",
};

export const RESERVATION_SOURCE_LABELS: Record<ReservationSource, string> = {
  WEB: "Web",
  ADMIN: "Admin",
};

export const RESERVATION_PAYMENT_METHOD_LABELS: Record<
  ReservationPaymentMethod,
  string
> = {
  ONLINE: "Online platba",
  DEPOSIT: "Záloha",
  INVOICE: "Faktura",
  CASH: "Hotově",
  BANK_TRANSFER: "Bankovní převod",
  MIXED: "Kombinace",
};

export const RESERVATION_PAYMENT_STATUS_LABELS: Record<
  ReservationPaymentStatus,
  string
> = {
  UNPAID: "Nezaplaceno",
  PARTIAL: "Částečně zaplaceno",
  PAID: "Zaplaceno",
};

// Stock Management types
export interface StockItem {
  id: number;
  name: string;
  description?: string;
  unit: string;
  quantityAvailable: number;
  minQuantity?: number;
  pricePerUnit?: number;
  supplier?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Recipe {
  id: number;
  reservationFoodId?: number;
  name: string;
  description?: string;
  portions: number;
  createdAt: string;
  updatedAt: string;
  ingredients?: RecipeIngredient[];
}

export interface RecipeIngredient {
  id: number;
  recipeId: number;
  stockItemId: number;
  quantityRequired: number;
  stockItem?: StockItem;
}

export interface StockMovement {
  id: number;
  stockItemId: number;
  movementType: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  reason?: string;
  reservationId?: number;
  userId?: number;
  createdAt: string;
  stockItem?: StockItem;
}

export const STOCK_MOVEMENT_TYPE_LABELS: Record<
  StockMovement["movementType"],
  string
> = {
  IN: "Příjem",
  OUT: "Výdej",
  ADJUSTMENT: "Oprava",
};

export const STOCK_UNIT_LABELS: Record<string, string> = {
  kg: "kg",
  g: "g",
  l: "l",
  ml: "ml",
  ks: "ks",
};

// Commission System types
export interface Voucher {
  id: number;
  code: string;
  discountPercent: number;
  validFrom: string;
  validTo: string;
  usageLimit?: number;
  usedCount: number;
  active: boolean;
  partnerId?: number;
  qrCodeUrl?: string;
  createdAt: string;
  updatedAt: string;
  partner?: Partner;
}

export interface Partner {
  id: number;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  commissionPercent: number;
  active: boolean;
  totalRevenue: number;
  totalCommission: number;
  createdAt: string;
  updatedAt: string;
  vouchers?: Voucher[];
  commissionLogs?: CommissionLog[];
}

export interface CommissionLog {
  id: number;
  partnerId: number;
  reservationId?: number;
  voucherId?: number;
  amount: number;
  commissionAmount: number;
  isPaid: boolean;
  paidAt?: string;
  note?: string;
  createdAt: string;
  partner?: Partner;
  voucher?: Voucher;
}

export const VOUCHER_STATUS_LABELS = {
  active: "Aktivní",
  inactive: "Neaktivní",
  expired: "Vypršel",
};

// Staff Management types
export interface StaffMember {
  id: number;
  firstName: string;
  dateOfBirth: string;
  lastName: string;
  email: string;
  phone?: string;
  emergencyPhone?: string;
  emergencyContact?: string;
  address?: string;
  position?: string | null;
  hourlyRate?: number | string;
  fixedRate?: number | string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
  attendances?: StaffAttendance[];
}

export interface StaffAttendance {
  id: number;
  staffMemberId: number;
  eventId?: number;
  reservationId?: number;
  date: string;
  hoursWorked: number;
  note?: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
  staffMember?: StaffMember;
}

export const STAFF_ROLE_LABELS: Record<string, string> = {
  chef: "Kuchař",
  waiter: "Číšník",
  bartender: "Barman",
  cleaner: "Uklízeč",
  manager: "Manažer",
  other: "Jiné",
};

// Cashbox types
export interface CashboxEntry {
  id: number;
  type: "INCOME" | "EXPENSE";
  category: string;
  amount: number;
  currency: "CZK" | "EUR";
  description?: string;
  eventId?: number;
  reservationId?: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const CASHBOX_TYPE_LABELS: Record<CashboxEntry["type"], string> = {
  INCOME: "Příjem",
  EXPENSE: "Výdaj",
};

export const CASHBOX_CATEGORY_LABELS: Record<string, string> = {
  reservation_payment: "Platba za rezervaci",
  food_purchase: "Nákup potravin",
  staff_payment: "Výplata personálu",
  rent: "Nájem",
  utilities: "Energie",
  equipment: "Vybavení",
  other: "Ostatní",
};

// Events types
export type EventSpace = "roubenka" | "terasa" | "stodolka" | "cely_areal";
export type EventType = "folklorni_show" | "svatba" | "event" | "privat";
export type EventSubcategory = "obedy" | "vecere" | "privat" | "show" | "firemni" | "other";
export type CateringType = "vlastni" | "ventura" | "folkloregarden";
export type EventStatus =
  | "DRAFT"
  | "PLANNED"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

// Core Event interface (matches event table + nested entities)
export interface Event {
  id: number;
  name: string;
  eventType: EventType;
  reservationId?: number;

  // Základní údaje
  eventDate: string;
  eventTime: string;
  durationMinutes: number;

  // Počet osob (guestsTotal je readonly - vypočítává DB)
  guestsPaid: number;
  guestsFree: number;
  guestsTotal: number; // COMPUTED: guests_paid + guests_free

  // Prostory (many-to-many přes event_space)
  spaces: EventSpace[];

  // Kontaktní údaje organizátora
  organizerCompany?: string;
  organizerPerson?: string;
  organizerEmail?: string;
  organizerPhone?: string;

  // Jazyk
  language: string;

  // Fakturační údaje
  invoiceCompany?: string;
  invoiceIc?: string;
  invoiceDic?: string;
  invoiceAddress?: string;

  // Platba
  totalPrice?: number;
  depositAmount?: number;
  depositPaid: boolean;
  paymentMethod?: string;

  // Status
  status: EventStatus;

  // Subkategorie a tagy
  eventSubcategory?: EventSubcategory;
  eventTags?: string[];

  // Catering
  cateringType?: CateringType;
  cateringCommissionPercent?: number;
  cateringCommissionAmount?: number;

  // Auto-generated flag
  isAutoGenerated?: boolean;

  // Poznámky
  notesStaff?: string;
  notesInternal?: string;
  specialRequirements?: string;

  // Koordinátor
  coordinatorId?: number; // interní koordinátor z personálu
  isExternalCoordinator?: boolean;
  externalCoordinatorName?: string;
  externalCoordinatorEmail?: string;
  externalCoordinatorPhone?: string;
  externalCoordinatorNote?: string;

  // Metadata
  createdBy?: number;
  createdAt: string;
  updatedAt: string;

  // Nested entities (načtou se v aggregate)
  guests?: EventGuest[];
  menu?: EventMenu[];
  beverages?: EventBeverage[];
  staffAssignments?: EventStaffAssignment[];
  schedule?: EventScheduleItem[];
  tables?: EventTable[];
  vouchers?: EventVoucher[];
  reservation?: Reservation;
  eventInvoices?: EventInvoiceLink[];
}

// Event Guest (může být z rezervace nebo manuální)
export interface EventGuest {
  id: number;
  eventId: number;
  eventTableId?: number;
  reservationId?: number; // pokud je z rezervace
  personIndex?: number; // index osoby v rezervaci
  firstName?: string;
  lastName?: string;
  nationality?: string;
  type: "adult" | "child";
  isPaid: boolean;
  isPresent: boolean;
  menuItemId?: number;
  notes?: string;
  createdAt?: string;
}

// Event Menu
export interface EventMenu {
  id: number;
  eventId: number;
  reservationFoodId?: number;
  menuName: string;
  quantity: number;
  pricePerUnit?: number;
  totalPrice?: number;
  servingTime?: string;
  notes?: string;
  createdAt?: string;
}

// Event Beverage
export interface EventBeverage {
  id: number;
  eventId: number;
  beverageName: string;
  quantity: number;
  unit: string; // 'bottle', 'glass', 'liter'
  pricePerUnit?: number;
  totalPrice?: number;
  notes?: string;
  createdAt?: string;
}

// Event Staff Assignment
export interface EventStaffAssignment {
  id: number;
  eventId: number;
  staffMemberId: number;
  staffRoleId?: number;
  assignmentStatus: string; // 'ASSIGNED', 'CONFIRMED', 'DECLINED', 'COMPLETED'
  attendanceStatus: string; // 'PENDING', 'PRESENT', 'ABSENT', 'LATE'
  hoursWorked: number;
  paymentAmount?: number;
  paymentStatus: string; // 'PENDING', 'PAID'
  notes?: string;
  assignedAt?: string;
  confirmedAt?: string;
  attendedAt?: string;
  staffMember?: StaffMember;
}

// Event Schedule Item
export interface EventScheduleItem {
  id: number;
  eventId: number;
  timeSlot: string; // TIME format
  durationMinutes: number;
  activity: string; // 'ARRIVAL', 'WELCOME_DRINK', 'DINNER', 'SHOW', 'DANCE', 'CLOSING'
  description?: string;
  responsibleStaffId?: number;
  notes?: string;
  createdAt?: string;
}

// Event Table (pro floor plan)
export interface EventTable {
  id: number;
  eventId: number;
  tableName: string;
  room: EventSpace;
  capacity: number;
  positionX?: number;
  positionY?: number;
  createdAt?: string;
  updatedAt?: string;
  guests?: EventGuest[];
}

// Event Voucher
export interface EventVoucher {
  id: number;
  eventId: number;
  voucherId: number;
  quantity: number;
  validated: boolean;
  validatedAt?: string;
  validatedBy?: number;
  notes?: string;
  createdAt?: string;
  voucher?: Voucher;
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  folklorni_show: "Folklorní show",
  svatba: "Svatba",
  event: "Event",
  privat: "Soukromá akce",
};

export const EVENT_SPACE_LABELS: Record<EventSpace, string> = {
  roubenka: "Roubenka",
  terasa: "Terasa",
  stodolka: "Stodolka",
  cely_areal: "Celý areál",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  DRAFT: "Koncept",
  PLANNED: "Plánováno",
  CONFIRMED: "Potvrzeno",
  IN_PROGRESS: "Probíhá",
  COMPLETED: "Dokončeno",
  CANCELLED: "Zrušeno",
};

export const EVENT_SUBCATEGORY_LABELS: Record<EventSubcategory, string> = {
  obedy: "Obědy",
  vecere: "Večeře",
  privat: "Soukromá akce",
  show: "Show",
  firemni: "Firemní akce",
  other: "Jiné",
};

export const CATERING_TYPE_LABELS: Record<CateringType, string> = {
  vlastni: "Vlastní catering",
  ventura: "Ventura",
  folkloregarden: "Folklore Garden",
};

// Event Invoice Link (propojení události s fakturou)
export interface EventInvoiceLink {
  id: number;
  eventId: number;
  invoiceId: number;
  invoiceType: "deposit" | "final" | "other";
  orderNumber: number;
  notes?: string;
  createdAt: string;
  invoice?: Invoice;
}

// Event Tag (pro našeptávání)
export interface EventTag {
  id: number;
  name: string;
  usageCount: number;
  createdAt: string;
  lastUsedAt: string;
}

// Pricing Configuration types
export interface PricingDefault {
  id: number;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  includeMeal: boolean;
  updatedAt: string;
}

export interface PricingDateOverride {
  id: number;
  date: string;
  adultPrice: number;
  childPrice: number;
  infantPrice: number;
  includeMeal: boolean;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

// Per-Item Food Pricing and Availability types
export interface FoodItemPriceOverride {
  id: number;
  reservationFoodId: number;
  dateFrom: string;
  dateTo?: string;
  price: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FoodItemAvailability {
  id: number;
  reservationFoodId: number;
  dateFrom: string;
  dateTo?: string;
  available: boolean;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

// Staffing Formula types
export type StaffingCategory =
  | "cisniciWaiters"
  | "kuchariChefs"
  | "pomocneSilyHelpers"
  | "moderatoriHosts"
  | "muzikantiMusicians"
  | "tanecniciDancers"
  | "fotografkyPhotographers"
  | "sperkyJewelry";

export interface StaffingFormula {
  id: number;
  category: StaffingCategory;
  ratio: number;
  enabled: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export const STAFFING_CATEGORY_LABELS: Record<StaffingCategory, string> = {
  cisniciWaiters: "Číšníci",
  kuchariChefs: "Kuchaři",
  pomocneSilyHelpers: "Pomocné síly",
  moderatoriHosts: "Moderátoři",
  muzikantiMusicians: "Muzikanti + Kapela",
  tanecniciDancers: "Tanečníci",
  fotografkyPhotographers: "Fotografky",
  sperkyJewelry: "Šperky",
};

// Permissions & Roles types
export interface Permission {
  id: number;
  module: string;
  action: string;
  key: string; // "module.action"
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  isSystem: boolean;
  priority: number;
  userCount: number;
  permissions?: string[]; // permission keys
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: number;
  userId: number;
  roleId: number;
  assignedById?: number;
  assignedAt: string;
  role?: Role;
}

export interface UserPermission {
  id: number;
  userId: number;
  permissionId: number;
  granted: boolean;
  assignedById?: number;
  assignedAt: string;
  permission?: Permission;
}

// Permission matrix shows each permission with its source
export interface PermissionMatrixEntry {
  permission: string; // permission key
  granted: boolean;
  source: "role" | "direct";
  sourceRoles?: string[]; // role names that grant this
}

// Grouped permissions by module for UI display
export interface PermissionGroup {
  module: string;
  permissions: Permission[];
}

export const PERMISSION_MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  reservations: "Rezervace",
  payments: "Platby",
  contacts: "Kontakty",
  foods: "Jídla",
  food_pricing: "Ceny jídel",
  food_availability: "Dostupnost jídel",
  pricing: "Ceník",
  events: "Události",
  users: "Uživatelé",
  permissions: "Práva",
  staff: "Personál",
  staff_attendance: "Docházka",
  staffing_formulas: "Vzorce obsazení",
  stock_items: "Skladové položky",
  recipes: "Recepty",
  stock_movements: "Skladové pohyby",
  partners: "Partneři",
  vouchers: "Vouchery",
  commissions: "Provize",
  cashbox: "Pokladna",
  disabled_dates: "Zakázané termíny",
};

export const PERMISSION_ACTION_LABELS: Record<string, string> = {
  read: "Zobrazit",
  create: "Vytvořit",
  update: "Upravit",
  delete: "Smazat",
  export: "Export",
  send_email: "Odeslat e-mail",
  redeem: "Uplatnit",
  close: "Uzavřít",
};

// Invoice types
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "CANCELLED";
export type InvoiceType = "DEPOSIT" | "FINAL" | "PARTIAL";

export interface InvoiceSupplier {
  name: string;
  street: string;
  city: string;
  zipcode: string;
  ico: string;
  dic?: string;
  email?: string;
  phone?: string;
  bankAccount?: string;
  bankName?: string;
  iban?: string;
  swift?: string;
}

export interface InvoiceCustomer {
  name: string;
  company?: string;
  street?: string;
  city?: string;
  zipcode?: string;
  ico?: string;
  dic?: string;
  email?: string;
  phone?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  invoiceType: InvoiceType;
  issueDate: string;
  dueDate: string;
  taxableDate?: string;
  paidAt?: string;
  status: InvoiceStatus;
  depositPercent?: string;
  supplier: InvoiceSupplier;
  customer: InvoiceCustomer;
  items: InvoiceItem[];
  subtotal: string;
  vatRate: number;
  vatAmount: string;
  total: string;
  currency: string;
  variableSymbol: string;
  qrPaymentData?: string;
  note?: string;
  reservationId?: number;
  createdById?: number;
  createdAt: string;
  updatedAt: string;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Koncept",
  SENT: "Odesláno",
  PAID: "Zaplaceno",
  CANCELLED: "Stornováno",
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  DEPOSIT: "Zálohová faktura",
  FINAL: "Ostrá faktura",
  PARTIAL: "Částečná faktura",
};

// Payment Summary (from /api/reservations/{id}/payment-summary)
export interface PaymentSummary {
  totalPrice: number;
  paidAmount: number;
  remainingAmount: number;
  depositPercent: number;
  depositAmount: number;
  paymentStatus: ReservationPaymentStatus;
  paymentMethod?: ReservationPaymentMethod;
  isFullyPaid: boolean;
  invoices: {
    total: number;
    paid: number;
    depositsTotal: number;
    depositsPaid: number;
  };
  invoicesList?: Invoice[];
}

// Company Settings types
export interface CompanySettings {
  id: number;
  code: string;
  companyName: string;
  street: string;
  city: string;
  zipcode: string;
  country?: string;
  ico: string;
  dic?: string;
  email?: string;
  phone?: string;
  web?: string;
  bankAccount?: string;
  bankCode?: string;
  bankName?: string;
  fullBankAccount?: string;
  iban?: string;
  swift?: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  depositInvoicePrefix: string;
  depositInvoiceNextNumber: number;
  invoiceDueDays: number;
  defaultVatRate: number;
  logoBase64?: string;
  invoiceFooterText?: string;
  registrationInfo?: string;
  isVatPayer: boolean;
  createdAt: string;
  updatedAt: string;
}

// Waiter View types
export interface WaiterViewGuest {
  id: number;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  type: string;
  isPresent: boolean;
  isPaid: boolean;
  menuName: string | null;
  notes: string | null;
}

export interface WaiterViewTable {
  id: number;
  tableNumber: string;
  spaceName: string;
  capacity: number;
  positionX: number | null;
  positionY: number | null;
  guests: WaiterViewGuest[];
}

export interface WaiterViewScheduleItem {
  id: number;
  startTime: string | null;
  endTime: string | null;
  activity: string;
  description: string | null;
  isCompleted: boolean;
}

export interface WaiterViewMenuSummary {
  menuName: string;
  quantity: number;
  pricePerUnit: string | null;
  totalPrice: string | null;
}

export interface WaiterViewEvent {
  id: number;
  name: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  durationMinutes: number;
  status: string;
  venue: string | null;
  language: string;
  notesStaff: string | null;
  specialRequirements: string | null;
  guestsTotal: number;
}

export interface WaiterViewData {
  event: WaiterViewEvent;
  tables: WaiterViewTable[];
  unassignedGuests: WaiterViewGuest[];
  schedule: WaiterViewScheduleItem[];
  menuSummary: WaiterViewMenuSummary[];
  nationalityDistribution: Record<string, number>;
}

// Seating types
export interface SeatingProposal {
  tableId: number;
  guestIds: number[];
  nationality: string;
  fillRate: number; // 0-1
}

export interface SeatingResponse {
  proposals: SeatingProposal[];
  unassigned: Array<{
    id: number;
    firstName: string | null;
    lastName: string | null;
    nationality: string | null;
  }>;
}

export interface SeatingStats {
  totalGuests: number;
  assignedGuests: number;
  unassignedGuests: number;
  tableUtilization: number;
  nationalityDistribution: Record<string, number>;
}

// Staff Recommendation types
export interface StaffRecommendation {
  guests: number;
  totalRequired: number;
  byCategory: Array<{
    category: string;
    ratio: number;
    enabled: boolean;
    required: number;
  }>;
}

// ==========================================
// Event Manager Dashboard Types
// ==========================================

export interface ManagerDashboardData {
  event: DashboardEvent;
  guestsBySpace: SpaceGuestStats[];
  staffing: StaffingOverview;
  transport: TransportSummary;
  vouchers: DashboardVoucherSummary;
  financials: EventFinancials;
  stats: QuickStats;
}

export interface DashboardEvent {
  id: number;
  name: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  durationMinutes: number;
  guestsPaid: number;
  guestsFree: number;
  guestsTotal: number;
  venue: string | null;
  status: string;
  language: string;
  organizerCompany: string | null;
  organizerPerson: string | null;
  organizerPhone: string | null;
  organizerEmail: string | null;
}

export interface SpaceGuestStats {
  spaceName: string;
  totalGuests: number;
  paidGuests: number;
  freeGuests: number;
  presentGuests: number;
  nationalityBreakdown: Record<string, number>;
  menuBreakdown: MenuCount[];
}

export interface MenuCount {
  menuName: string;
  count: number;
  surcharge: number;
}

export interface StaffingOverview {
  required: StaffRequirement[];
  assignments: StaffAssignmentWithContact[];
}

export interface StaffRequirement {
  category: string;
  label: string;
  required: number;
  assigned: number;
  confirmed: number;
  shortfall: number;
}

export interface StaffAssignmentWithContact {
  id: number;
  staffMember: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    position: string | null;
    hourlyRate: string | null;
  } | null;
  role: string | null;
  roleId: number | null;
  assignmentStatus: string;
  attendanceStatus: string;
  hoursWorked: number;
  paymentAmount: number | null;
  paymentStatus: string;
  notes: string | null;
}

export interface TransportSummary {
  reservationsWithTaxi: TaxiReservation[];
  totalPassengers: number;
  totalReservations: number;
}

export interface TaxiReservation {
  reservationId: number;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  pickupAddress: string | null;
  passengerCount: number;
  hasTaxi: boolean;
}

export interface DashboardVoucherSummary {
  eventVouchers: DashboardEventVoucher[];
  validatedCount: number;
  pendingCount: number;
  totalVoucherGuests: number;
}

export interface DashboardEventVoucher {
  id: number;
  voucherId: number | null;
  voucherCode: string | null;
  partnerName: string | null;
  quantity: number;
  validated: boolean;
  validatedAt: string | null;
}

export interface EventFinancials {
  cashbox: CashboxSummary | null;
  expensesByCategory: ExpenseCategory[];
  incomeByCategory: IncomeCategory[];
  settlement: SettlementSummary;
}

export interface CashboxSummary {
  id: number;
  name: string;
  initialBalance: number;
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  isActive: boolean;
}

export interface ExpenseCategory {
  category: string;
  label: string;
  items: ExpenseItem[];
  subtotal: number;
}

export interface ExpenseItem {
  description: string | null;
  amount: number;
  paidTo: string | null;
  paymentMethod: string | null;
  createdAt: string;
}

export interface IncomeCategory {
  category: string;
  label: string;
  items: IncomeItem[];
  subtotal: number;
}

export interface IncomeItem {
  description: string | null;
  amount: number;
  source: string | null;
  createdAt: string;
}

export interface SettlementSummary {
  initialCash: number;
  totalIncome: number;
  totalExpenses: number;
  netResult: number;
  cashOnHand: number;
}

export interface QuickStats {
  presentGuests: number;
  totalGuests: number;
  occupancyRate: number;
  scheduleProgress: {
    completed: number;
    total: number;
    currentActivity: string | null;
  };
}

// Expense and Income category constants
export const EXPENSE_CATEGORIES = {
  STAFF_WAITERS: "Číšníci",
  STAFF_COOKS: "Kuchaři",
  STAFF_HELPERS: "Pomocné síly",
  ENTERTAINMENT_DANCERS: "Tanečníci",
  ENTERTAINMENT_MUSICIANS: "Muzikanti",
  ENTERTAINMENT_MODERATOR: "Moderátor",
  PHOTOGRAPHER: "Fotograf",
  CATERING: "Catering",
  TRANSPORT: "Doprava",
  MERCHANDISE_JEWELRY: "Šperky",
  OTHER: "Ostatní",
} as const;

export type ExpenseCategoryType = keyof typeof EXPENSE_CATEGORIES;

export const INCOME_CATEGORIES = {
  ONLINE_PAYMENT: "Online platby",
  CASH_PAYMENT: "Hotovostní platby",
  JEWELRY_SALES: "Prodej šperků",
  MERCHANDISE: "Prodej zboží",
  OTHER: "Ostatní",
} as const;

export type IncomeCategoryType = keyof typeof INCOME_CATEGORIES;

