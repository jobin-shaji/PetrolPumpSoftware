import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Authorization token is required');
      error.statusCode = 401;
      throw error;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, isActive: true }).populate(
      'assignedUnit',
      'name'
    );

    if (!user) {
      const error = new Error('User not found or inactive');
      error.statusCode = 401;
      throw error;
    }

    req.user = user;
    next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
};

export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      const error = new Error('You do not have permission to perform this action');
      error.statusCode = 403;
      return next(error);
    }

    return next();
  };
