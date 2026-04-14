export const createHttpError = (message, statusCode = 500) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const mapId = (value) => {
  if (!value) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => mapId(item));
  }

  if (typeof value !== 'object') {
    return value;
  }

  const mapped = { ...value };

  if (mapped.id && mapped._id === undefined) {
    mapped._id = mapped.id;
  }

  Object.keys(mapped).forEach((key) => {
    mapped[key] = mapId(mapped[key]);
  });

  return mapped;
};

export const normalizeNumeric = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
};

export const normalizeBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return value;
};

export const isDatabaseErrorCode = (error, code) => error?.code === code;

export const handleUniqueViolation = (error, message) => {
  if (isDatabaseErrorCode(error, '23505')) {
    throw createHttpError(message, 400);
  }

  throw error;
};
