import { mapId, normalizeNumeric } from '../db/helpers.js';

const mapUserFromPrefix = (row, prefix) => {
  if (!row[`${prefix}Id`]) {
    return null;
  }

  return mapId({
    id: row[`${prefix}Id`],
    name: row[`${prefix}Name`],
    email: row[`${prefix}Email`],
    role: row[`${prefix}Role`],
    isActive: row[`${prefix}IsActive`],
    createdAt: row[`${prefix}CreatedAt`],
    updatedAt: row[`${prefix}UpdatedAt`],
  });
};

const mapFuelTypeFromPrefix = (row, prefix) => {
  if (!row[`${prefix}Id`]) {
    return null;
  }

  return mapId({
    id: row[`${prefix}Id`],
    name: row[`${prefix}Name`],
    description: row[`${prefix}Description`] || '',
    isActive: row[`${prefix}IsActive`],
    createdAt: row[`${prefix}CreatedAt`],
    updatedAt: row[`${prefix}UpdatedAt`],
  });
};

const mapTankFromPrefix = (row, prefix) => {
  if (!row[`${prefix}Id`]) {
    return null;
  }

  return mapId({
    id: row[`${prefix}Id`],
    capacity: normalizeNumeric(row[`${prefix}Capacity`]),
    currentLevel: normalizeNumeric(row[`${prefix}CurrentLevel`]),
    isActive: row[`${prefix}IsActive`],
    createdAt: row[`${prefix}CreatedAt`],
    updatedAt: row[`${prefix}UpdatedAt`],
    fuelType: mapFuelTypeFromPrefix(row, `${prefix}FuelType`),
  });
};

const mapUnitFromPrefix = (row, prefix) => {
  if (!row[`${prefix}Id`]) {
    return null;
  }

  return mapId({
    id: row[`${prefix}Id`],
    name: row[`${prefix}Name`],
    status: row[`${prefix}Status`],
    isActive: row[`${prefix}IsActive`],
    createdAt: row[`${prefix}CreatedAt`],
    updatedAt: row[`${prefix}UpdatedAt`],
  });
};

const mapNozzleFromPrefix = (row, prefix, options = {}) => {
  if (!row[`${prefix}Id`]) {
    return null;
  }

  const nozzle = mapId({
    id: row[`${prefix}Id`],
    nozzleNumber: row[`${prefix}NozzleNumber`],
    latestReading: normalizeNumeric(row[`${prefix}LatestReading`]),
    latestReadingUpdatedAt: row[`${prefix}LatestReadingUpdatedAt`],
    isActive: row[`${prefix}IsActive`],
    createdAt: row[`${prefix}CreatedAt`],
    updatedAt: row[`${prefix}UpdatedAt`],
  });

  if (options.includeTank) {
    nozzle.tank = mapTankFromPrefix(row, `${prefix}Tank`);
  }

  if (options.includeUnit) {
    nozzle.unit = mapUnitFromPrefix(row, `${prefix}Unit`);
  }

  return nozzle;
};

const mapShiftFromPrefix = (row, prefix) => {
  if (!row[`${prefix}Id`]) {
    return null;
  }

  return mapId({
    id: row[`${prefix}Id`],
    startTime: row[`${prefix}StartTime`],
    endTime: row[`${prefix}EndTime`],
    status: row[`${prefix}Status`],
    createdAt: row[`${prefix}CreatedAt`],
    updatedAt: row[`${prefix}UpdatedAt`],
    unit: mapUnitFromPrefix(row, `${prefix}Unit`),
    startedBy: mapUserFromPrefix(row, `${prefix}StartedBy`),
    endedBy: mapUserFromPrefix(row, `${prefix}EndedBy`),
  });
};

export const getUserRowById = async (db, userId) => {
  const { rows } = await db.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.password_hash AS "passwordHash",
        u.role,
        u.is_active AS "isActive",
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        (e.user_id IS NOT NULL) AS "isEmployee",
        e.is_active AS "employeeIsActive"
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );

  return rows[0] || null;
};

export const getActiveUserRowByEmail = async (db, email) => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        name,
        email,
        password_hash AS "passwordHash",
        role,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM users
      WHERE email = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [email]
  );

  return rows[0] || null;
};

export const mapUserRecord = (row) =>
  row
    ? mapId({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.isActive,
        isEmployee: Boolean(row.isEmployee),
        employeeIsActive:
          typeof row.employeeIsActive === 'boolean' ? row.employeeIsActive : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    : null;

export const listUsers = async (db, { activeOnly = true } = {}) => {
  const filters = [];
  const params = [];

  if (activeOnly) {
    filters.push('is_active = TRUE');
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await db.query(
    `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        u.is_active AS "isActive",
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        (e.user_id IS NOT NULL) AS "isEmployee",
        e.is_active AS "employeeIsActive"
      FROM users u
      LEFT JOIN employees e ON e.user_id = u.id
      ${whereClause.replace('is_active', 'u.is_active')}
      ORDER BY u.created_at DESC
    `,
    params
  );

  return rows.map((row) => mapUserRecord(row));
};

export const upsertEmployeeByUserId = async (db, userId, { isActive = true } = {}) => {
  const { rows } = await db.query(
    `
      INSERT INTO employees (user_id, is_active)
      VALUES ($1, $2::boolean)
      ON CONFLICT (user_id)
      DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()
      RETURNING id, user_id AS "userId", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [userId, isActive]
  );

  return rows[0] || null;
};

export const setEmployeeActiveByUserId = async (db, userId, isActive) => {
  const { rows } = await db.query(
    `
      UPDATE employees
      SET is_active = $2::boolean, updated_at = NOW()
      WHERE user_id = $1
      RETURNING id, user_id AS "userId", is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
    `,
    [userId, isActive]
  );

  return rows[0] || null;
};

export const getUserById = async (db, userId) => {
  const row = await getUserRowById(db, userId);
  return mapUserRecord(row);
};

export const listFuelTypes = async (db, { activeOnly = true } = {}) => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        name,
        description,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM fuel_types
      WHERE ($1::boolean = FALSE OR is_active = TRUE)
      ORDER BY name ASC
    `,
    [activeOnly]
  );

  return rows.map((row) =>
    mapId({
      id: row.id,
      name: row.name,
      description: row.description,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })
  );
};

export const getFuelTypeById = async (db, fuelTypeId) => {
  const { rows } = await db.query(
    `
      SELECT
        id,
        name,
        description,
        is_active AS "isActive",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM fuel_types
      WHERE id = $1
      LIMIT 1
    `,
    [fuelTypeId]
  );

  const row = rows[0];

  return row
    ? mapId({
        id: row.id,
        name: row.name,
        description: row.description,
        isActive: row.isActive,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      })
    : null;
};

export const listTanks = async (db, { activeOnly = true, ids = null } = {}) => {
  const params = [activeOnly];
  let whereClause = 'WHERE ($1::boolean = FALSE OR t.is_active = TRUE)';

  if (ids?.length) {
    params.push(ids);
    whereClause += ` AND t.id = ANY($${params.length}::uuid[])`;
  }

  const { rows } = await db.query(
    `
      SELECT
        t.id AS "tankId",
        t.capacity AS "tankCapacity",
        t.current_level AS "tankCurrentLevel",
        t.is_active AS "tankIsActive",
        t.created_at AS "tankCreatedAt",
        t.updated_at AS "tankUpdatedAt",
        ft.id AS "tankFuelTypeId",
        ft.name AS "tankFuelTypeName",
        ft.description AS "tankFuelTypeDescription",
        ft.is_active AS "tankFuelTypeIsActive",
        ft.created_at AS "tankFuelTypeCreatedAt",
        ft.updated_at AS "tankFuelTypeUpdatedAt"
      FROM tanks t
      JOIN fuel_types ft ON ft.id = t.fuel_type_id
      ${whereClause}
      ORDER BY t.created_at DESC
    `,
    params
  );

  return rows.map((row) => mapTankFromPrefix(row, 'tank'));
};

export const getTankById = async (db, tankId) => {
  const rows = await listTanks(db, { activeOnly: false, ids: [tankId] });
  return rows[0] || null;
};

export const listNozzles = async (db, { activeOnly = true, ids = null } = {}) => {
  const params = [activeOnly];
  let whereClause = 'WHERE ($1::boolean = FALSE OR n.is_active = TRUE)';

  if (ids?.length) {
    params.push(ids);
    whereClause += ` AND n.id = ANY($${params.length}::uuid[])`;
  }

  const { rows } = await db.query(
    `
      SELECT
        n.id AS "nozzleId",
        n.nozzle_number AS "nozzleNozzleNumber",
        n.latest_reading AS "nozzleLatestReading",
        n.latest_reading_updated_at AS "nozzleLatestReadingUpdatedAt",
        n.is_active AS "nozzleIsActive",
        n.created_at AS "nozzleCreatedAt",
        n.updated_at AS "nozzleUpdatedAt",
        t.id AS "nozzleTankId",
        t.capacity AS "nozzleTankCapacity",
        t.current_level AS "nozzleTankCurrentLevel",
        t.is_active AS "nozzleTankIsActive",
        t.created_at AS "nozzleTankCreatedAt",
        t.updated_at AS "nozzleTankUpdatedAt",
        ft.id AS "nozzleTankFuelTypeId",
        ft.name AS "nozzleTankFuelTypeName",
        ft.description AS "nozzleTankFuelTypeDescription",
        ft.is_active AS "nozzleTankFuelTypeIsActive",
        ft.created_at AS "nozzleTankFuelTypeCreatedAt",
        ft.updated_at AS "nozzleTankFuelTypeUpdatedAt",
        pu.id AS "nozzleUnitId",
        pu.name AS "nozzleUnitName",
        pu.status AS "nozzleUnitStatus",
        pu.is_active AS "nozzleUnitIsActive",
        pu.created_at AS "nozzleUnitCreatedAt",
        pu.updated_at AS "nozzleUnitUpdatedAt"
      FROM nozzles n
      JOIN tanks t ON t.id = n.tank_id
      JOIN fuel_types ft ON ft.id = t.fuel_type_id
      LEFT JOIN pump_units pu ON pu.id = n.unit_id
      ${whereClause}
      ORDER BY n.nozzle_number ASC
    `,
    params
  );

  return rows.map((row) => mapNozzleFromPrefix(row, 'nozzle', { includeTank: true, includeUnit: true }));
};

export const getNozzleById = async (db, nozzleId) => {
  const rows = await listNozzles(db, { activeOnly: false, ids: [nozzleId] });
  return rows[0] || null;
};

export const listUnits = async (db, { activeOnly = true, ids = null } = {}) => {
  const params = [activeOnly];
  let whereClause = 'WHERE ($1::boolean = FALSE OR u.is_active = TRUE)';

  if (ids?.length) {
    params.push(ids);
    whereClause += ` AND u.id = ANY($${params.length}::uuid[])`;
  }

  const { rows } = await db.query(
    `
      SELECT
        u.id,
        u.name,
        CASE WHEN us.id IS NULL THEN 'available' ELSE 'occupied' END AS status,
        u.is_active AS "isActive",
        u.created_at AS "createdAt",
        u.updated_at AS "updatedAt",
        au.id AS "assignedUserId",
        au.name AS "assignedUserName",
        au.email AS "assignedUserEmail",
        au.role AS "assignedUserRole",
        au.is_active AS "assignedUserIsActive",
        au.created_at AS "assignedUserCreatedAt",
        au.updated_at AS "assignedUserUpdatedAt",
        us.id AS "activeSessionId",
        us.start_time AS "activeSessionStartTime",
        us.end_time AS "activeSessionEndTime",
        us.status AS "activeSessionStatus",
        po.id AS "activeSessionPumpOperatorId",
        po.name AS "activeSessionPumpOperatorName",
        po.email AS "activeSessionPumpOperatorEmail",
        po.role AS "activeSessionPumpOperatorRole",
        po.is_active AS "activeSessionPumpOperatorIsActive",
        po.created_at AS "activeSessionPumpOperatorCreatedAt",
        po.updated_at AS "activeSessionPumpOperatorUpdatedAt"
      FROM pump_units u
      LEFT JOIN users au ON au.id = u.assigned_to_user_id
      LEFT JOIN unit_sessions us
        ON us.unit_id = u.id
       AND us.status = 'open'
      LEFT JOIN users po ON po.id = us.pump_operator_id
      ${whereClause}
      ORDER BY u.name ASC
    `,
    params
  );

  if (!rows.length) {
    return [];
  }

  const unitIds = rows.map((row) => row.id);
  const nozzles = await listNozzles(db, { activeOnly: true });
  const nozzlesByUnitId = new Map();

  nozzles
    .filter((nozzle) => nozzle.unit?._id && unitIds.includes(nozzle.unit._id))
    .forEach((nozzle) => {
      const existing = nozzlesByUnitId.get(nozzle.unit._id) || [];
      existing.push(nozzle);
      nozzlesByUnitId.set(nozzle.unit._id, existing);
    });

  return rows.map((row) =>
    mapId({
      id: row.id,
      name: row.name,
      status: row.status,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      assignedTo: mapUserFromPrefix(row, 'assignedUser'),
      activeSession: row.activeSessionId
        ? mapId({
            id: row.activeSessionId,
            startTime: row.activeSessionStartTime,
            endTime: row.activeSessionEndTime,
            status: row.activeSessionStatus,
            pumpOperator: mapUserFromPrefix(row, 'activeSessionPumpOperator'),
          })
        : null,
      nozzles: nozzlesByUnitId.get(row.id) || [],
    })
  );
};

export const getUnitById = async (db, unitId) => {
  const rows = await listUnits(db, { activeOnly: false, ids: [unitId] });
  return rows[0] || null;
};

export const listShifts = async (db, { status = null, unitId = null, startedByUserId = null } = {}) => {
  const params = [];
  const filters = [];

  if (status) {
    params.push(status);
    filters.push(`s.status = $${params.length}`);
  }

  if (unitId) {
    params.push(unitId);
    filters.push(`s.unit_id = $${params.length}`);
  }

  if (startedByUserId) {
    params.push(startedByUserId);
    filters.push(`s.started_by_user_id = $${params.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await db.query(
    `
      SELECT
        s.id AS "shiftId",
        s.start_time AS "shiftStartTime",
        s.end_time AS "shiftEndTime",
        s.status AS "shiftStatus",
        s.created_at AS "shiftCreatedAt",
        s.updated_at AS "shiftUpdatedAt",
        u.id AS "shiftUnitId",
        u.name AS "shiftUnitName",
        u.status AS "shiftUnitStatus",
        u.is_active AS "shiftUnitIsActive",
        u.created_at AS "shiftUnitCreatedAt",
        u.updated_at AS "shiftUnitUpdatedAt",
        sb.id AS "shiftStartedById",
        sb.name AS "shiftStartedByName",
        sb.email AS "shiftStartedByEmail",
        sb.role AS "shiftStartedByRole",
        sb.is_active AS "shiftStartedByIsActive",
        sb.created_at AS "shiftStartedByCreatedAt",
        sb.updated_at AS "shiftStartedByUpdatedAt",
        eb.id AS "shiftEndedById",
        eb.name AS "shiftEndedByName",
        eb.email AS "shiftEndedByEmail",
        eb.role AS "shiftEndedByRole",
        eb.is_active AS "shiftEndedByIsActive",
        eb.created_at AS "shiftEndedByCreatedAt",
        eb.updated_at AS "shiftEndedByUpdatedAt"
      FROM shifts s
      JOIN pump_units u ON u.id = s.unit_id
      JOIN users sb ON sb.id = s.started_by_user_id
      LEFT JOIN users eb ON eb.id = s.ended_by_user_id
      ${whereClause}
      ORDER BY s.start_time DESC
    `,
    params
  );

  return rows.map((row) => mapShiftFromPrefix(row, 'shift'));
};

export const listPurchases = async (db, { includeDeleted = false } = {}) => {
  const { rows } = await db.query(
    `
      SELECT
        p.id,
        p.quantity_litres AS "quantityLitres",
        p.price_per_litre AS "pricePerLitre",
        p.total_cost AS "totalCost",
        p.supplier,
        p.invoice_number AS "invoiceNumber",
        p.date,
        p.is_deleted AS "isDeleted",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        t.id AS "tankId",
        t.capacity AS "tankCapacity",
        t.current_level AS "tankCurrentLevel",
        t.is_active AS "tankIsActive",
        t.created_at AS "tankCreatedAt",
        t.updated_at AS "tankUpdatedAt",
        ft.id AS "tankFuelTypeId",
        ft.name AS "tankFuelTypeName",
        ft.description AS "tankFuelTypeDescription",
        ft.is_active AS "tankFuelTypeIsActive",
        ft.created_at AS "tankFuelTypeCreatedAt",
        ft.updated_at AS "tankFuelTypeUpdatedAt",
        eu.id AS "enteredById",
        eu.name AS "enteredByName",
        eu.email AS "enteredByEmail",
        eu.role AS "enteredByRole",
        eu.is_active AS "enteredByIsActive",
        eu.created_at AS "enteredByCreatedAt",
        eu.updated_at AS "enteredByUpdatedAt"
      FROM purchases p
      JOIN tanks t ON t.id = p.tank_id
      JOIN fuel_types ft ON ft.id = t.fuel_type_id
      JOIN users eu ON eu.id = p.entered_by_user_id
      WHERE ($1::boolean = TRUE OR p.is_deleted = FALSE)
      ORDER BY p.date DESC
    `,
    [includeDeleted]
  );

  return rows.map((row) =>
    mapId({
      id: row.id,
      quantityLitres: normalizeNumeric(row.quantityLitres),
      pricePerLitre: normalizeNumeric(row.pricePerLitre),
      totalCost: normalizeNumeric(row.totalCost),
      supplier: row.supplier,
      invoiceNumber: row.invoiceNumber,
      date: row.date,
      isDeleted: row.isDeleted,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tank: mapTankFromPrefix(row, 'tank'),
      enteredBy: mapUserFromPrefix(row, 'enteredBy'),
    })
  );
};

export const getPurchaseById = async (db, purchaseId) => {
  const { rows } = await db.query(
    `
      SELECT
        p.id,
        p.quantity_litres AS "quantityLitres",
        p.price_per_litre AS "pricePerLitre",
        p.total_cost AS "totalCost",
        p.supplier,
        p.invoice_number AS "invoiceNumber",
        p.date,
        p.is_deleted AS "isDeleted",
        p.created_at AS "createdAt",
        p.updated_at AS "updatedAt",
        t.id AS "tankId",
        t.capacity AS "tankCapacity",
        t.current_level AS "tankCurrentLevel",
        t.is_active AS "tankIsActive",
        t.created_at AS "tankCreatedAt",
        t.updated_at AS "tankUpdatedAt",
        ft.id AS "tankFuelTypeId",
        ft.name AS "tankFuelTypeName",
        ft.description AS "tankFuelTypeDescription",
        ft.is_active AS "tankFuelTypeIsActive",
        ft.created_at AS "tankFuelTypeCreatedAt",
        ft.updated_at AS "tankFuelTypeUpdatedAt",
        eu.id AS "enteredById",
        eu.name AS "enteredByName",
        eu.email AS "enteredByEmail",
        eu.role AS "enteredByRole",
        eu.is_active AS "enteredByIsActive",
        eu.created_at AS "enteredByCreatedAt",
        eu.updated_at AS "enteredByUpdatedAt"
      FROM purchases p
      JOIN tanks t ON t.id = p.tank_id
      JOIN fuel_types ft ON ft.id = t.fuel_type_id
      JOIN users eu ON eu.id = p.entered_by_user_id
      WHERE p.id = $1
      LIMIT 1
    `,
    [purchaseId]
  );

  const row = rows[0];

  return row
    ? mapId({
        id: row.id,
        quantityLitres: normalizeNumeric(row.quantityLitres),
        pricePerLitre: normalizeNumeric(row.pricePerLitre),
        totalCost: normalizeNumeric(row.totalCost),
        supplier: row.supplier,
        invoiceNumber: row.invoiceNumber,
        date: row.date,
        isDeleted: row.isDeleted,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        tank: mapTankFromPrefix(row, 'tank'),
        enteredBy: mapUserFromPrefix(row, 'enteredBy'),
      })
    : null;
};

const loadSessionReadingRows = async (db, sessionIds) => {
  if (!sessionIds.length) {
    return [];
  }

  const { rows } = await db.query(
    `
      SELECT
        r.id,
        r.unit_session_id AS "unitSessionId",
        r.opening_reading AS "openingReading",
        r.closing_reading AS "closingReading",
        r.price_per_litre AS "pricePerLitre",
        r.litres_sold AS "litresSold",
        r.total_amount AS "totalAmount",
        r.closed_at AS "closedAt",
        r.created_at AS "createdAt",
        r.updated_at AS "updatedAt",
        n.id AS "nozzleId",
        n.nozzle_number AS "nozzleNozzleNumber"
      FROM unit_session_nozzle_readings r
      JOIN nozzles n ON n.id = r.nozzle_id
      WHERE r.unit_session_id = ANY($1::uuid[])
      ORDER BY n.nozzle_number ASC
    `,
    [sessionIds]
  );

  return rows;
};

export const listUnitSessions = async (
  db,
  { status = null, unitId = null, pumpOperatorId = null, sessionId = null, limit = null } = {}
) => {
  const params = [];
  const filters = [];

  if (status) {
    params.push(status);
    filters.push(`us.status = $${params.length}`);
  }

  if (unitId) {
    params.push(unitId);
    filters.push(`us.unit_id = $${params.length}`);
  }

  if (pumpOperatorId) {
    params.push(pumpOperatorId);
    filters.push(`us.pump_operator_id = $${params.length}`);
  }

  if (sessionId) {
    params.push(sessionId);
    filters.push(`us.id = $${params.length}`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT ${Number(limit)}` : '';

  const { rows } = await db.query(
    `
      SELECT
        us.id,
        us.start_time AS "startTime",
        us.end_time AS "endTime",
        us.forced_close AS "forcedClose",
        us.close_reason AS "closeReason",
        us.status,
        us.created_at AS "createdAt",
        us.updated_at AS "updatedAt",
        u.id AS "unitId",
        u.name AS "unitName",
        u.status AS "unitStatus",
        u.is_active AS "unitIsActive",
        u.created_at AS "unitCreatedAt",
        u.updated_at AS "unitUpdatedAt",
        po.id AS "pumpOperatorId",
        po.name AS "pumpOperatorName",
        po.email AS "pumpOperatorEmail",
        po.role AS "pumpOperatorRole",
        po.is_active AS "pumpOperatorIsActive",
        po.created_at AS "pumpOperatorCreatedAt",
        po.updated_at AS "pumpOperatorUpdatedAt",
        eb.id AS "endedById",
        eb.name AS "endedByName",
        eb.email AS "endedByEmail",
        eb.role AS "endedByRole",
        eb.is_active AS "endedByIsActive",
        eb.created_at AS "endedByCreatedAt",
        eb.updated_at AS "endedByUpdatedAt",
        s.id AS "shiftId",
        s.start_time AS "shiftStartTime",
        s.end_time AS "shiftEndTime",
        s.status AS "shiftStatus",
        s.created_at AS "shiftCreatedAt",
        s.updated_at AS "shiftUpdatedAt",
        su.id AS "shiftUnitId",
        su.name AS "shiftUnitName",
        su.status AS "shiftUnitStatus",
        su.is_active AS "shiftUnitIsActive",
        su.created_at AS "shiftUnitCreatedAt",
        su.updated_at AS "shiftUnitUpdatedAt",
        sb.id AS "shiftStartedById",
        sb.name AS "shiftStartedByName",
        sb.email AS "shiftStartedByEmail",
        sb.role AS "shiftStartedByRole",
        sb.is_active AS "shiftStartedByIsActive",
        sb.created_at AS "shiftStartedByCreatedAt",
        sb.updated_at AS "shiftStartedByUpdatedAt",
        se.id AS "shiftEndedById",
        se.name AS "shiftEndedByName",
        se.email AS "shiftEndedByEmail",
        se.role AS "shiftEndedByRole",
        se.is_active AS "shiftEndedByIsActive",
        se.created_at AS "shiftEndedByCreatedAt",
        se.updated_at AS "shiftEndedByUpdatedAt"
      FROM unit_sessions us
      JOIN pump_units u ON u.id = us.unit_id
      JOIN users po ON po.id = us.pump_operator_id
      LEFT JOIN users eb ON eb.id = us.ended_by_user_id
      JOIN shifts s ON s.id = us.shift_id
      JOIN pump_units su ON su.id = s.unit_id
      JOIN users sb ON sb.id = s.started_by_user_id
      LEFT JOIN users se ON se.id = s.ended_by_user_id
      ${whereClause}
      ORDER BY us.start_time DESC
      ${limitClause}
    `,
    params
  );

  if (!rows.length) {
    return [];
  }

  const sessionIds = rows.map((row) => row.id);
  const readingRows = await loadSessionReadingRows(db, sessionIds);
  const readingsBySessionId = new Map();

  readingRows.forEach((row) => {
    const existing = readingsBySessionId.get(row.unitSessionId) || [];
    existing.push(row);
    readingsBySessionId.set(row.unitSessionId, existing);
  });

  return rows.map((row) => {
    const readings = readingsBySessionId.get(row.id) || [];

    return mapId({
      id: row.id,
      startTime: row.startTime,
      endTime: row.endTime,
      forcedClose: row.forcedClose,
      closeReason: row.closeReason,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      unit: mapUnitFromPrefix(row, 'unit'),
      pumpOperator: mapUserFromPrefix(row, 'pumpOperator'),
      endedBy: mapUserFromPrefix(row, 'endedBy'),
      shift: mapShiftFromPrefix(row, 'shift'),
      openingReadings: readings.map((reading) => ({
        nozzle: mapId({
          id: reading.nozzleId,
          nozzleNumber: reading.nozzleNozzleNumber,
        }),
        reading: normalizeNumeric(reading.openingReading),
      })),
      closingReadings: readings
        .filter((reading) => reading.closingReading !== null)
        .map((reading) => ({
          nozzle: mapId({
            id: reading.nozzleId,
            nozzleNumber: reading.nozzleNozzleNumber,
          }),
          reading: normalizeNumeric(reading.closingReading),
          pricePerLitre: normalizeNumeric(reading.pricePerLitre),
          litresSold: normalizeNumeric(reading.litresSold),
          totalAmount: normalizeNumeric(reading.totalAmount),
        })),
    });
  });
};

export const getUnitSessionById = async (db, sessionId) => {
  const rows = await listUnitSessions(db, { sessionId, limit: 1 });
  return rows[0] || null;
};

export const getCurrentUnitSessionByUserId = async (db, userId) => {
  const rows = await listUnitSessions(db, {
    pumpOperatorId: userId,
    status: 'open',
    limit: 1,
  });

  return rows[0] || null;
};

export const listReadings = async (db, { shiftId = null, nozzleId = null, pumpOperatorId = null } = {}) => {
  const params = [];
  const filters = ['r.closing_reading IS NOT NULL'];

  if (shiftId) {
    params.push(shiftId);
    filters.push(`us.shift_id = $${params.length}`);
  }

  if (nozzleId) {
    params.push(nozzleId);
    filters.push(`r.nozzle_id = $${params.length}`);
  }

  if (pumpOperatorId) {
    params.push(pumpOperatorId);
    filters.push(`us.pump_operator_id = $${params.length}`);
  }

  const { rows } = await db.query(
    `
      SELECT
        r.id,
        r.opening_reading AS "openingReading",
        r.closing_reading AS "closingReading",
        r.litres_sold AS "litresSold",
        r.price_per_litre AS "pricePerLitre",
        r.total_amount AS "totalAmount",
        r.closed_at AS "timestamp",
        n.id AS "nozzleId",
        n.nozzle_number AS "nozzleNozzleNumber",
        t.id AS "nozzleTankId",
        t.capacity AS "nozzleTankCapacity",
        t.current_level AS "nozzleTankCurrentLevel",
        t.is_active AS "nozzleTankIsActive",
        t.created_at AS "nozzleTankCreatedAt",
        t.updated_at AS "nozzleTankUpdatedAt",
        ft.id AS "nozzleTankFuelTypeId",
        ft.name AS "nozzleTankFuelTypeName",
        ft.description AS "nozzleTankFuelTypeDescription",
        ft.is_active AS "nozzleTankFuelTypeIsActive",
        ft.created_at AS "nozzleTankFuelTypeCreatedAt",
        ft.updated_at AS "nozzleTankFuelTypeUpdatedAt",
        s.id AS "shiftId",
        s.start_time AS "shiftStartTime",
        s.end_time AS "shiftEndTime",
        s.status AS "shiftStatus",
        s.created_at AS "shiftCreatedAt",
        s.updated_at AS "shiftUpdatedAt",
        u.id AS "shiftUnitId",
        u.name AS "shiftUnitName",
        u.status AS "shiftUnitStatus",
        u.is_active AS "shiftUnitIsActive",
        u.created_at AS "shiftUnitCreatedAt",
        u.updated_at AS "shiftUnitUpdatedAt",
        po.id AS "recordedById",
        po.name AS "recordedByName",
        po.email AS "recordedByEmail",
        po.role AS "recordedByRole",
        po.is_active AS "recordedByIsActive",
        po.created_at AS "recordedByCreatedAt",
        po.updated_at AS "recordedByUpdatedAt"
      FROM unit_session_nozzle_readings r
      JOIN unit_sessions us ON us.id = r.unit_session_id
      JOIN shifts s ON s.id = us.shift_id
      JOIN pump_units u ON u.id = s.unit_id
      JOIN users po ON po.id = us.pump_operator_id
      JOIN nozzles n ON n.id = r.nozzle_id
      JOIN tanks t ON t.id = n.tank_id
      JOIN fuel_types ft ON ft.id = t.fuel_type_id
      WHERE ${filters.join(' AND ')}
      ORDER BY r.closed_at DESC NULLS LAST, r.created_at DESC
    `,
    params
  );

  return rows.map((row) =>
    mapId({
      id: row.id,
      openingReading: normalizeNumeric(row.openingReading),
      closingReading: normalizeNumeric(row.closingReading),
      litresSold: normalizeNumeric(row.litresSold),
      pricePerLitre: normalizeNumeric(row.pricePerLitre),
      totalAmount: normalizeNumeric(row.totalAmount),
      timestamp: row.timestamp,
      nozzle: mapNozzleFromPrefix(row, 'nozzle', { includeTank: true }),
      shift: mapShiftFromPrefix(row, 'shift'),
      recordedBy: mapUserFromPrefix(row, 'recordedBy'),
    })
  );
};
