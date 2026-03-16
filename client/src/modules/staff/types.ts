import { z } from "zod";

// ── Staff Member Form (StaffMembersPage) ──────────────────────────────

export const staffSchema = z.object({
  firstName: z.string().min(1, "Zadejte jméno"),
  lastName: z.string().min(1, "Zadejte příjmení"),
  email: z.string().email("Zadejte platný email"),
  phone: z.string().optional(),
  emergencyContact: z.string().optional(),
  dateOfBirth: z.string().optional(),
  emergencyPhone: z.string().optional(),
  address: z.string().optional(),
  fixedRate: z.string().optional(),
  position: z.string().min(1, "Vyberte roli"),
  hourlyRate: z.number().optional(),
  isActive: z.boolean().default(true),
});

export type StaffForm = z.infer<typeof staffSchema>;

// ── Attendance Form (StaffAttendancePage) ─────────────────────────────

export const attendanceSchema = z.object({
  staffMemberId: z.number().min(1, "Vyberte člena personálu"),
  date: z.string().min(1, "Zadejte datum"),
  hoursWorked: z.number().min(0.1, "Počet hodin musí být větší než 0"),
  note: z.string().optional(),
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
