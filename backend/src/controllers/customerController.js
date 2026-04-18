import asyncHandler from '../utils/asyncHandler.js';
import {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
} from '../services/customerService.js';

export const listAll = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query;
  const filters = {};

  if (search) {
    filters.searchTerm = search;
  }

  if (isActive !== undefined) {
    filters.isActive = isActive === 'true';
  }

  const customers = await listCustomers(filters);
  res.json(customers);
});

export const getById = asyncHandler(async (req, res) => {
  const customer = await getCustomerById(req.params.id);

  if (!customer) {
    const error = new Error('Customer not found');
    error.statusCode = 404;
    throw error;
  }

  res.json(customer);
});

export const create = asyncHandler(async (req, res) => {
  const customer = await createCustomer(req.body);
  res.status(201).json(customer);
});

export const update = asyncHandler(async (req, res) => {
  const customer = await updateCustomer(req.params.id, req.body);
  res.json(customer);
});
