# Folklore Garden Admin System

## Overview
The Folklore Garden Admin System is a comprehensive administration panel designed to manage reservations, payments, food services, and users for the Folklore Garden venue. Its primary purpose is to streamline operational workflows, from booking and financial transactions to inventory management, staff coordination, and event planning. The system aims to provide a centralized platform for efficient management of all key business processes, improving customer experience and internal efficiency.

## User Preferences
- All new modules should use the same design pattern as existing modules.
- Components should implement CRUD operations with filtering, searching, and statistics.
- The purple gradient design should be consistently applied across the entire application.

## System Architecture

### UI/UX Decisions
- **Color Scheme**: Purple Gradient (`hsl(270 70% 60%)` as primary), transitioning to Pink/Orange for interactive elements. Default Dark Mode with optional Light Mode.
- **Fonts**: Inter for UI, tables, forms; Poppins for headings; JetBrains Mono for IDs.
- **Components**: Shadcn UI components with custom purple theme, gradient buttons, color-coded status badges, and purple-accented sidebar navigation.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Wouter for routing, Axios for API, Day.js for dates, TailwindCSS, React Hook Form, TanStack Query, Lucide React for icons.
- **Backend API**: External Symfony-based API (`https://api.folkloregarden.cz/`) with JWT authentication (LexikJWTAuthenticationBundle) and PostgreSQL (Symfony Doctrine).
- **Project Structure**: `client/` for React, `shared/` for common TypeScript types.
- **Authentication**: JWT-based login/registration/logout, protected routes, token in `localStorage`, Axios interceptors for `Authorization` header and 401 handling.
- **State Management**: React Context for auth/theme, TanStack Query for data.
- **Testing**: `data-testid` attributes for automated testing.

### Feature Specifications
The system supports:
- **Authentication**: User login, registration, secure route protection.
- **Dashboard**: Key statistics, recent reservations, metric visualization.
- **Reservations**: Full CRUD operations with comprehensive form:
    - **Creation/Editing**: Complete multi-tab form (Basic Info, Persons, Contact, Invoice, Transfer)
    - **Dynamic Person Management**: Add/remove adults, children, infants with individual menu selection and pricing
    - **Price Calculation**: Automatic total calculation based on persons and transfer
    - **Contact Information**: Name, email, phone, nationality, notes, referral source
    - **Invoice Details**: Optional separate billing information (company, IČ, DIČ)
    - **Transfer Options**: Configurable transfer with person count and pickup address (300 Kč/person)
    - **Payment Email**: Send payment link with QR code and Comgate payment URL to customer
    - **Detail View**: Read-only view with all reservation information (guests, food, payments, billing, transfer)
    - **Status Management**: Track reservation through lifecycle (RECEIVED, WAITING_PAYMENT, PAID, AUTHORIZED, CONFIRMED, CANCELLED)
- **Payments**: Comgate integration for listing/filtering payments, transaction search, financial statistics.
- **Food Management**: Per-item menu management (CRUD), including:
    - **Menu Items**: CRUD with descriptions, prices, child designation.
    - **Per-Item Price Overrides**: Date-specific or date-range pricing with reasons.
    - **Per-Item Availability**: Date-specific or date-range visibility control.
    - **Detail Dialog**: Tabs for Basic Info, Price Overrides, Availability.
- **User Management**: CRUD for system users, role assignment (ROLE_USER, ROLE_ADMIN), login history, profile editing.
- **Disabled Dates**: Management of blocked reservation dates with reasons.
- **Stock Management**:
    - **Stock Items**: CRUD for ingredients, units, minimum stock alerts, categorization.
    - **Recipes**: Linking to menu items, ingredient calculation.
    - **Stock Movements**: Tracking inflows, outflows, adjustments.
- **Commission/Voucher System**:
    - **Partners**: CRUD for affiliates, commission rates.
    - **Vouchers**: CRUD for discount codes, validity/usage limits, partner linking.
    - **Commission Logs**: Calculation and tracking.
- **Staff Management**:
    - **Staff Members**: CRUD for employees, role assignment, hourly rates.
    - **Staff Attendance**: Recording working hours, payment calculation.
- **Cashbox**: Multi-currency income/expense management, transaction categorization, balance tracking.
- **Events**: Advanced planning for various event types (Folklore Show, Wedding), including space allocation, status tracking, guest management (paying/free, table layout, check-in), menu/catering, staff assignment, organizational plan, linking with reservations.
    - **Floor Plan Management**: Drag-and-drop table assignments using @dnd-kit (Roubenka, Terasa, Stodolka, Celý areál rooms), table CRUD, guest import, roster with nationality filtering.
- **Pricing Configuration**: Management of base per-person reservation pricing (Adults, Children 3-12, Infants 0-2) with `includeMeal` flag. Date-specific overrides for special pricing with reasons. Frontend is complete; requires backend API.

## External Dependencies
- **External API**: `https://api.folkloregarden.cz/`
- **Database**: PostgreSQL (via Symfony Doctrine)
- **Payment Gateway**: Comgate API
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities