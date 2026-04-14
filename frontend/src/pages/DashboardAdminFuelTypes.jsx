import { useEffect, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import api from '../services/api.js';

const DashboardAdminFuelTypes = () => {
  const [fuelTypes, setFuelTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFuelTypes = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/fuel-types');
      setFuelTypes(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load fuel types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFuelTypes();
  }, []);

  return (
    <Layout title="Fuel Types" subtitle="Keep the system configurable and avoid hardcoded fuels.">
      {loading ? <div className="page-state">Loading fuel types...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <EntityManager
          title="Fuel Types"
          description="Keep the system configurable and avoid hardcoded fuels."
          endpoint="/fuel-types"
          items={fuelTypes}
          onRefresh={loadFuelTypes}
          fields={[
            { name: 'name', label: 'Fuel Name' },
            { name: 'description', label: 'Description', type: 'textarea', optional: true },
          ]}
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'description', label: 'Description' },
          ]}
          mapItemToForm={(item) => ({
            name: item.name || '',
            description: item.description || '',
          })}
        />
      ) : null}
    </Layout>
  );
};

export default DashboardAdminFuelTypes;

