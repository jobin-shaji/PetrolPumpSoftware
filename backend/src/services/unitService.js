import Nozzle from '../models/Nozzle.js';
import PumpUnit from '../models/PumpUnit.js';

const normalizeIds = (items = []) => [...new Set(items.map((item) => item.toString()))];

export const refreshUnitNozzles = async (unitId) => {
  if (!unitId) {
    return;
  }

  const nozzles = await Nozzle.find({ unit: unitId, isActive: true }).select('_id');
  await PumpUnit.findByIdAndUpdate(unitId, {
    nozzles: nozzles.map((item) => item._id),
  });
};

export const assignNozzlesToUnit = async (unitId, nozzleIds = []) => {
  const normalizedIds = normalizeIds(nozzleIds);
  const unit = await PumpUnit.findOne({ _id: unitId, isActive: true });

  if (!unit) {
    const error = new Error('Pump unit not found');
    error.statusCode = 404;
    throw error;
  }

  if (normalizedIds.length) {
    const nozzles = await Nozzle.find({
      _id: { $in: normalizedIds },
      isActive: true,
    });

    if (nozzles.length !== normalizedIds.length) {
      const error = new Error('One or more nozzles are invalid');
      error.statusCode = 400;
      throw error;
    }

    const previousUnitIds = normalizeIds(
      nozzles.filter((item) => item.unit).map((item) => item.unit)
    );

    await Nozzle.updateMany(
      {
        unit: unitId,
        _id: { $nin: normalizedIds },
      },
      {
        $set: { unit: null },
      }
    );

    await Nozzle.updateMany(
      {
        _id: { $in: normalizedIds },
      },
      {
        $set: { unit: unitId },
      }
    );

    const unitIdsToRefresh = normalizeIds([unitId, ...previousUnitIds]);
    await Promise.all(unitIdsToRefresh.map((item) => refreshUnitNozzles(item)));
    return;
  }

  await Nozzle.updateMany({ unit: unitId }, { $set: { unit: null } });
  await refreshUnitNozzles(unitId);
};

export const clearUnitNozzles = async (unitId) => {
  await Nozzle.updateMany({ unit: unitId }, { $set: { unit: null } });
  await refreshUnitNozzles(unitId);
};
