# Pump Management System

This repository now contains a separate MERN-style backend and frontend:

- `backend`: Express, MongoDB, JWT authentication, seed data, role-based APIs
- `frontend`: React + Vite dashboards for admin, manager, and pump operator roles

## Backend setup

1. Copy `backend/.env.example` to `backend/.env`
2. Set `MONGO_URI` and `JWT_SECRET`
3. Install dependencies inside `backend`
4. Run `npm run dev`

## Frontend setup

1. Copy `frontend/.env.example` to `frontend/.env`
2. Install dependencies inside `frontend`
3. Run `npm run dev`

## Seed users

- `admin@pump.local / Admin@123`
- `manager@pump.local / Manager@123`
- `pumpoperator@pump.local / PumpOperator@123`

The backend seeds default fuel types, tanks, nozzles, pump units, and users on startup if the database is empty.
