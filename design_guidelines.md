# Design Guidelines: Folklore Garden Admin System

## Design Approach

**Selected Approach**: Design System with Custom Branding
- Base framework: Material Design principles adapted for admin dashboard
- Customization: Purple-gradient brand identity from provided mockups
- Rationale: Administrative tools require consistency, clarity, and efficiency while maintaining brand coherence with Folklore Garden identity

## Core Design Elements

### A. Color Palette

**Primary Colors (Dark Mode - Default)**
- Background Base: `222 15% 12%` (deep charcoal)
- Background Elevated: `222 15% 16%` (cards, modals)
- Background Accent: `222 15% 20%` (hover states)
- Primary Purple: `270 70% 60%` (buttons, accents)
- Primary Purple Dark: `270 65% 50%` (hover, active states)
- Gradient Accent: Linear gradient from `270 70% 60%` to `290 65% 55%` (headers, CTAs)

**Semantic Colors**
- Success: `142 70% 50%` (paid, confirmed)
- Warning: `38 92% 50%` (pending, waiting payment)
- Error: `0 72% 55%` (cancelled, errors)
- Info: `200 95% 50%` (authorized, notifications)

**Text Colors**
- Primary: `0 0% 98%` (headings, important text)
- Secondary: `0 0% 70%` (body text, descriptions)
- Muted: `0 0% 50%` (labels, metadata)

**Light Mode (Optional Toggle)**
- Background: `0 0% 98%`
- Elevated: `0 0% 100%`
- Text Primary: `222 15% 15%`
- Maintain same accent colors with adjusted opacity

### B. Typography

**Font Families**
- Primary: 'Inter' (Google Fonts) - UI elements, tables, forms
- Accent: 'Poppins' (Google Fonts) - headings, module titles
- Monospace: 'JetBrains Mono' - IDs, transaction codes, technical data

**Type Scale**
- H1 (Module Headers): 2rem (32px), Poppins SemiBold
- H2 (Section Headers): 1.5rem (24px), Poppins Medium
- H3 (Card Headers): 1.25rem (20px), Inter SemiBold
- Body: 0.875rem (14px), Inter Regular
- Small (Metadata): 0.75rem (12px), Inter Regular
- Table Headers: 0.8125rem (13px), Inter Medium

### C. Layout System

**Spacing Primitives**
- Base unit: 4px
- Common spacing: `p-2` (8px), `p-4` (16px), `p-6` (24px), `p-8` (32px)
- Component gaps: `gap-4` for dense layouts, `gap-6` for standard, `gap-8` for spacious
- Page padding: `px-6 py-4` (mobile), `px-8 py-6` (desktop)

**Grid Structure**
- Sidebar: Fixed 240px width (collapsed: 64px icon-only)
- Main Content: `max-w-7xl mx-auto` with responsive padding
- Card Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` for stats/metrics
- Table Container: Full width with horizontal scroll on mobile

**Container Breakpoints**
- Mobile: < 640px (single column, collapsed sidebar)
- Tablet: 640px - 1024px (2-column grids, collapsible sidebar)
- Desktop: > 1024px (full sidebar, 3-column grids)

### D. Component Library

**Navigation**
- Sidebar Menu: Dark background `222 15% 14%`, gradient highlight for active items
- Active Item: Purple gradient left border (4px) + light purple background `270 70% 60% / 10%`
- Menu Icons: 20px, Heroicons outline (inactive), solid (active)
- Logo Area: Gradient background, 64px height with Folklore Garden logo/wordmark

**Data Tables**
- Header: `bg-background-elevated` with `text-sm font-medium text-muted`
- Rows: Alternating background `bg-background` and `bg-background-elevated / 50%`
- Row Hover: `bg-background-accent` with smooth transition
- Cell Padding: `py-3 px-4`
- Sticky Header: On scroll for tables > 10 rows
- Action Column: Right-aligned with icon buttons (edit, delete, view)

**Forms**
- Input Fields: Dark background `222 15% 18%`, 1px border `0 0% 30%`
- Focus State: Purple border `270 70% 60%`, subtle purple glow
- Labels: `text-sm font-medium text-secondary` above input
- Validation: Red border + error message below for errors
- Select Dropdowns: Custom styled with purple accent on hover/focus
- Date Pickers: dayjs integration with purple accent calendar

**Buttons**
- Primary: Purple gradient background, white text, 40px height, rounded-md
- Secondary: Transparent with purple border, purple text
- Danger: Red background `0 72% 55%`, white text
- Ghost: Transparent, hover shows light background
- Icon Buttons: 36px square, hover shows circular background

**Cards & Containers**
- Background: `bg-background-elevated`
- Border: 1px solid `0 0% 25%`
- Padding: `p-6`
- Border Radius: `rounded-lg` (8px)
- Shadow: Subtle `shadow-lg` with purple tint for elevated states

**Status Badges**
- Pill shape: `rounded-full px-3 py-1 text-xs font-medium`
- PAID: Green background `142 70% 50% / 15%`, green text
- PENDING: Yellow background `38 92% 50% / 15%`, yellow text
- CANCELLED: Red background `0 72% 55% / 15%`, red text
- CONFIRMED: Blue background `200 95% 50% / 15%`, blue text

**Modals & Overlays**
- Backdrop: `bg-black / 60%` with blur effect
- Modal Container: `bg-background-elevated` centered, max-w-2xl
- Header: Gradient background with white text, close button top-right
- Content: `p-6` with form fields or detail sections
- Footer: Actions right-aligned with spacing

**Dashboard Metrics Cards**
- Large number display: 2.5rem Poppins SemiBold
- Label below: `text-sm text-muted`
- Icon: Top-left with circular purple gradient background
- Trend indicator: Small arrow + percentage change

### E. Module-Specific Patterns

**Rezervace (Reservations)**
- List view: Table with date, contact, persons count, status, actions
- Detail modal: Tabbed interface (Info, Osoby, Platby, Transfer, Poznámky)
- Quick actions: "Vytvořit akci" button with gradient

**Platby (Payments)**
- Filter bar: Date range picker + status dropdown + search
- Amount display: Bold with currency symbol, color-coded by status
- Transaction ID: Monospace font, copy-to-clipboard icon

**Akce (Events)**
- Calendar view option with purple highlighted event days
- List/Grid toggle for display mode
- Staff assignment: Drag-drop interface or checkbox assignment
- Seat/table diagram: Visual layout editor with SVG

**Personál (Staff)**
- Avatar/initials circle: Purple gradient background if no photo
- Attendance tracking: Checkboxes with historical view
- Export button: Downloads Excel with current filters applied

**Dashboard (Home)**
- Hero Stats: 4-column grid on desktop showing key metrics
- Recent Activity: Timeline-style list of latest reservations/payments
- Quick Actions: Large cards linking to create reservation, view today's events
- Charts: Line/bar charts using Chart.js with purple accent colors

## Images

**Logo & Branding**
- Main Logo: Folklore Garden logo in sidebar (approx 180x48px), white version for dark mode
- Login Page: Background image suggestion - Czech folklore patterns or cultural motif with purple overlay gradient (50% opacity)

**No Hero Images**: This is an admin dashboard - functional over decorative. Use icons and data visualization instead.

## Animation Guidelines

Use sparingly for feedback only:
- Button clicks: Subtle scale `scale-[0.98]` on active
- Sidebar toggle: Smooth width transition (200ms)
- Modal entry: Fade in + slight scale up (150ms ease-out)
- Toast notifications: Slide in from top-right
- **No** decorative animations, page transitions, or scroll effects

## Accessibility

- All form inputs have associated labels
- Focus states clearly visible with purple outline
- Color never used as sole indicator (icons + text for status)
- Minimum contrast ratio 4.5:1 for all text
- Keyboard navigation fully supported throughout
- Screen reader friendly with proper ARIA labels