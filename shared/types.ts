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
  email: string;
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
