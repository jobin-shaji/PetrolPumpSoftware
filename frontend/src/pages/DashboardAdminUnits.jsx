import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import api from '../services/api.js';

const DashboardAdminUnits = () => {
  const [data, setData] = useState({ nozzles: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUnits = async () => {
    setLoading(true);
    setError('');

    try {
      const [nozzlesResponse, unitsResponse] = await Promise.all([
        api.get('/nozzles'),
        api.get('/units'),
      ]);

      setData({
        nozzles: nozzlesResponse.data,
        units: unitsResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load units');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnits();
  }, []);

  const nozzleOptions = useMemo(
    () =>
      data.nozzles.map((nozzle) => ({
        label: `${nozzle.nozzleNumber} (${nozzle.tank?.fuelType?.name || 'No fuel'})`,
        value: nozzle._id,
      })),
    [data.nozzles]
  );

  return (
    <Layout
      title="Pump Units"
      subtitle="Configure unit/nozzle mapping and monitor live availability."
    >
      {loading ? <div className="page-state">Loading units...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <EntityManager
          title="Pump Units"
          description="Units expose live availability and current session ownership."
          endpoint="/units"
          items={data.units}
          onRefresh={loadUnits}
          fields={[
            { name: 'name', label: 'Unit Name' },
            { name: 'nozzleIds', label: 'Assigned Nozzles', type: 'multiselect', options: nozzleOptions },
          ]}
          columns={[
            { key: 'name', label: 'Unit' },
            { key: 'status', label: 'Status' },
            {
              key: 'assignedTo',
              label: 'Occupied By',
              render: (row) => row.assignedTo?.name || '-',
            },
            {
              key: 'nozzles',
              label: 'Nozzles',
              render: (row) =>
                row.nozzles?.length ? row.nozzles.map((n) => n.nozzleNumber).join(', ') : '-',
            },
          ]}
          mapItemToForm={(item) => ({
            name: item.name || '',
            nozzleIds: item.nozzles?.map((nozzle) => nozzle._id) || [],
          })}
        />
      ) : null}
    </Layout>
  );
};

export default DashboardAdminUnits;

