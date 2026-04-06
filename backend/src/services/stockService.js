import Tank from '../models/Tank.js';

export const increaseTankLevel = async (tankId, quantity) => {
  const tank = await Tank.findOne({ _id: tankId, isActive: true }).populate('fuelType');

  if (!tank) {
    const error = new Error('Tank not found');
    error.statusCode = 404;
    throw error;
  }

  const newLevel = tank.currentLevel + quantity;

  if (newLevel > tank.capacity) {
    const error = new Error(
      `Tank overflow prevented for ${tank.fuelType?.name || 'selected fuel'}`
    );
    error.statusCode = 400;
    throw error;
  }

  tank.currentLevel = newLevel;
  await tank.save();
  return tank;
};

export const decreaseTankLevel = async (tankId, quantity) => {
  const tank = await Tank.findOne({ _id: tankId, isActive: true }).populate('fuelType');

  if (!tank) {
    const error = new Error('Tank not found');
    error.statusCode = 404;
    throw error;
  }

  const newLevel = tank.currentLevel - quantity;

  if (newLevel < 0) {
    const error = new Error(
      `Insufficient stock in ${tank.fuelType?.name || 'selected tank'}`
    );
    error.statusCode = 400;
    throw error;
  }

  tank.currentLevel = newLevel;
  await tank.save();
  return tank;
};
