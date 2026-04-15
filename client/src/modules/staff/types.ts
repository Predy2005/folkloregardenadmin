import { z } from "zod";

// ── Staff Member Form (StaffMembersPage) ──────────────────────────────

export const staffSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().min(1, "Zadejte příjmení"),
  // Email je nepovinný; prázdný string projde, jinak musí být validní e-mail.
  email: z.string().trim().email("Zadejte platný email").optional().or(z.literal("")),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyPhone: z.string().optional(),
  address: z.string().optional(),
  fixedRate: z.string().optional(),
  position: z.string().min(1, "Vyberte roli"),
  hourlyRate: z.number().optional(),
  isGroup: z.boolean().default(false),
  groupSize: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

export type StaffForm = z.infer<typeof staffSchema>;

// ── Attendance Form (StaffAttendancePage) ─────────────────────────────

export const attendanceSchema = z.object({
  staffMemberId: z.number().min(1, "Vyberte člena personálu"),
  attendanceDate: z.string().min(1, "Zadejte datum"),
  hoursWorked: z.number().min(0.1, "Počet hodin musí být větší než 0"),
  notes: z.string().optional(),
  eventId: z.number().nullable().optional(),
});

export type AttendanceForm = z.infer<typeof attendanceSchema>;

// ── Staffing Formula Form (StaffingFormulasPage) ──────────────────────

export const staffingFormulaSchema = z.object({
  category: z.enum([
    'cisniciWaiters',
    'kuchariChefs',
    'pomocneSilyHelpers',
    'moderatoriHosts',
    'muzikantiMusicians',
    'tanecniciDancers',
    'fotografkyPhotographers',
    'sperkyJewelry',
  ] as const, { required_error: 'Vyberte kategorii' }),
  ratio: z.coerce.number().min(1, 'Poměr musí být alespoň 1'),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});

export type StaffingFormulaForm = z.infer<typeof staffingFormulaSchema>;

// ── Shared utility types ──────────────────────────────────────────────

export interface Option {
  value: string;
  label: string;
}
