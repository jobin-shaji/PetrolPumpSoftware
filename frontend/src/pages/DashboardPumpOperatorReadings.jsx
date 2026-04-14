import { useEffect, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { hour12: true }) : '-';

const DashboardPumpOperatorReadings = () => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReadings = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/readings');
      setReadings(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load readings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReadings();
  }, []);

  return (
    <Layout title="Readings" subtitle="Sales recorded from your completed unit sessions.">
      {loading ? <div className="page-state">Loading readings...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <SectionCard title="Recent Readings" description="All readings from your closed sessions.">
          <DataTable
            rows={readings}
            columns={[
              { key: 'nozzle', label: 'Nozzle', render: (row) => row.nozzle?.nozzleNumber || '-' },
              { key: 'fuel', label: 'Fuel', render: (row) => row.nozzle?.tank?.fuelType?.name || '-' },
              { key: 'litresSold', label: 'Litres Sold' },
              {
                key: 'totalAmount',
                label: 'Amount',
                render: (row) => currencyFormatter.format(row.totalAmount || 0),
              },
              { key: 'shiftStartTime', label: 'Start Time', render: (row) => formatDateTime(row.shift?.startTime) },
              { key: 'shiftEndTime', label: 'End Time', render: (row) => formatDateTime(row.shift?.endTime) },
            ]}
            emptyMessage="No readings recorded yet."
          />
        </SectionCard>
      ) : null}
    </Layout>
  );
};

export default DashboardPumpOperatorReadings;

