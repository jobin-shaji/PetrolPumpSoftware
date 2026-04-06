import bcrypt from 'bcryptjs';
import Assignment from '../models/Assignment.js';
import FuelType from '../models/FuelType.js';
import Nozzle from '../models/Nozzle.js';
import PumpUnit from '../models/PumpUnit.js';
import Tank from '../models/Tank.js';
import User from '../models/User.js';
import { refreshUnitNozzles } from './unitService.js';

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
    name: 'Default Pumper',
    email: 'pumper@pump.local',
    password: 'Pumper@123',
    role: 'pumper',
  },
];

export const ensureSeedData = async () => {
  const fuelCount = await FuelType.countDocuments();

  if (fuelCount === 0) {
    await FuelType.insertMany(defaultFuelTypes);
  }

  const fuelTypes = await FuelType.find({ isActive: true }).sort({ name: 1 });
  const tankCount = await Tank.countDocuments();

  if (tankCount === 0) {
    const tankPayload = fuelTypes.map((fuelType) => ({
      fuelType: fuelType._id,
      capacity: 10000,
      currentLevel: 5000,
    }));

    await Tank.insertMany(tankPayload);
  }

  const unitCount = await PumpUnit.countDocuments();

  if (unitCount === 0) {
    await PumpUnit.insertMany([
      { name: 'Unit 1' },
      { name: 'Unit 2' },
      { name: 'Unit 3' },
    ]);
  }

  const nozzleCount = await Nozzle.countDocuments();

  if (nozzleCount === 0) {
    const tanks = await Tank.find({ isActive: true }).populate('fuelType');
    const tankMap = Object.fromEntries(
      tanks.map((tank) => [tank.fuelType.name, tank._id.toString()])
    );
    const units = await PumpUnit.find({ isActive: true }).sort({ name: 1 });

    await Nozzle.insertMany([
      ...Array.from({ length: 4 }).map((_, index) => ({
        nozzleNumber: `M-${index + 1}`,
        tank: tankMap.Motospot,
        unit: units[0]?._id,
      })),
      ...Array.from({ length: 4 }).map((_, index) => ({
        nozzleNumber: `HSD-${index + 1}`,
        tank: tankMap['High Speed Diesel'],
        unit: units[1]?._id,
      })),
      ...Array.from({ length: 2 }).map((_, index) => ({
        nozzleNumber: `SP95-${index + 1}`,
        tank: tankMap.SP95,
        unit: units[2]?._id,
      })),
      ...Array.from({ length: 2 }).map((_, index) => ({
        nozzleNumber: `GD-${index + 1}`,
        tank: tankMap['Green Diesel'],
        unit: units[2]?._id,
      })),
    ]);
  }

  const units = await PumpUnit.find({ isActive: true });
  await Promise.all(units.map((unit) => refreshUnitNozzles(unit._id)));

  for (const userSeed of defaultUsers) {
    const existingUser = await User.findOne({ email: userSeed.email });

    if (!existingUser) {
      const passwordHash = await bcrypt.hash(userSeed.password, 10);
      await User.create({
        name: userSeed.name,
        email: userSeed.email,
        passwordHash,
        role: userSeed.role,
      });
    }
  }

  const defaultPumper = await User.findOne({ email: 'pumper@pump.local' });
  const unitOne = await PumpUnit.findOne({ name: 'Unit 1', isActive: true });

  if (defaultPumper && unitOne && !defaultPumper.assignedUnit) {
    defaultPumper.assignedUnit = unitOne._id;
    await defaultPumper.save();

    await Assignment.create({
      pumper: defaultPumper._id,
      unit: unitOne._id,
      assignedBy: defaultPumper._id,
    });
  }
};
