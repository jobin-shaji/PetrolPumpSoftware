export const roleLabelMap = {
  admin: 'Admin',
  manager: 'Manager',
  pumpOperator: 'Pump Operator',
};

export const getRoleLabel = (role) => roleLabelMap[role] || role || '-';
