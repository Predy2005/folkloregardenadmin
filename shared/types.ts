// TypeScript interfaces pro všechny entity z Folklore Garden API

export interface User {
  id: number;
  username: string;
  email: string;
  roles: string[];
  lastLoginAt?: string;
  lastLoginIp?: string;
  createdAt: string;
  updatedAt: string;
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
  type: 'adult' | 'child' | 'infant';
  menu: string;
  price: number;
}

export interface Payment {
  id: number;
  transactionId: string;
  status: 'PAID' | 'CANCELLED' | 'AUTHORIZED' | 'PENDING' | 'CREATED';
  reservationReference: string;
  amount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Reservation {
  id: number;
  date: string;
  status: 'RECEIVED' | 'WAITING_PAYMENT' | 'PAID' | 'CANCELLED' | 'AUTHORIZED' | 'CONFIRMED';
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
  transferSelected: boolean;
  transferCount?: number;
  transferAddress?: string;
  agreement: boolean;
  createdAt: string;
  updatedAt: string;
  persons?: ReservationPerson[];
  payments?: Payment[];
}

export interface ReservationFood {
  id: number;
  name: string;
  description?: string;
  price: number;
  isChildrenMenu: boolean;
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

// Status badge mappings
export const RESERVATION_STATUS_LABELS: Record<Reservation['status'], string> = {
  RECEIVED: 'Přijato',
  WAITING_PAYMENT: 'Čeká na platbu',
  PAID: 'Zaplaceno',
  CANCELLED: 'Zrušeno',
  AUTHORIZED: 'Autorizováno',
  CONFIRMED: 'Potvrzeno',
};

export const PAYMENT_STATUS_LABELS: Record<Payment['status'], string> = {
  PAID: 'Zaplaceno',
  PENDING: 'Čeká',
  CANCELLED: 'Zrušeno',
  AUTHORIZED: 'Autorizováno',
  CREATED: 'Vytvořeno',
};

export const PERSON_TYPE_LABELS: Record<ReservationPerson['type'], string> = {
  adult: 'Dospělý',
  child: 'Dítě',
  infant: 'Miminko',
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
  movementType: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
  reservationId?: number;
  userId?: number;
  createdAt: string;
  stockItem?: StockItem;
}

export const STOCK_MOVEMENT_TYPE_LABELS: Record<StockMovement['movementType'], string> = {
  IN: 'Příjem',
  OUT: 'Výdej',
  ADJUSTMENT: 'Oprava',
};

export const STOCK_UNIT_LABELS: Record<string, string> = {
  kg: 'kg',
  g: 'g',
  l: 'l',
  ml: 'ml',
  ks: 'ks',
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
  active: 'Aktivní',
  inactive: 'Neaktivní',
  expired: 'Vypršel',
};

// Staff Management types
export interface StaffMember {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  hourlyRate?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
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
  chef: 'Kuchař',
  waiter: 'Číšník',
  bartender: 'Barman',
  cleaner: 'Uklízeč',
  manager: 'Manažer',
  other: 'Jiné',
};

// Cashbox types
export interface CashboxEntry {
  id: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  amount: number;
  currency: 'CZK' | 'EUR';
  description?: string;
  eventId?: number;
  reservationId?: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const CASHBOX_TYPE_LABELS: Record<CashboxEntry['type'], string> = {
  INCOME: 'Příjem',
  EXPENSE: 'Výdaj',
};

export const CASHBOX_CATEGORY_LABELS: Record<string, string> = {
  reservation_payment: 'Platba za rezervaci',
  food_purchase: 'Nákup potravin',
  staff_payment: 'Výplata personálu',
  rent: 'Nájem',
  utilities: 'Energie',
  equipment: 'Vybavení',
  other: 'Ostatní',
};

// Events types
export interface Event {
  id: number;
  type: 'folklorni_show' | 'svatba' | 'event' | 'privat';
  name: string;
  date: string;
  space: 'roubenka' | 'terasa' | 'stodolka' | 'cely_areal';
  organizerName: string;
  contactPerson?: string;
  coordinator?: string;
  paidCount: number;
  freeCount: number;
  reservationId?: number;
  status: 'DRAFT' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  organizationPlan?: string;
  schedule?: string;
  cateringNotes?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
  staffAssignments?: EventStaffAssignment[];
  menuItems?: EventMenuItem[];
  tables?: EventTable[];
  reservation?: Reservation;
}

export interface EventStaffAssignment {
  id: number;
  eventId: number;
  staffMemberId: number;
  role: string;
  staffMember?: StaffMember;
}

export interface EventMenuItem {
  id: number;
  eventId: number;
  recipeId?: number;
  name: string;
  quantity: number;
  recipe?: Recipe;
}

export interface EventTable {
  id: number;
  eventId: number;
  tableName: string;
  room: 'roubenka' | 'terasa' | 'stodolka' | 'cely_areal';
  capacity: number;
  positionX?: number;
  positionY?: number;
  guests?: EventGuest[];
}

export interface EventGuest {
  id: number;
  eventTableId?: number;
  reservationId?: number;
  personIndex?: number;
  name: string;
  type: 'adult' | 'child';
  nationality?: string;
  menuItemId?: number;
  isPresent: boolean;
  isPaid: boolean;
  notes?: string;
}

export const EVENT_TYPE_LABELS: Record<Event['type'], string> = {
  folklorni_show: 'Folklorní show',
  svatba: 'Svatba',
  event: 'Event',
  privat: 'Soukromá akce',
};

export const EVENT_SPACE_LABELS: Record<Event['space'], string> = {
  roubenka: 'Roubenka',
  terasa: 'Terasa',
  stodolka: 'Stodolka',
  cely_areal: 'Celý areál',
};

export const EVENT_STATUS_LABELS: Record<Event['status'], string> = {
  DRAFT: 'Koncept',
  PLANNED: 'Plánováno',
  IN_PROGRESS: 'Probíhá',
  COMPLETED: 'Dokončeno',
  CANCELLED: 'Zrušeno',
};

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

// Food Pricing Configuration types
export interface FoodPricingDefault {
  id: number;
  price: number;
  updatedAt: string;
}

export interface FoodPricingDateOverride {
  id: number;
  date: string;
  price: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}
