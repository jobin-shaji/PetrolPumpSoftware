# Pump Management Backend API Documentation

This document lists all backend API endpoints, grouped by resource. Each endpoint includes the HTTP method, path, required roles, and a brief description.

---

## Authentication

### POST /api/auth/login
- **Description:** Login with username and password.
- **Roles:** Public

### GET /api/auth/me
- **Description:** Get current authenticated user.
- **Roles:** Any authenticated user

---

## Users

### GET /api/users
- **Description:** List all users.
- **Roles:** admin, manager

### POST /api/users
- **Description:** Create a new user.
- **Roles:** admin

### PATCH /api/users/:id
- **Description:** Update user details.
- **Roles:** admin

### DELETE /api/users/:id
- **Description:** Delete a user.
- **Roles:** admin

### POST /api/users/:id/employee
- **Description:** Make user an employee.
- **Roles:** admin

### DELETE /api/users/:id/employee
- **Description:** Remove employee status.
- **Roles:** admin

---

## Customers

### GET /api/customers
- **Description:** List all customers.
- **Roles:** admin, manager, pumpOperator

### GET /api/customers/:id
- **Description:** Get customer by ID.
- **Roles:** admin, manager, pumpOperator

### POST /api/customers
- **Description:** Create a new customer.
- **Roles:** admin, manager

### PATCH /api/customers/:id
- **Description:** Update customer details.
- **Roles:** admin, manager

---

## Fuel Types

### GET /api/fuel-types
- **Description:** List all fuel types.
- **Roles:** admin, manager, pumpOperator

### POST /api/fuel-types
- **Description:** Create a new fuel type.
- **Roles:** admin

### PATCH /api/fuel-types/:id
- **Description:** Update fuel type.
- **Roles:** admin

### DELETE /api/fuel-types/:id
- **Description:** Delete fuel type.
- **Roles:** admin

---

## Fuel Prices

### GET /api/fuel-prices/current
- **Description:** Get current daily fuel prices.
- **Roles:** admin, manager, pumpOperator

### POST /api/fuel-prices
- **Description:** Set daily fuel price.
- **Roles:** admin, manager

---

## Units

### GET /api/units
- **Description:** List all pump units.
- **Roles:** admin, manager, pumpOperator

### POST /api/units
- **Description:** Create a new unit.
- **Roles:** admin

### PATCH /api/units/:id
- **Description:** Update unit.
- **Roles:** admin

### DELETE /api/units/:id
- **Description:** Delete unit.
- **Roles:** admin

---

## Nozzles

### GET /api/nozzles
- **Description:** List all nozzles.
- **Roles:** admin, manager, pumpOperator

### POST /api/nozzles
- **Description:** Create a new nozzle.
- **Roles:** admin

### PATCH /api/nozzles/:id
- **Description:** Update nozzle.
- **Roles:** admin

### DELETE /api/nozzles/:id
- **Description:** Delete nozzle.
- **Roles:** admin

---

## Tanks

### GET /api/tanks
- **Description:** List all tanks.
- **Roles:** admin, manager, pumpOperator

### POST /api/tanks
- **Description:** Create a new tank.
- **Roles:** admin

### PATCH /api/tanks/:id
- **Description:** Update tank.
- **Roles:** admin

### DELETE /api/tanks/:id
- **Description:** Delete tank.
- **Roles:** admin

---

## Purchases

### GET /api/purchases
- **Description:** List all purchases.
- **Roles:** admin, manager

### POST /api/purchases
- **Description:** Create a new purchase.
- **Roles:** admin, manager

---

## Shifts

### GET /api/shifts
- **Description:** List all shifts.
- **Roles:** admin, manager, pumpOperator

### POST /api/shifts/start
- **Description:** Start a new shift.
- **Roles:** admin, manager, pumpOperator

### POST /api/shifts/:id/end
- **Description:** End a shift.
- **Roles:** admin, manager, pumpOperator

---

## Unit Sessions

### GET /api/unit-session
- **Description:** List all unit sessions.
- **Roles:** admin, manager, pumpOperator

### GET /api/unit-session/current
- **Description:** Get current session for operator.
- **Roles:** pumpOperator

### POST /api/unit-session/start
- **Description:** Start a new unit session.
- **Roles:** pumpOperator

### POST /api/unit-session/record-readings
- **Description:** Record closing readings for a session.
- **Roles:** pumpOperator, admin

### POST /api/unit-session/end
- **Description:** End a unit session.
- **Roles:** pumpOperator, admin

### POST /api/unit-session/:id/force-close
- **Description:** Force close a session (admin only).
- **Roles:** admin

---

## Readings

### GET /api/readings
- **Description:** List all readings.
- **Roles:** admin, manager, pumpOperator

### POST /api/readings
- **Description:** Create a new reading.
- **Roles:** admin, manager, pumpOperator

---

## Credit Sales

### GET /api/credit-sales
- **Description:** List all credit sales.
- **Roles:** pumpOperator, manager, admin

### POST /api/credit-sales
- **Description:** Create a new credit sale.
- **Roles:** pumpOperator, manager

### GET /api/credit-sales/session/:sessionId
- **Description:** List credit sales for a session.
- **Roles:** pumpOperator, manager, admin

### GET /api/credit-sales/:id
- **Description:** Get credit sale by ID.
- **Roles:** pumpOperator, manager, admin

---

## Session Payments

### POST /api/session-payments/:sessionId
- **Description:** Record payment for a session.
- **Roles:** pumpOperator, manager

### GET /api/session-payments/:sessionId
- **Description:** Get payment details for a session.
- **Roles:** pumpOperator, manager, admin

### GET /api/session-payments/:sessionId/reconciliation
- **Description:** Get reconciliation for a session.
- **Roles:** pumpOperator, manager, admin

---

## Reports

### GET /api/reports/profit
- **Description:** Get profit report.
- **Roles:** admin, manager

### GET /api/reports/daily
- **Description:** Get daily summary report.
- **Roles:** admin, manager

### GET /api/reports/fuel
- **Description:** Get fuel summary report.
- **Roles:** admin, manager

---

## (TODO) Operator-wise & Session-wise Daily Report
- **Description:** (To be implemented) Operator-wise and session-wise daily analytics for admin dashboard.

---

## Notes
- All endpoints require authentication unless otherwise noted.
- Most endpoints require role-based authorization as listed.
- For detailed request/response schemas, see the controller files or ask for a specific endpoint example.
