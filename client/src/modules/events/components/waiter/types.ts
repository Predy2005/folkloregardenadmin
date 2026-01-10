// Types for Waiter View

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

export type WaiterViewMode = "floor" | "tables" | "timeline";
