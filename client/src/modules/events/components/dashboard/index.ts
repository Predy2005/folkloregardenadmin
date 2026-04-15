export { DashboardHeader } from "./DashboardHeader";
export { StaffPlanningCard } from "./StaffPlanningCard";
export { ExpenseTrackerCard } from "./ExpenseTrackerCard";
export { SettlementCard } from "./SettlementCard";
export { TransportCard } from "./TransportCard";
export { VoucherCard } from "./VoucherCard";
export { QuickActionsBar } from "./QuickActionsBar";
export { StockRequirementsCard } from "./StockRequirementsCard";

// NEW: Unified Guest Command Center (combines stats + check-in + spaces)
export { GuestCommandCenter } from "./guest-command";

// Legacy guest components (kept for backwards compatibility)
export { GuestStatsCard } from "./GuestStatsCard";
export { SpaceGuestsCard } from "./SpaceGuestsCard";
export { ReservationCheckInCard } from "./ReservationCheckInCard";

// Dashboard Floor Plan (read-only for tablet service)
export { DashboardFloorPlan } from "./floor-plan";

// Layout components
export {
  DashboardLayoutProvider,
  useDashboardLayout,
  DashboardBox,
  DashboardGrid,
  LayoutSwitcher,
} from "./layout";
export type { DashboardLayout, BoxState, DashboardLayoutState } from "./layout";

// Legacy components (deprecated - will be removed)
export { GuestOverviewCard } from "./guests";
export { GroupCheckInCard } from "./GroupCheckInCard";
