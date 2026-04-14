import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

const DashboardManagerOverview = () => {
  const [data, setData] = useState({ units: [], tanks: [], shifts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOverview = async () => {
    setLoading(true);
    setError('');

    try {
      const [unitsResponse, tanksResponse, shiftsResponse] = await Promise.all([
        api.get('/units'),
        api.get('/tanks'),
        api.get('/shifts?status=active'),
      ]);

      setData({
        units: unitsResponse.data,
        tanks: tanksResponse.data,
        shifts: shiftsResponse.data,
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
      subtitle="Monitor unit occupancy, active shifts, and stock coverage."
    >
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <SectionCard
          title="Operations Snapshot"
          description="Pump operators choose units at session start; units lock until session close."
        >
          <div className="metric-grid">
            <div className="metric-card">
              <span>Active Shifts</span>
              <strong>{data.shifts.length}</strong>
            </div>
            <div className="metric-card">
              <span>Occupied Units</span>
              <strong>{occupiedUnits.length}</strong>
            </div>
            <div className="metric-card">
              <span>Available Units</span>
              <strong>{data.units.length - occupiedUnits.length}</strong>
            </div>
            <div className="metric-card">
              <span>Tanks</span>
              <strong>{data.tanks.length}</strong>
            </div>
          </div>
        </SectionCard>
      ) : null}
    </Layout>
  );
};

export default DashboardManagerOverview;

