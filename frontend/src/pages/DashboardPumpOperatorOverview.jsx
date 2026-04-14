import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { hour12: true }) : '-';

const DashboardPumpOperatorOverview = () => {
  const [data, setData] = useState({ units: [], currentSession: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [unitsResponse, currentSessionResponse] = await Promise.all([
        api.get('/units'),
        api.get('/unit-session/current'),
      ]);

      setData({
        units: unitsResponse.data,
        currentSession: currentSessionResponse.data,
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

  const occupiedUnits = useMemo(
    () => data.units.filter((unit) => unit.status === 'occupied'),
    [data.units]
  );

  return (
    <Layout
      title="Dashboard"
      subtitle="See your current session status and unit availability."
    >
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <SectionCard
          title="Session Status"
          description="Units are locked automatically while your session is open."
        >
          <div className="metric-grid">
            <div className="metric-card">
              <span>Your Session</span>
              <strong>{data.currentSession ? 'Open' : 'Not started'}</strong>
            </div>
            <div className="metric-card">
              <span>Selected Unit</span>
              <strong>{data.currentSession?.unit?.name || 'No unit selected'}</strong>
            </div>
            <div className="metric-card">
              <span>Occupied Units</span>
              <strong>{occupiedUnits.length}</strong>
            </div>
            <div className="metric-card">
              <span>Started At</span>
              <strong>{formatDateTime(data.currentSession?.startTime)}</strong>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </Layout>
  );
};

export default DashboardPumpOperatorOverview;

