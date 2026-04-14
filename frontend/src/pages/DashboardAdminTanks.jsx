import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import api from '../services/api.js';

const DashboardAdminTanks = () => {
  const [data, setData] = useState({ fuelTypes: [], tanks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTanks = async () => {
    setLoading(true);
    setError('');

    try {
      const [fuelTypesResponse, tanksResponse] = await Promise.all([
        api.get('/fuel-types'),
        api.get('/tanks'),
      ]);

      setData({
        fuelTypes: fuelTypesResponse.data,
        tanks: tanksResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load tanks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTanks();
  }, []);

  const fuelOptions = useMemo(
    () =>
      data.fuelTypes.map((fuelType) => ({
        label: fuelType.name,
        value: fuelType._id,
      })),
    [data.fuelTypes]
  );

  return (
    <Layout title="Tanks" subtitle="Control tank fuel mapping, capacity, and current levels.">
      {loading ? <div className="page-state">Loading tanks...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <EntityManager
          title="Tanks"
          description="Control tank fuel mapping, capacity, and current levels."
          endpoint="/tanks"
          items={data.tanks}
          onRefresh={loadTanks}
          fields={[
            { name: 'fuelType', label: 'Fuel Type', type: 'select', options: fuelOptions },
            { name: 'capacity', label: 'Capacity', type: 'number' },
            { name: 'currentLevel', label: 'Current Level', type: 'number' },
          ]}
          columns={[
            {
              key: 'fuelType',
              label: 'Fuel Type',
              render: (row) => row.fuelType?.name || '-',
            },
            { key: 'capacity', label: 'Capacity' },
            { key: 'currentLevel', label: 'Current Level' },
          ]}
          mapItemToForm={(item) => ({
            fuelType: item.fuelType?._id || '',
            capacity: item.capacity ?? '',
            currentLevel: item.currentLevel ?? '',
          })}
        />
      ) : null}
    </Layout>
  );
};

export default DashboardAdminTanks;

