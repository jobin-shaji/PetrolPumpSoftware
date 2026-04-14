import { useEffect, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { hour12: true }) : '-';

const DashboardManagerUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUnits = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/units');
      setUnits(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  return (
    <Layout title="Units" subtitle="Monitor unit availability and occupancy.">
      {loading ? <div className="page-state">Loading units...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <SectionCard
          title="Unit Availability"
          description="Pump operators choose units at session start, and units remain locked until session close."
        >
          <DataTable
            rows={units}
            columns={[
              { key: 'name', label: 'Unit' },
              { key: 'status', label: 'Status' },
              {
                key: 'assignedTo',
                label: 'Occupied By',
                render: (row) => row.assignedTo?.name || '-',
              },
              {
                key: 'activeSession',
                label: 'Session Started',
                render: (row) => formatDateTime(row.activeSession?.startTime),
              },
              {
                key: 'nozzles',
                label: 'Nozzles',
                render: (row) =>
                  row.nozzles?.length ? row.nozzles.map((n) => n.nozzleNumber).join(', ') : '-',
              },
            ]}
            emptyMessage="No units configured."
          />
        </SectionCard>
      ) : null}
    </Layout>
  );
};

export default DashboardManagerUnits;

