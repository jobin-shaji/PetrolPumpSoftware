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
  const [data, setData] = useState({ profit: null, openSessions: [], users: [], tanks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [profitResponse, openSessionsResponse, usersResponse, tanksResponse] = await Promise.all([
        api.get('/reports/profit'),
        api.get('/unit-session?status=open'),
        api.get('/users'),
        api.get('/tanks'),
      ]);

      setData({
        profit: profitResponse.data,
        openSessions: openSessionsResponse.data,
        users: usersResponse.data,
        tanks: tanksResponse.data,
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

  const tanksWithFill = useMemo(
    () =>
      data.tanks.map((tank) => {
        const capacity = Number(tank.capacity || 0);
        const currentLevel = Number(tank.currentLevel || 0);
        const fillPercent = capacity > 0 ? Math.max(0, Math.min(100, (currentLevel / capacity) * 100)) : 0;

        return {
          ...tank,
          fillPercent,
          capacity,
          currentLevel,
        };
      }),
    [data.tanks]
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

          <SectionCard
            title="Tank Fuel Levels"
            description="Live stock markers by tank, based on current stock versus capacity."
          >
            <div className="tank-marker-grid">
              {tanksWithFill.map((tank) => (
                <div key={tank._id} className="tank-marker-card">
                  <div className="tank-marker-header">
                    <strong>{tank.fuelType?.name || 'Fuel'}</strong>
                    <span>{tank.fillPercent.toFixed(0)}%</span>
                  </div>
                  <div className="tank-marker-body">
                    <div className="tank-tube" role="img" aria-label="Tank fill level marker">
                      <div className="tank-tube-fill" style={{ height: `${tank.fillPercent}%` }} />
                    </div>
                    <div className="tank-marker-values">
                      <span>Stock: {tank.currentLevel}</span>
                      <span>Capacity: {tank.capacity}</span>
                    </div>
                  </div>
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

