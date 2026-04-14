import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import api from '../services/api.js';

const DashboardAdminNozzles = () => {
  const [data, setData] = useState({ tanks: [], nozzles: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNozzles = async () => {
    setLoading(true);
    setError('');

    try {
      const [tanksResponse, nozzlesResponse, unitsResponse] = await Promise.all([
        api.get('/tanks'),
        api.get('/nozzles'),
        api.get('/units'),
      ]);

      setData({
        tanks: tanksResponse.data,
        nozzles: nozzlesResponse.data,
        units: unitsResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load nozzles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNozzles();
  }, []);

  const tankOptions = useMemo(
    () =>
      data.tanks.map((tank) => ({
        label: `${tank.fuelType?.name || 'Unknown'} tank`,
        value: tank._id,
      })),
    [data.tanks]
  );

  const unitOptions = useMemo(
    () =>
      data.units.map((unit) => ({
        label: unit.name,
        value: unit._id,
      })),
    [data.units]
  );

  return (
    <Layout
      title="Nozzles"
      subtitle="Attach nozzles to tanks, optionally pin them to units, and view the latest recorded reading."
    >
      {loading ? <div className="page-state">Loading nozzles...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <EntityManager
          title="Nozzles"
          description="Attach nozzles to tanks, optionally pin them to units, and view the latest recorded reading."
          endpoint="/nozzles"
          items={data.nozzles}
          onRefresh={loadNozzles}
          fields={[
            { name: 'nozzleNumber', label: 'Nozzle Number' },
            { name: 'tank', label: 'Tank', type: 'select', options: tankOptions },
            {
              name: 'unit',
              label: 'Unit',
              type: 'select',
              optional: true,
              options: unitOptions,
            },
          ]}
          columns={[
            { key: 'nozzleNumber', label: 'Nozzle' },
            {
              key: 'tank',
              label: 'Fuel',
              render: (row) => row.tank?.fuelType?.name || '-',
            },
            {
              key: 'latestReading',
              label: 'Latest Reading',
              render: (row) => row.latestReading ?? 0,
            },
            {
              key: 'unit',
              label: 'Unit',
              render: (row) => row.unit?.name || '-',
            },
          ]}
          mapItemToForm={(item) => ({
            nozzleNumber: item.nozzleNumber || '',
            tank: item.tank?._id || '',
            unit: item.unit?._id || '',
          })}
        />
      ) : null}
    </Layout>
  );
};

export default DashboardAdminNozzles;

