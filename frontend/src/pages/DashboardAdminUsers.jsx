import { useEffect, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import api from '../services/api.js';
import { getRoleLabel } from '../utils/roles.js';

const DashboardAdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <Layout title="Users" subtitle="Create employees and manage their roles.">
      {loading ? <div className="page-state">Loading users...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
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
          ]}
          mapItemToForm={(item) => ({
            name: item.name || '',
            email: item.email || '',
            password: '',
            role: item.role || '',
          })}
        />
      ) : null}
    </Layout>
  );
};

export default DashboardAdminUsers;

