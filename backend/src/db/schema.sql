CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'pumpOperator')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_fuel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id),
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  price_per_litre NUMERIC(14, 3) NOT NULL CHECK (price_per_litre > 0),
  updated_by_user_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fuel_type_id, price_date)
);

CREATE INDEX IF NOT EXISTS daily_fuel_prices_date_idx ON daily_fuel_prices (price_date DESC);

CREATE TABLE IF NOT EXISTS pump_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  assigned_to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fuel_type_id UUID NOT NULL REFERENCES fuel_types(id),
  capacity NUMERIC(14, 3) NOT NULL CHECK (capacity >= 0),
  current_level NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (current_level >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (current_level <= capacity)
);

CREATE TABLE IF NOT EXISTS nozzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES tanks(id),
  nozzle_number TEXT NOT NULL UNIQUE,
  unit_id UUID REFERENCES pump_units(id) ON DELETE SET NULL,
  latest_reading NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (latest_reading >= 0),
  latest_reading_updated_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES pump_units(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  started_by_user_id UUID NOT NULL REFERENCES users(id),
  ended_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES pump_units(id),
  pump_operator_id UUID NOT NULL REFERENCES users(id),
  shift_id UUID NOT NULL UNIQUE REFERENCES shifts(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  ended_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  forced_close BOOLEAN NOT NULL DEFAULT FALSE,
  close_reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS unit_session_nozzle_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_session_id UUID NOT NULL REFERENCES unit_sessions(id) ON DELETE CASCADE,
  nozzle_id UUID NOT NULL REFERENCES nozzles(id),
  opening_reading NUMERIC(14, 3) NOT NULL CHECK (opening_reading >= 0),
  closing_reading NUMERIC(14, 3) CHECK (closing_reading >= 0),
  price_per_litre NUMERIC(14, 3) CHECK (price_per_litre >= 0),
  litres_sold NUMERIC(14, 3) CHECK (litres_sold >= 0),
  total_amount NUMERIC(14, 3) CHECK (total_amount >= 0),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_session_id, nozzle_id),
  CHECK (
    (closing_reading IS NULL AND price_per_litre IS NULL AND litres_sold IS NULL AND total_amount IS NULL AND closed_at IS NULL)
    OR
    (closing_reading IS NOT NULL AND price_per_litre IS NOT NULL AND litres_sold IS NOT NULL AND total_amount IS NOT NULL AND closed_at IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS employees_user_id_idx ON employees (user_id);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES tanks(id),
  quantity_litres NUMERIC(14, 3) NOT NULL CHECK (quantity_litres > 0),
  price_per_litre NUMERIC(14, 3) NOT NULL CHECK (price_per_litre > 0),
  total_cost NUMERIC(14, 3) NOT NULL CHECK (total_cost >= 0),
  supplier TEXT NOT NULL DEFAULT '',
  invoice_number TEXT NOT NULL DEFAULT '',
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entered_by_user_id UUID NOT NULL REFERENCES users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  vehicle_number TEXT,
  credit_limit NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
  current_balance NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_session_id UUID NOT NULL REFERENCES unit_sessions(id) ON DELETE CASCADE,
  nozzle_id UUID NOT NULL REFERENCES nozzles(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  litres NUMERIC(14, 3) NOT NULL CHECK (litres > 0),
  price_per_litre NUMERIC(14, 3) NOT NULL CHECK (price_per_litre > 0),
  total_amount NUMERIC(14, 3) NOT NULL CHECK (total_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  credit_sale_id UUID REFERENCES credit_sales(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
  amount NUMERIC(14, 3) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_session_id UUID NOT NULL UNIQUE REFERENCES unit_sessions(id) ON DELETE CASCADE,
  cash_collected NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (cash_collected >= 0),
  upi_collected NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (upi_collected >= 0),
  card_collected NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (card_collected >= 0),
  total_collected NUMERIC(14, 3) NOT NULL DEFAULT 0 CHECK (total_collected >= 0),
  total_sales NUMERIC(14, 3) NOT NULL DEFAULT 0,
  credit_sales_total NUMERIC(14, 3) NOT NULL DEFAULT 0,
  expected_collection NUMERIC(14, 3) NOT NULL DEFAULT 0,
  difference NUMERIC(14, 3) NOT NULL DEFAULT 0,
  reconciled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unit_sessions_open_unit_idx
  ON unit_sessions (unit_id)
  WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS unit_sessions_open_operator_idx
  ON unit_sessions (pump_operator_id)
  WHERE status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS shifts_active_unit_idx
  ON shifts (unit_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS nozzles_unit_id_idx ON nozzles (unit_id);
CREATE INDEX IF NOT EXISTS nozzles_tank_id_idx ON nozzles (tank_id);
CREATE INDEX IF NOT EXISTS tanks_fuel_type_id_idx ON tanks (fuel_type_id);
CREATE INDEX IF NOT EXISTS purchases_tank_id_idx ON purchases (tank_id);
CREATE INDEX IF NOT EXISTS purchases_date_idx ON purchases (date);
CREATE INDEX IF NOT EXISTS unit_session_nozzle_readings_session_id_idx
  ON unit_session_nozzle_readings (unit_session_id);
CREATE INDEX IF NOT EXISTS unit_session_nozzle_readings_nozzle_id_idx
  ON unit_session_nozzle_readings (nozzle_id);
CREATE INDEX IF NOT EXISTS unit_session_nozzle_readings_closed_at_idx
  ON unit_session_nozzle_readings (closed_at);
CREATE INDEX IF NOT EXISTS unit_sessions_start_time_idx ON unit_sessions (start_time);
CREATE INDEX IF NOT EXISTS shifts_start_time_idx ON shifts (start_time);
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers (phone);
CREATE INDEX IF NOT EXISTS customers_vehicle_number_idx ON customers (vehicle_number);
CREATE INDEX IF NOT EXISTS credit_sales_session_id_idx ON credit_sales (unit_session_id);
CREATE INDEX IF NOT EXISTS credit_sales_nozzle_id_idx ON credit_sales (nozzle_id);
CREATE INDEX IF NOT EXISTS credit_sales_customer_id_idx ON credit_sales (customer_id);
CREATE INDEX IF NOT EXISTS credit_transactions_customer_id_idx ON credit_transactions (customer_id);
CREATE INDEX IF NOT EXISTS credit_transactions_created_at_idx ON credit_transactions (created_at);
CREATE INDEX IF NOT EXISTS session_payments_session_id_idx ON session_payments (unit_session_id);
CREATE INDEX IF NOT EXISTS session_payments_created_at_idx ON session_payments (created_at);
