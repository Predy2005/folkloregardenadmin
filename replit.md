# Folklore Garden Admin System

## Overview
The Folklore Garden Admin System is a comprehensive administration panel designed to manage reservations, payments, food services, and users for the Folklore Garden venue. Its primary purpose is to streamline operational workflows, from booking and financial transactions to inventory management, staff coordination, and event planning. The system aims to provide a centralized platform for efficient management of all key business processes, improving customer experience and internal efficiency.

## User Preferences
- All new modules should use the same design pattern as existing modules.
- Components should implement CRUD operations with filtering, searching, and statistics.
- The purple gradient design should be consistently applied across the entire application.

## System Architecture

### UI/UX Decisions
- **Color Scheme**: Purple Gradient (`hsl(270 70% 60%)` as primary), transitioning to Pink/Orange for interactive elements.
- **Modes**: Default Dark Mode with an optional Light Mode toggle.
- **Fonts**: Inter for UI elements, tables, and forms; Poppins for headings and module titles; JetBrains Mono for IDs and transaction codes.
- **Components**: Utilizes Shadcn UI components with a custom purple theme. Features gradient buttons for primary actions, color-coded status badges, and a sidebar navigation with purple accents.

### Technical Implementations
- **Frontend**: Built with React 18 and TypeScript for type safety. Uses Wouter for routing, Axios for API communication, Day.js for date handling, TailwindCSS for styling, React Hook Form for forms, TanStack Query for data fetching/caching, and Lucide React for icons.
- **Backend API**: Leverages an external Symfony-based API (`https://api.folkloregarden.cz/`) with JWT authentication (LexikJWTAuthenticationBundle) and PostgreSQL database (Symfony Doctrine).
- **Project Structure**: Organized into `client/` (for React application) and `shared/` (for common TypeScript types).
- **Authentication**: JWT-based login, registration, and logout with protected routes. JWT token stored in `localStorage`. Axios interceptors handle automatic `Authorization` header injection and 401 Unauthorized logout.
- **State Management**: React Context for authentication and theme, TanStack Query for data fetching, caching, and mutations.
- **Testing**: Interactive elements include `data-testid` attributes for easier automated testing.

### Feature Specifications
The system supports a wide range of functionalities:
- **Authentication**: User login, registration, and secure route protection.
- **Dashboard**: Overview of key statistics, recent reservations, and metric visualization.
- **Reservations**: Comprehensive management including search, detail view (guests, food, payments, billing, transfer), and status tracking (RECEIVED, WAITING_PAYMENT, PAID, CANCELLED, CONFIRMED).
- **Payments**: Integration with Comgate API for listing and filtering payments by status, searching by transaction ID or reference, and financial statistics.
- **Food Management**: CRUD operations for menu items, including child menus, pricing, and descriptions.
- **User Management**: CRUD for system users, role assignment (ROLE_USER, ROLE_ADMIN) via multi-select checkboxes, login history, and profile editing.
    - **Role Management**: Users can be assigned multiple roles using checkboxes in create/edit forms. Frontend sends `roles: ['ROLE_USER', 'ROLE_ADMIN']` as array.
    - **Profile Editing**: Dedicated `/profile` page accessible via user dropdown menu. Users can update username, email, and change password with validation (currentPassword required for password changes, newPassword must match confirmPassword).
- **Disabled Dates**: Management of blocked dates for the reservation system with reasons and project association.
- **Stock Management**:
    - **Stock Items**: CRUD for ingredients, unit management, minimum stock alerts, and categorization.
    - **Recipes**: Creation of recipes linked to menu items, ingredient quantity calculation, and menu item association.
    - **Stock Movements**: Tracking of inventory inflows, outflows, and adjustments with type and date filtering.
- **Commission/Voucher System**:
    - **Partners**: CRUD for affiliates, commission rate setup, and active partner tracking.
    - **Vouchers**: CRUD for discount codes and QR vouchers, validity and usage limit settings, partner linking, and status tracking.
    - **Commission Logs**: Calculation and tracking of commissions from reservations, payment status, and total amount statistics.
- **Staff Management**:
    - **Staff Members**: CRUD for employees, role assignment (chef, waiter, bartender), hourly rates, and contact details.
    - **Staff Attendance**: Recording of working hours, calculation based on hourly rates, payment status, and unpaid hour statistics.
- **Cashbox**: Multi-currency (CZK, EUR) management of income and expenses, transaction categorization, balance tracking, and filtering.
- **Events**: Advanced planning and management module for various event types (Folklore Show, Wedding, Private Event). Includes space allocation, status tracking (Concept, Planned, Ongoing, Completed, Canceled), organizer/client details, guest management (paying/free, table layout, guest list with type/nationality, check-in), menu and catering integration, staff assignment, detailed organizational plan, and linking with reservations. Detailed views include tabs for Information, Guests, Staff, Menu, Plan, and Floor Plan.
    - **Floor Plan Management**: Comprehensive drag-and-drop system for table assignments using @dnd-kit library. Features include room-based layout (4 rooms: Roubenka, Terasa, Stodolka, Celý areál), table CRUD operations with capacity management, automatic guest import from reservations, guest roster with nationality filtering, and visual drag-and-drop between tables and unassigned roster.
- **Pricing Configuration** (⚠️ Backend API Required):
    - **Default Prices**: Management of base per-person reservation pricing for three categories: Adults (Dospělí), Children 3-12 years (Děti 3-12 let), Infants 0-2 years (Batolata 0-2 roky). Includes boolean flag for whether price includes meal (`includeMeal`).
    - **Date-Specific Overrides**: CRUD operations for special pricing on specific dates (e.g., premium dates, holidays) with optional reason field and meal inclusion flag. Features include date-based filtering, status badges (Today, Past, Future), search functionality, and visual indication of meal inclusion status.
    - **Frontend Implementation**: Complete UI at `/pricing` with form validation, checkboxes for meal inclusion control, toast notifications, and responsive design matching the purple gradient theme.
    - **Status**: ✅ Frontend complete, ⚠️ Backend API endpoints not yet implemented (see Backend API Requirements section below).

## Database Schema
### Event Tables Module (`sql/06_event_table_migration.sql`)
- **event_table**: Stores table definitions for events
  - `id`, `event_id`, `table_name`, `room` (roubenka/terasa/stodolka/cely_areal)
  - `capacity`, `position_x`, `position_y` (for floor plan coordinates)
- **event_guest**: Extended guest management (migrated from simple table_number)
  - Added: `event_table_id` (FK to event_table), `reservation_id`, `person_index`
  - Added: `type` (adult/child), `is_present`, `menu_item_id`
  - Removed: `table_number`, `seat_number` (replaced by event_table_id)
- **Migration Notes**: Automatic migration converts existing `table_number` values to `event_table` records with default room 'cely_areal' and capacity 10.

## Known Issues
- **User Role Management**: While frontend correctly sends `roles: ['ROLE_ADMIN']` array to API, the Symfony backend appears to ignore this field and always assigns `ROLE_USER` to new/edited users. This is a backend API issue that requires investigation and fix on the Symfony side.

## External Dependencies
- **External API**: `https://api.folkloregarden.cz/`
- **Database**: PostgreSQL (via Symfony Doctrine)
- **Payment Gateway**: Comgate API
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities

## Backend API Requirements

### Pricing Module Endpoints (Not Yet Implemented)
The Pricing Configuration frontend module is complete and requires the following Symfony API endpoints:

#### 1. Get Default Prices
```
GET /api/pricing/defaults
Response: {
  "id": 1,
  "adultPrice": 1250.00,
  "childPrice": 800.00,
  "infantPrice": 0.00,
  "includeMeal": false,
  "updatedAt": "2025-10-31T12:00:00+00:00"
}
```

#### 2. Update Default Prices
```
PUT /api/pricing/defaults
Request Body: {
  "adultPrice": 1250.00,
  "childPrice": 800.00,
  "infantPrice": 0.00,
  "includeMeal": false
}
Response: Same as GET response
```

#### 3. List Date Overrides
```
GET /api/pricing/date-overrides
Response: [
  {
    "id": 1,
    "date": "2025-12-24",
    "adultPrice": 3500.00,
    "childPrice": 2000.00,
    "infantPrice": 500.00,
    "includeMeal": true,
    "reason": "Vánoce - Premium datum",
    "createdAt": "2025-10-31T12:00:00+00:00",
    "updatedAt": "2025-10-31T12:00:00+00:00"
  }
]
```

#### 4. Create Date Override
```
POST /api/pricing/date-overrides
Request Body: {
  "date": "2025-12-24",
  "adultPrice": 3500.00,
  "childPrice": 2000.00,
  "infantPrice": 500.00,
  "includeMeal": true,
  "reason": "Vánoce - Premium datum"
}
Response: Same as list item
```

#### 5. Update Date Override
```
PUT /api/pricing/date-overrides/{id}
Request Body: {
  "date": "2025-12-24",
  "adultPrice": 3500.00,
  "childPrice": 2000.00,
  "infantPrice": 500.00,
  "includeMeal": true,
  "reason": "Štědrý den - Premium"
}
Response: Same as list item
```

#### 6. Delete Date Override
```
DELETE /api/pricing/date-overrides/{id}
Response: 204 No Content
```

**Database Schema Suggestion**:
```sql
-- pricing_default table
CREATE TABLE pricing_default (
    id SERIAL PRIMARY KEY,
    adult_price DECIMAL(10,2) NOT NULL,
    child_price DECIMAL(10,2) NOT NULL,
    infant_price DECIMAL(10,2) NOT NULL,
    include_meal BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- pricing_date_override table
CREATE TABLE pricing_date_override (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    adult_price DECIMAL(10,2) NOT NULL,
    child_price DECIMAL(10,2) NOT NULL,
    infant_price DECIMAL(10,2) NOT NULL,
    include_meal BOOLEAN NOT NULL DEFAULT false,
    reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```