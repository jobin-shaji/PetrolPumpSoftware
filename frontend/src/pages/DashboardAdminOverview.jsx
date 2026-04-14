import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const DashboardAdminOverview = () => {
  const [data, setData] = useState({ profit: null, openSessions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [profitResponse, openSessionsResponse] = await Promise.all([
        api.get('/reports/profit'),
        api.get('/unit-session?status=open'),
      ]);

      setData({
        profit: profitResponse.data,
        openSessions: openSessionsResponse.data,
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

  return (
    <Layout title="Dashboard" subtitle="Quick snapshot of financials and open sessions.">
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
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
      ) : null}
    </Layout>
  );
};

export default DashboardAdminOverview;

