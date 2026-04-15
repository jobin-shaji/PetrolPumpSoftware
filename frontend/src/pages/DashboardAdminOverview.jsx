import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';
import { getRoleLabel } from '../utils/roles.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const DashboardAdminOverview = () => {
  const [data, setData] = useState({ profit: null, openSessions: [], users: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [profitResponse, openSessionsResponse, usersResponse] = await Promise.all([
        api.get('/reports/profit'),
        api.get('/unit-session?status=open'),
        api.get('/users'),
      ]);

      setData({
        profit: profitResponse.data,
        openSessions: openSessionsResponse.data,
        users: usersResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load dashboard overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: 'Revenue',
        value: currencyFormatter.format(data.profit?.revenue || 0),
      },
      {
        label: 'Cost',
        value: currencyFormatter.format(data.profit?.cost || 0),
      },
      {
        label: 'Profit',
        value: currencyFormatter.format(data.profit?.profit || 0),
      },
      {
        label: 'Open Sessions',
        value: data.openSessions.length,
      },
    ],
    [data.openSessions.length, data.profit]
  );

  const employees = useMemo(
    () => data.users.filter((user) => user.employeeIsActive),
    [data.users]
  );

  return (
    <Layout title="Dashboard" subtitle="Quick snapshot of financials and open sessions.">
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <>
          <SectionCard
            title="Business Snapshot"
            description="Calculated from purchases and session-closing sales records."
          >
            <div className="metric-grid">
              {metrics.map((metric) => (
                <div key={metric.label} className="metric-card">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Employees" description="Active employee profiles in the system.">
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
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardAdminOverview;

