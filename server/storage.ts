import { type User, type InsertUser } from "@shared/schema";
import type { Event, EventTable, EventGuest, EventMenuItem, EventStaffAssignment, StaffMember } from "@shared/types";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

type InsertEvent = Omit<Event, "id" | "createdAt" | "updatedAt" | "staffAssignments" | "menuItems" | "tables" | "reservation">;
type UpdateEvent = Partial<InsertEvent>;
type InsertStaffMember = Omit<StaffMember, "id" | "createdAt" | "updatedAt" | "attendances">;
type InsertEventTable = Omit<EventTable, "id" | "guests">;
type InsertEventGuest = Omit<EventGuest, "id">;
type InsertEventMenuItem = Omit<EventMenuItem, "id" | "recipe">;
type InsertEventStaffAssignment = Omit<EventStaffAssignment, "id" | "staffMember">;

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Event methods
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, event: UpdateEvent): Promise<Event | undefined>;
  deleteEvent(id: number): Promise<boolean>;
  
  // StaffMember methods
  getStaffMembers(): Promise<StaffMember[]>;
  getStaffMember(id: number): Promise<StaffMember | undefined>;
  createStaffMember(staffMember: InsertStaffMember): Promise<StaffMember>;
  
  // EventTable methods
  getEventTables(eventId: number): Promise<EventTable[]>;
  createEventTable(table: InsertEventTable): Promise<EventTable>;
  updateEventTable(id: number, table: Partial<InsertEventTable>): Promise<EventTable | undefined>;
  deleteEventTable(id: number): Promise<boolean>;
  
  // EventGuest methods
  getEventGuests(eventId: number): Promise<EventGuest[]>;
  createEventGuest(guest: InsertEventGuest): Promise<EventGuest>;
  updateEventGuest(id: number, guest: Partial<InsertEventGuest>): Promise<EventGuest | undefined>;
  deleteEventGuest(id: number): Promise<boolean>;
  
  // EventMenuItem methods
  getEventMenuItems(eventId: number): Promise<EventMenuItem[]>;
  createEventMenuItem(item: InsertEventMenuItem): Promise<EventMenuItem>;
  updateEventMenuItem(id: number, item: Partial<InsertEventMenuItem>): Promise<EventMenuItem | undefined>;
  deleteEventMenuItem(id: number): Promise<boolean>;
  
  // EventStaffAssignment methods
  getEventStaffAssignments(eventId: number): Promise<EventStaffAssignment[]>;
  createEventStaffAssignment(assignment: InsertEventStaffAssignment): Promise<EventStaffAssignment>;
  deleteEventStaffAssignment(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private events: Map<number, Event>;
  private staffMembers: Map<number, StaffMember>;
  private eventTables: Map<number, EventTable>;
  private eventGuests: Map<number, EventGuest>;
  private eventMenuItems: Map<number, EventMenuItem>;
  private eventStaffAssignments: Map<number, EventStaffAssignment>;
  private nextEventId: number = 1;
  private nextStaffMemberId: number = 1;
  private nextTableId: number = 1;
  private nextGuestId: number = 1;
  private nextMenuItemId: number = 1;
  private nextAssignmentId: number = 1;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.staffMembers = new Map();
    this.eventTables = new Map();
    this.eventGuests = new Map();
    this.eventMenuItems = new Map();
    this.eventStaffAssignments = new Map();
    
    // Seed s testovacími daty pro personál
    this.seedStaffMembers();
  }

  private seedStaffMembers() {
    const staffData: InsertStaffMember[] = [
      {
        firstName: "Jana",
        lastName: "Nováková",
        email: "jana.novakova@folkloregarden.cz",
        phone: "+420 123 456 789",
        role: "manager",
        hourlyRate: 300,
        active: true,
      },
      {
        firstName: "Petr",
        lastName: "Svoboda",
        email: "petr.svoboda@folkloregarden.cz",
        phone: "+420 234 567 890",
        role: "waiter",
        hourlyRate: 150,
        active: true,
      },
      {
        firstName: "Marie",
        lastName: "Dvořáková",
        email: "marie.dvorakova@folkloregarden.cz",
        phone: "+420 345 678 901",
        role: "chef",
        hourlyRate: 250,
        active: true,
      },
    ];
    
    staffData.forEach((staff) => this.createStaffMember(staff));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Event methods
  async getEvents(): Promise<Event[]> {
    const events = Array.from(this.events.values());
    // Přidání vztahů (tables, menuItems, staffAssignments)
    return Promise.all(events.map(async (event) => ({
      ...event,
      tables: await this.getEventTables(event.id),
      menuItems: await this.getEventMenuItems(event.id),
      staffAssignments: await this.getEventStaffAssignments(event.id),
    })));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;
    
    return {
      ...event,
      tables: await this.getEventTables(id),
      menuItems: await this.getEventMenuItems(id),
      staffAssignments: await this.getEventStaffAssignments(id),
    };
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = this.nextEventId++;
    const now = new Date().toISOString();
    const event: Event = {
      ...insertEvent,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.events.set(id, event);
    return event;
  }

  async updateEvent(id: number, updateEvent: UpdateEvent): Promise<Event | undefined> {
    const event = this.events.get(id);
    if (!event) return undefined;

    const updated: Event = {
      ...event,
      ...updateEvent,
      updatedAt: new Date().toISOString(),
    };
    this.events.set(id, updated);
    return updated;
  }

  async deleteEvent(id: number): Promise<boolean> {
    return this.events.delete(id);
  }

  // StaffMember methods
  async getStaffMembers(): Promise<StaffMember[]> {
    return Array.from(this.staffMembers.values());
  }

  async getStaffMember(id: number): Promise<StaffMember | undefined> {
    return this.staffMembers.get(id);
  }

  async createStaffMember(insertStaffMember: InsertStaffMember): Promise<StaffMember> {
    const id = this.nextStaffMemberId++;
    const now = new Date().toISOString();
    const staffMember: StaffMember = {
      ...insertStaffMember,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.staffMembers.set(id, staffMember);
    return staffMember;
  }

  // EventTable methods
  async getEventTables(eventId: number): Promise<EventTable[]> {
    const tables = Array.from(this.eventTables.values()).filter(
      (table) => table.eventId === eventId
    );
    
    return tables.map((table) => ({
      ...table,
      guests: Array.from(this.eventGuests.values()).filter(
        (guest) => guest.eventTableId === table.id
      ),
    }));
  }

  async createEventTable(insertTable: InsertEventTable): Promise<EventTable> {
    const id = this.nextTableId++;
    const table: EventTable = {
      ...insertTable,
      id,
      guests: [],
    };
    this.eventTables.set(id, table);
    return table;
  }

  async updateEventTable(id: number, updateTable: Partial<InsertEventTable>): Promise<EventTable | undefined> {
    const table = this.eventTables.get(id);
    if (!table) return undefined;

    const updated: EventTable = {
      ...table,
      ...updateTable,
    };
    this.eventTables.set(id, updated);
    return updated;
  }

  async deleteEventTable(id: number): Promise<boolean> {
    return this.eventTables.delete(id);
  }

  // EventGuest methods
  async getEventGuests(eventId: number): Promise<EventGuest[]> {
    return Array.from(this.eventGuests.values()).filter(
      (guest) => {
        const table = guest.eventTableId ? this.eventTables.get(guest.eventTableId) : null;
        return table?.eventId === eventId || !guest.eventTableId;
      }
    );
  }

  async createEventGuest(insertGuest: InsertEventGuest): Promise<EventGuest> {
    const id = this.nextGuestId++;
    const guest: EventGuest = {
      ...insertGuest,
      id,
    };
    this.eventGuests.set(id, guest);
    return guest;
  }

  async updateEventGuest(id: number, updateGuest: Partial<InsertEventGuest>): Promise<EventGuest | undefined> {
    const guest = this.eventGuests.get(id);
    if (!guest) return undefined;

    const updated: EventGuest = {
      ...guest,
      ...updateGuest,
    };
    this.eventGuests.set(id, updated);
    return updated;
  }

  async deleteEventGuest(id: number): Promise<boolean> {
    return this.eventGuests.delete(id);
  }

  // EventMenuItem methods
  async getEventMenuItems(eventId: number): Promise<EventMenuItem[]> {
    return Array.from(this.eventMenuItems.values()).filter(
      (item) => item.eventId === eventId
    );
  }

  async createEventMenuItem(insertItem: InsertEventMenuItem): Promise<EventMenuItem> {
    const id = this.nextMenuItemId++;
    const item: EventMenuItem = {
      ...insertItem,
      id,
    };
    this.eventMenuItems.set(id, item);
    return item;
  }

  async updateEventMenuItem(id: number, updateItem: Partial<InsertEventMenuItem>): Promise<EventMenuItem | undefined> {
    const item = this.eventMenuItems.get(id);
    if (!item) return undefined;

    const updated: EventMenuItem = {
      ...item,
      ...updateItem,
    };
    this.eventMenuItems.set(id, updated);
    return updated;
  }

  async deleteEventMenuItem(id: number): Promise<boolean> {
    return this.eventMenuItems.delete(id);
  }

  // EventStaffAssignment methods
  async getEventStaffAssignments(eventId: number): Promise<EventStaffAssignment[]> {
    const assignments = Array.from(this.eventStaffAssignments.values()).filter(
      (assignment) => assignment.eventId === eventId
    );
    
    return assignments.map((assignment) => ({
      ...assignment,
      staffMember: this.staffMembers.get(assignment.staffMemberId),
    }));
  }

  async createEventStaffAssignment(insertAssignment: InsertEventStaffAssignment): Promise<EventStaffAssignment> {
    const id = this.nextAssignmentId++;
    const assignment: EventStaffAssignment = {
      ...insertAssignment,
      id,
    };
    this.eventStaffAssignments.set(id, assignment);
    return assignment;
  }

  async deleteEventStaffAssignment(id: number): Promise<boolean> {
    return this.eventStaffAssignments.delete(id);
  }
}

export const storage = new MemStorage();
