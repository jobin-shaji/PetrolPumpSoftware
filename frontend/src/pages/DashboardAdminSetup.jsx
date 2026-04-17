import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import api from '../services/api.js';

const DashboardAdminSetup = () => {
  const [data, setData] = useState({
    fuelTypes: [],
    tanks: [],
    nozzles: [],
    units: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSetup = async () => {
    setLoading(true);
    setError('');

    try {
      const [fuelTypesResponse, tanksResponse, nozzlesResponse, unitsResponse] = await Promise.all([
        api.get('/fuel-types'),
        api.get('/tanks'),
        api.get('/nozzles'),
        api.get('/units'),
      ]);

      setData({
        fuelTypes: fuelTypesResponse.data,
        tanks: tanksResponse.data,
        nozzles: nozzlesResponse.data,
        units: unitsResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load setup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSetup();
  }, []);

  const fuelOptions = useMemo(
    () =>
      data.fuelTypes.map((fuelType) => ({
        label: fuelType.name,
        value: fuelType._id,
      })),
    [data.fuelTypes]
  );

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

  const nozzleOptions = useMemo(
    () =>
      data.nozzles.map((nozzle) => ({
        label: `${nozzle.nozzleNumber} (${nozzle.tank?.fuelType?.name || 'No fuel'})`,
        value: nozzle._id,
      })),
    [data.nozzles]
  );

  return (
    <Layout title="Setup" subtitle="Configure fuels, tanks, nozzles, and pump units.">
      {loading ? <div className="page-state">Loading setup...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <>
          <EntityManager
            title="Fuel Types"
            description="Keep the system configurable and avoid hardcoded fuels."
            endpoint="/fuel-types"
            items={data.fuelTypes}
            onRefresh={loadSetup}
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

          <EntityManager
            title="Tanks"
            description="Control tank fuel mapping, capacity, and system-updated stock levels."
            endpoint="/tanks"
            items={data.tanks}
            onRefresh={loadSetup}
            fields={[
              { name: 'fuelType', label: 'Fuel Type', type: 'select', options: fuelOptions },
              { name: 'capacity', label: 'Capacity', type: 'number' },
              { name: 'currentLevel', label: 'Current Stock Level', type: 'number' },
            ]}
            columns={[
              { key: 'fuelType', label: 'Fuel Type', render: (row) => row.fuelType?.name || '-' },
              { key: 'capacity', label: 'Capacity' },
              { key: 'currentLevel', label: 'Current Stock Level' },
            ]}
            mapItemToForm={(item) => ({
              fuelType: item.fuelType?._id || '',
              capacity: item.capacity ?? '',
              currentLevel: item.currentLevel ?? '',
            })}
          />

          <EntityManager
            title="Nozzles"
            description="Attach nozzles to tanks, optionally pin them to units, and view latest readings."
            endpoint="/nozzles"
            items={data.nozzles}
            onRefresh={loadSetup}
            fields={[
              { name: 'nozzleNumber', label: 'Nozzle Number' },
              { name: 'tank', label: 'Tank', type: 'select', options: tankOptions },
              { name: 'unit', label: 'Unit', type: 'select', optional: true, options: unitOptions },
            ]}
            columns={[
              { key: 'nozzleNumber', label: 'Nozzle' },
              { key: 'tank', label: 'Fuel', render: (row) => row.tank?.fuelType?.name || '-' },
              { key: 'latestReading', label: 'Latest Reading', render: (row) => row.latestReading ?? 0 },
              { key: 'unit', label: 'Unit', render: (row) => row.unit?.name || '-' },
            ]}
            mapItemToForm={(item) => ({
              nozzleNumber: item.nozzleNumber || '',
              tank: item.tank?._id || '',
              unit: item.unit?._id || '',
            })}
          />

          <EntityManager
            title="Pump Units"
            description="Configure unit/nozzle mapping and monitor live availability."
            endpoint="/units"
            items={data.units}
            onRefresh={loadSetup}
            fields={[
              { name: 'name', label: 'Unit Name' },
              { name: 'nozzleIds', label: 'Assigned Nozzles', type: 'multiselect', options: nozzleOptions },
            ]}
            columns={[
              { key: 'name', label: 'Unit' },
              { key: 'status', label: 'Status' },
              { key: 'assignedTo', label: 'Occupied By', render: (row) => row.assignedTo?.name || '-' },
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
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardAdminSetup;
