import type { CompanySettings } from "@shared/types";

export interface SettingsTabProps {
  formData: Partial<CompanySettings>;
  handleChange: (field: keyof CompanySettings, value: string | number | boolean) => void;
}
