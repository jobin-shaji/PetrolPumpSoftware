import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';
import { getRoleLabel } from '../utils/roles.js';

const DashboardAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeActionError, setEmployeeActionError] = useState('');
  const [employeeActionUserId, setEmployeeActionUserId] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const [usersResponse, customersResponse] = await Promise.all([
        api.get('/users'),
        api.get('/customers'),
      ]);

      setUsers(usersResponse.data);
      setCustomers(customersResponse.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load users and customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleEmployeeStatus = async (user) => {
    setEmployeeActionError('');
    setEmployeeActionUserId(user._id);

    try {
      if (user.employeeIsActive) {
        await api.delete(`/users/${user._id}/employee`);
      } else {
        await api.post(`/users/${user._id}/employee`);
      }

      await loadUsers();
    } catch (requestError) {
      setEmployeeActionError(
        requestError.response?.data?.message || 'Failed to update employee status'
      );
    } finally {
      setEmployeeActionUserId('');
    }
  };

  const employees = useMemo(
    () => users.filter((user) => user.employeeIsActive),
    [users]
  );

  return (
    <Layout title="Users" subtitle="Create employees and manage their roles.">
      {loading ? <div className="page-state">Loading users...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={employeeActionError} variant="error" />

      {!loading ? (
        <>
          <EntityManager
            title="Users"
            description="Create employees and manage their roles."
            endpoint="/users"
            items={users}
            onRefresh={loadUsers}
            fields={[
              { name: 'name', label: 'Name' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'password', label: 'Password', type: 'password', optional: true },
              {
                name: 'role',
                label: 'Role',
                type: 'select',
                options: [
                  { label: 'Admin', value: 'admin' },
                  { label: 'Manager', value: 'manager' },
                  { label: 'Pump Operator', value: 'pumpOperator' },
                ],
              },
            ]}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              {
                key: 'role',
                label: 'Role',
                render: (row) => getRoleLabel(row.role),
              },
              {
                key: 'employee',
                label: 'Employee',
                render: (row) => (row.employeeIsActive ? 'Active' : 'No'),
              },
            ]}
            renderRowActions={(row) => (
              <button
                type="button"
                className="ghost-button small"
                onClick={() => toggleEmployeeStatus(row)}
                disabled={employeeActionUserId === row._id}
              >
                {employeeActionUserId === row._id
                  ? 'Saving...'
                  : row.employeeIsActive
                    ? 'Disable employee'
                    : 'Make employee'}
              </button>
            )}
            mapItemToForm={(item) => ({
              name: item.name || '',
              email: item.email || '',
              password: '',
              role: item.role || '',
            })}
          />

          <SectionCard title="Employees" description="Active employee profiles.">
            <DataTable
              rows={employees}
              emptyMessage="No active employees found."
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                {
                  key: 'role',
                  label: 'Role',
                  render: (row) => getRoleLabel(row.role),
                },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Customers"
            description="Credit customers available for exception-based sales."
          >
            <DataTable
              rows={customers}
              emptyMessage="No customers found."
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'phone', label: 'Phone', render: (row) => row.phone || '-' },
                {
                  key: 'vehicleNumber',
                  label: 'Vehicle',
                  render: (row) => row.vehicleNumber || '-',
                },
                {
                  key: 'creditLimit',
                  label: 'Credit Limit',
                  render: (row) =>
                    new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 2,
                    }).format(row.creditLimit || 0),
                },
                {
                  key: 'currentBalance',
                  label: 'Balance',
                  render: (row) =>
                    new Intl.NumberFormat('en-IN', {
                      style: 'currency',
                      currency: 'INR',
                      maximumFractionDigits: 2,
                    }).format(row.currentBalance || 0),
                },
              ]}
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardAdminUsers;

