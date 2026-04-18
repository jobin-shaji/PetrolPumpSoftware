import bcrypt from 'bcryptjs';
import { getDb, withTransaction } from '../config/db.js';

const defaultFuelTypes = [
  { name: 'Motospot', description: 'Petrol' },
  { name: 'High Speed Diesel', description: 'Diesel fuel' },
  { name: 'SP95', description: 'Premium petrol' },
  { name: 'Green Diesel', description: 'Cleaner diesel blend' },
];

const defaultUsers = [
  {
    name: 'System Admin',
    email: 'admin@pump.local',
    password: 'Admin@123',
    role: 'admin',
  },
  {
    name: 'Floor Manager',
    email: 'manager@pump.local',
    password: 'Manager@123',
    role: 'manager',
  },
  {
    name: 'Default Pump Operator',
    email: 'pumpoperator@pump.local',
    password: 'PumpOperator@123',
    role: 'pumpOperator',
  },
];

const defaultCustomers = [
  {
    name: 'Customer',
    phone: '1234567890',
    vehicleNumber: 'KL12A1234',
    creditLimit: 100000,
  },
];

export const ensureSeedData = async () => {
  const db = getDb();

  await withTransaction(async (tx) => {
    const { rows: fuelCountRows } = await tx.query('SELECT COUNT(*)::int AS count FROM fuel_types');
    const fuelCount = fuelCountRows[0]?.count ?? 0;

    if (fuelCount === 0) {
      await Promise.all(
        defaultFuelTypes.map((fuelType) =>
          tx.query(
            `
              INSERT INTO fuel_types (name, description)
              VALUES ($1, $2)
              ON CONFLICT (name) DO NOTHING
            `,
            [fuelType.name, fuelType.description]
          )
        )
      );
    }

    const { rows: fuelRows } = await tx.query(
      `
        SELECT id, name
        FROM fuel_types
        WHERE is_active = TRUE
        ORDER BY name ASC
      `
    );

    const { rows: tankCountRows } = await tx.query('SELECT COUNT(*)::int AS count FROM tanks');
    const tankCount = tankCountRows[0]?.count ?? 0;

    if (tankCount === 0) {
      await Promise.all(
        fuelRows.map((fuelType) =>
          tx.query(
            `
              INSERT INTO tanks (fuel_type_id, capacity, current_level)
              VALUES ($1, $2, $3)
            `,
            [fuelType.id, 10000, 0]
          )
        )
      );
    }

    const { rows: unitCountRows } = await tx.query('SELECT COUNT(*)::int AS count FROM pump_units');
    const unitCount = unitCountRows[0]?.count ?? 0;

    if (unitCount === 0) {
      await tx.query(
        `
          INSERT INTO pump_units (name, status)
          VALUES
            ('Unit 1', 'available'),
            ('Unit 2', 'available'),
            ('Unit 3', 'available')
          ON CONFLICT (name) DO NOTHING
        `
      );
    }

    const { rows: tanks } = await tx.query(
      `
        SELECT t.id, ft.name AS "fuelTypeName"
        FROM tanks t
        JOIN fuel_types ft ON ft.id = t.fuel_type_id
        WHERE t.is_active = TRUE AND ft.is_active = TRUE
      `
    );

    const tankByFuelName = new Map(tanks.map((row) => [row.fuelTypeName, row.id]));

    const { rows: units } = await tx.query(
      `
        SELECT id, name
        FROM pump_units
        WHERE is_active = TRUE
        ORDER BY name ASC
      `
    );

    const unitByName = new Map(units.map((row) => [row.name, row.id]));

    const { rows: nozzleCountRows } = await tx.query('SELECT COUNT(*)::int AS count FROM nozzles');
    const nozzleCount = nozzleCountRows[0]?.count ?? 0;

    if (nozzleCount === 0) {
      const payload = [
        ...Array.from({ length: 4 }).map((_, index) => ({
          nozzleNumber: `M-${index + 1}`,
          fuelTypeName: 'Motospot',
          unitName: 'Unit 1',
        })),
        ...Array.from({ length: 4 }).map((_, index) => ({
          nozzleNumber: `HSD-${index + 1}`,
          fuelTypeName: 'High Speed Diesel',
          unitName: 'Unit 2',
        })),
        ...Array.from({ length: 2 }).map((_, index) => ({
          nozzleNumber: `SP95-${index + 1}`,
          fuelTypeName: 'SP95',
          unitName: 'Unit 3',
        })),
        ...Array.from({ length: 2 }).map((_, index) => ({
          nozzleNumber: `GD-${index + 1}`,
          fuelTypeName: 'Green Diesel',
          unitName: 'Unit 3',
        })),
      ];

      await Promise.all(
        payload.map((item) =>
          tx.query(
            `
              INSERT INTO nozzles (tank_id, nozzle_number, unit_id)
              VALUES ($1, $2, $3)
              ON CONFLICT (nozzle_number) DO NOTHING
            `,
            [tankByFuelName.get(item.fuelTypeName), item.nozzleNumber, unitByName.get(item.unitName)]
          )
        )
      );
    }

    const { rows: customerCountRows } = await tx.query('SELECT COUNT(*)::int AS count FROM customers');
    const customerCount = customerCountRows[0]?.count ?? 0;

    if (customerCount === 0) {
      await Promise.all(
        defaultCustomers.map((customer) =>
          tx.query(
            `
              INSERT INTO customers (name, phone, vehicle_number, credit_limit, current_balance)
              VALUES ($1, $2, $3, $4, 0)
              ON CONFLICT DO NOTHING
            `,
            [customer.name, customer.phone, customer.vehicleNumber, customer.creditLimit]
          )
        )
      );
    }

    // Bring unit status in sync with open sessions.
    await tx.query(
      `
        UPDATE pump_units u
        SET
          status = 'available',
          assigned_to_user_id = NULL,
          updated_at = NOW()
        WHERE u.is_active = TRUE
          AND NOT EXISTS (
            SELECT 1
            FROM unit_sessions us
            WHERE us.unit_id = u.id AND us.status = 'open'
          )
      `
    );

    await tx.query(
      `
        UPDATE pump_units u
        SET
          status = 'occupied',
          assigned_to_user_id = us.pump_operator_id,
          updated_at = NOW()
        FROM unit_sessions us
        WHERE us.unit_id = u.id
          AND us.status = 'open'
          AND u.is_active = TRUE
      `
    );

    // Refresh nozzle latest readings based on last closed reading.
    await tx.query(
      `
        UPDATE nozzles n
        SET
          latest_reading = r.closing_reading,
          latest_reading_updated_at = r.closed_at,
          updated_at = NOW()
        FROM (
          SELECT DISTINCT ON (nozzle_id)
            nozzle_id,
            closing_reading,
            closed_at
          FROM unit_session_nozzle_readings
          WHERE closing_reading IS NOT NULL
          ORDER BY nozzle_id, closed_at DESC
        ) r
        WHERE r.nozzle_id = n.id
      `
    );
  });

  // Ensure default users exist (password hashing outside SQL transaction is fine).
  for (const userSeed of defaultUsers) {
    const passwordHash = await bcrypt.hash(userSeed.password, 10);

    await db.query(
      `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO NOTHING
      `,
      [userSeed.name, userSeed.email, passwordHash, userSeed.role]
    );
  }
};

