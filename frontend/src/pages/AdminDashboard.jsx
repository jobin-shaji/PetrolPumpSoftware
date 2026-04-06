import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import EntityManager from '../components/EntityManager.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';
import { getRoleLabel } from '../utils/roles.js';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { hour12: true }) : '-';

const buildForceCloseRows = (session) =>
  (session?.openingReadings || []).map((item) => ({
    nozzleId: item.nozzle?._id || item.nozzle,
    nozzleNumber: item.nozzle?.nozzleNumber || 'Nozzle',
    openingReading: item.reading,
    closingReading: '',
    pricePerLitre: '',
  }));

const AdminDashboard = () => {
  const [data, setData] = useState({
    users: [],
    fuelTypes: [],
    tanks: [],
    nozzles: [],
    units: [],
    openSessions: [],
    profit: null,
    daily: [],
    fuel: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [forceCloseRows, setForceCloseRows] = useState([]);
  const [closeReason, setCloseReason] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [
        usersResponse,
        fuelTypesResponse,
        tanksResponse,
        nozzlesResponse,
        unitsResponse,
        openSessionsResponse,
        profitResponse,
        dailyResponse,
        fuelResponse,
      ] = await Promise.all([
        api.get('/users'),
        api.get('/fuel-types'),
        api.get('/tanks'),
        api.get('/nozzles'),
        api.get('/units'),
        api.get('/unit-session?status=open'),
        api.get('/reports/profit'),
        api.get('/reports/daily'),
        api.get('/reports/fuel'),
      ]);

      setData({
        users: usersResponse.data,
        fuelTypes: fuelTypesResponse.data,
        tanks: tanksResponse.data,
        nozzles: nozzlesResponse.data,
        units: unitsResponse.data,
        openSessions: openSessionsResponse.data,
        profit: profitResponse.data,
        daily: dailyResponse.data,
        fuel: fuelResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const fuelOptions = data.fuelTypes.map((fuelType) => ({
    label: fuelType.name,
    value: fuelType._id,
  }));

  const tankOptions = data.tanks.map((tank) => ({
    label: `${tank.fuelType?.name || 'Unknown'} tank`,
    value: tank._id,
  }));

  const unitOptions = data.units.map((unit) => ({
    label: unit.name,
    value: unit._id,
  }));

  const nozzleOptions = data.nozzles.map((nozzle) => ({
    label: `${nozzle.nozzleNumber} (${nozzle.tank?.fuelType?.name || 'No fuel'})`,
    value: nozzle._id,
  }));

  const metrics = [
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
  ];

  const occupiedUnits = useMemo(
    () => data.units.filter((unit) => unit.status === 'occupied'),
    [data.units]
  );

  const salesReportRows = useMemo(
    () =>
      data.fuel.map((item) => ({
        fuelType: item.fuelType,
        totalSales: item.revenue || 0,
        litresSold: item.litresSold || 0,
      })),
    [data.fuel]
  );

  const purchaseReportRows = useMemo(
    () =>
      data.fuel.map((item) => ({
        fuelType: item.fuelType,
        totalPurchase: item.cost || 0,
        litresPurchased: item.litresPurchased || 0,
      })),
    [data.fuel]
  );

  const prepareForceClose = (session) => {
    setSelectedSession(session);
    setForceCloseRows(buildForceCloseRows(session));
    setCloseReason('Force closed by admin');
    setMessage('');
    setError('');
  };

  const handleForceCloseRowChange = (nozzleId, field, value) => {
    setForceCloseRows((current) =>
      current.map((row) =>
        row.nozzleId === nozzleId
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const handleForceCloseSubmit = async (event) => {
    event.preventDefault();

    if (!selectedSession) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await api.post(`/unit-session/${selectedSession._id}/force-close`, {
        closeReason,
        closingReadings: forceCloseRows.map((row) => ({
          nozzleId: row.nozzleId,
          reading: row.closingReading,
          pricePerLitre: row.pricePerLitre,
        })),
      });

      setSelectedSession(null);
      setForceCloseRows([]);
      setCloseReason('');
      setMessage('Open session force closed successfully.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to force close the session');
    }
  };

  return (
    <Layout
      title="Admin Dashboard"
      subtitle="Manage employees, pump structure, reports, and live unit sessions."
    >
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
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

          <EntityManager
            title="Users"
            description="Create employees and manage their roles."
            endpoint="/users"
            items={data.users}
            onRefresh={loadDashboard}
            fields={[
              { name: 'name', label: 'Name' },
              { name: 'email', label: 'Email', type: 'email' },
              { name: 'password', label: 'Password', type: 'password', optional: true },
              {
                name: 'role',
                label: 'Role',
                type: 'select',
                options: [
                  { label: 'Admin', value: 'admin' },
                  { label: 'Manager', value: 'manager' },
                  { label: 'Pump Operator', value: 'pumpOperator' },
                ],
              },
            ]}
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              {
                key: 'role',
                label: 'Role',
                render: (row) => getRoleLabel(row.role),
              },
            ]}
            mapItemToForm={(item) => ({
              name: item.name || '',
              email: item.email || '',
              password: '',
              role: item.role || '',
            })}
          />

          <EntityManager
            title="Fuel Types"
            description="Keep the system configurable and avoid hardcoded fuels."
            endpoint="/fuel-types"
            items={data.fuelTypes}
            onRefresh={loadDashboard}
            fields={[
              { name: 'name', label: 'Fuel Name' },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                optional: true,
              },
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
            description="Control tank fuel mapping, capacity, and current levels."
            endpoint="/tanks"
            items={data.tanks}
            onRefresh={loadDashboard}
            fields={[
              {
                name: 'fuelType',
                label: 'Fuel Type',
                type: 'select',
                options: fuelOptions,
              },
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

          <EntityManager
            title="Nozzles"
            description="Attach nozzles to tanks, optionally pin them to units, and view the latest recorded reading."
            endpoint="/nozzles"
            items={data.nozzles}
            onRefresh={loadDashboard}
            fields={[
              { name: 'nozzleNumber', label: 'Nozzle Number' },
              {
                name: 'tank',
                label: 'Tank',
                type: 'select',
                options: tankOptions,
              },
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

          <EntityManager
            title="Pump Units"
            description="Units now expose live availability and current session ownership."
            endpoint="/units"
            items={data.units}
            onRefresh={loadDashboard}
            fields={[
              { name: 'name', label: 'Unit Name' },
              {
                name: 'nozzleIds',
                label: 'Assigned Nozzles',
                type: 'multiselect',
                options: nozzleOptions,
              },
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
                  row.nozzles?.length
                    ? row.nozzles.map((nozzle) => nozzle.nozzleNumber).join(', ')
                    : '-',
              },
            ]}
            mapItemToForm={(item) => ({
              name: item.name || '',
              nozzleIds: item.nozzles?.map((nozzle) => nozzle._id) || [],
            })}
          />

          <SectionCard
            title="Live Unit Sessions"
            description="Monitor occupied units and force close when operations need an admin override."
          >
            <DataTable
              rows={data.openSessions}
              columns={[
                {
                  key: 'unit',
                  label: 'Unit',
                  render: (row) => row.unit?.name || '-',
                },
                {
                  key: 'pumpOperator',
                  label: 'Pump Operator',
                  render: (row) => row.pumpOperator?.name || '-',
                },
                {
                  key: 'startTime',
                  label: 'Started',
                  render: (row) => formatDateTime(row.startTime),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (row) => (
                    <button
                      type="button"
                      className="danger-button small"
                      onClick={() => prepareForceClose(row)}
                    >
                      Force Close
                    </button>
                  ),
                },
              ]}
              emptyMessage="No open unit sessions."
            />
          </SectionCard>

          {selectedSession ? (
            <SectionCard
              title="Force Close Session"
              description={`Closing ${selectedSession.unit?.name || 'selected unit'} for ${selectedSession.pumpOperator?.name || 'selected pump operator'}.`}
              actions={
                <button
                  type="button"
                  className="ghost-button small"
                  onClick={() => {
                    setSelectedSession(null);
                    setForceCloseRows([]);
                    setCloseReason('');
                  }}
                >
                  Cancel
                </button>
              }
            >
              <form className="entity-form" onSubmit={handleForceCloseSubmit}>
                <div className="form-grid">
                  <label className="form-field">
                    <span>Close Reason</span>
                    <input
                      type="text"
                      value={closeReason}
                      onChange={(event) => setCloseReason(event.target.value)}
                    />
                  </label>
                </div>

                <div className="reading-stack">
                  {forceCloseRows.map((row) => (
                    <div key={row.nozzleId} className="reading-row">
                      <div className="reading-meta">
                        <strong>{row.nozzleNumber}</strong>
                        <span>Opening: {row.openingReading}</span>
                      </div>
                      <label className="form-field">
                        <span>Closing Reading</span>
                        <input
                          type="number"
                          value={row.closingReading}
                          onChange={(event) =>
                            handleForceCloseRowChange(
                              row.nozzleId,
                              'closingReading',
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span>Price Per Litre</span>
                        <input
                          type="number"
                          value={row.pricePerLitre}
                          onChange={(event) =>
                            handleForceCloseRowChange(
                              row.nozzleId,
                              'pricePerLitre',
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button type="submit" className="danger-button">
                    Force Close Session
                  </button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <SectionCard
            title="Unit Availability"
            description="Current occupancy snapshot for all configured pump units."
          >
            <DataTable
              rows={occupiedUnits}
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
              ]}
              emptyMessage="All units are currently available."
            />
          </SectionCard>

          <SectionCard
            title="Daily Report"
            description="Revenue, cost, and profit grouped by day."
          >
            <DataTable
              rows={data.daily}
              columns={[
                { key: 'date', label: 'Date' },
                {
                  key: 'revenue',
                  label: 'Revenue',
                  render: (row) => currencyFormatter.format(row.revenue || 0),
                },
                {
                  key: 'cost',
                  label: 'Cost',
                  render: (row) => currencyFormatter.format(row.cost || 0),
                },
                {
                  key: 'profit',
                  label: 'Profit',
                  render: (row) => currencyFormatter.format(row.profit || 0),
                },
              ]}
              emptyMessage="No daily report data yet."
            />
          </SectionCard>

          <SectionCard
            title="Fuel-wise Sales Report"
            description="Review total sales value and litres sold for each fuel type."
          >
            <DataTable
              rows={salesReportRows}
              columns={[
                { key: 'fuelType', label: 'Fuel Type' },
                {
                  key: 'totalSales',
                  label: 'Total Sales',
                  render: (row) => currencyFormatter.format(row.totalSales || 0),
                },
                {
                  key: 'litresSold',
                  label: 'Litres Sold',
                  render: (row) => Number(row.litresSold || 0).toFixed(2),
                },
              ]}
              emptyMessage="No fuel-wise sales data yet."
            />
          </SectionCard>

          <SectionCard
            title="Fuel-wise Purchase Report"
            description="Review total purchase cost and litres purchased for each fuel type."
          >
            <DataTable
              rows={purchaseReportRows}
              columns={[
                { key: 'fuelType', label: 'Fuel Type' },
                {
                  key: 'totalPurchase',
                  label: 'Total Purchase',
                  render: (row) => currencyFormatter.format(row.totalPurchase || 0),
                },
                {
                  key: 'litresPurchased',
                  label: 'Litres Purchased',
                  render: (row) => Number(row.litresPurchased || 0).toFixed(2),
                },
              ]}
              emptyMessage="No fuel-wise purchase data yet."
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default AdminDashboard;
