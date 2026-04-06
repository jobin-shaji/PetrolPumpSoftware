import Purchase from '../models/Purchase.js';
import NozzleReading from '../models/NozzleReading.js';

export const parseDateRange = (query) => {
  const { date, startDate, endDate } = query;

  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  const start = startDate ? new Date(startDate) : new Date('1970-01-01');
  const end = endDate ? new Date(endDate) : new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

export const getProfitSummary = async (query) => {
  const { start, end } = parseDateRange(query);

  const [sales, purchases] = await Promise.all([
    NozzleReading.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          litresSold: { $sum: '$litresSold' },
        },
      },
    ]),
    Purchase.aggregate([
      {
        $match: {
          isDeleted: false,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          cost: { $sum: '$totalCost' },
          litresPurchased: { $sum: '$quantityLitres' },
        },
      },
    ]),
  ]);

  const revenue = sales[0]?.revenue || 0;
  const cost = purchases[0]?.cost || 0;

  return {
    range: { start, end },
    revenue,
    cost,
    profit: revenue - cost,
    litresSold: sales[0]?.litresSold || 0,
    litresPurchased: purchases[0]?.litresPurchased || 0,
  };
};

export const getDailyReport = async (query) => {
  const { start, end } = parseDateRange(query);

  const [sales, purchases] = await Promise.all([
    NozzleReading.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
          },
          revenue: { $sum: '$totalAmount' },
          litresSold: { $sum: '$litresSold' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Purchase.aggregate([
      {
        $match: {
          isDeleted: false,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' },
          },
          cost: { $sum: '$totalCost' },
          litresPurchased: { $sum: '$quantityLitres' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const dailyMap = new Map();

  sales.forEach((entry) => {
    dailyMap.set(entry._id, {
      date: entry._id,
      revenue: entry.revenue,
      cost: 0,
      profit: entry.revenue,
      litresSold: entry.litresSold,
      litresPurchased: 0,
    });
  });

  purchases.forEach((entry) => {
    const existing = dailyMap.get(entry._id) || {
      date: entry._id,
      revenue: 0,
      cost: 0,
      profit: 0,
      litresSold: 0,
      litresPurchased: 0,
    };

    existing.cost = entry.cost;
    existing.litresPurchased = entry.litresPurchased;
    existing.profit = existing.revenue - existing.cost;
    dailyMap.set(entry._id, existing);
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
};

export const getFuelWiseReport = async (query) => {
  const { start, end } = parseDateRange(query);

  const [sales, purchases] = await Promise.all([
    NozzleReading.aggregate([
      {
        $match: {
          timestamp: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: 'nozzles',
          localField: 'nozzle',
          foreignField: '_id',
          as: 'nozzle',
        },
      },
      { $unwind: '$nozzle' },
      {
        $lookup: {
          from: 'tanks',
          localField: 'nozzle.tank',
          foreignField: '_id',
          as: 'tank',
        },
      },
      { $unwind: '$tank' },
      {
        $lookup: {
          from: 'fueltypes',
          localField: 'tank.fuelType',
          foreignField: '_id',
          as: 'fuelType',
        },
      },
      { $unwind: '$fuelType' },
      {
        $group: {
          _id: '$fuelType.name',
          revenue: { $sum: '$totalAmount' },
          litresSold: { $sum: '$litresSold' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Purchase.aggregate([
      {
        $match: {
          isDeleted: false,
          date: { $gte: start, $lte: end },
        },
      },
      {
        $lookup: {
          from: 'tanks',
          localField: 'tank',
          foreignField: '_id',
          as: 'tank',
        },
      },
      { $unwind: '$tank' },
      {
        $lookup: {
          from: 'fueltypes',
          localField: 'tank.fuelType',
          foreignField: '_id',
          as: 'fuelType',
        },
      },
      { $unwind: '$fuelType' },
      {
        $group: {
          _id: '$fuelType.name',
          cost: { $sum: '$totalCost' },
          litresPurchased: { $sum: '$quantityLitres' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const fuelMap = new Map();

  sales.forEach((entry) => {
    fuelMap.set(entry._id, {
      fuelType: entry._id,
      revenue: entry.revenue,
      cost: 0,
      profit: entry.revenue,
      litresSold: entry.litresSold,
      litresPurchased: 0,
    });
  });

  purchases.forEach((entry) => {
    const existing = fuelMap.get(entry._id) || {
      fuelType: entry._id,
      revenue: 0,
      cost: 0,
      profit: 0,
      litresSold: 0,
      litresPurchased: 0,
    };

    existing.cost = entry.cost;
    existing.litresPurchased = entry.litresPurchased;
    existing.profit = existing.revenue - existing.cost;
    fuelMap.set(entry._id, existing);
  });

  return Array.from(fuelMap.values()).sort((a, b) =>
    a.fuelType.localeCompare(b.fuelType)
  );
};
