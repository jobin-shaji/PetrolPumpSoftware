import { useEffect, useMemo, useState } from 'react';
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

const ManagerDashboard = () => {
  const [data, setData] = useState({
    units: [],
    tanks: [],
    purchases: [],
    shifts: [],
  });
  const [purchaseForm, setPurchaseForm] = useState({
    tankId: '',
    quantityLitres: '',
    pricePerLitre: '',
    supplier: '',
    invoiceNumber: '',
    date: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [unitsResponse, tanksResponse, purchasesResponse, shiftsResponse] =
        await Promise.all([
          api.get('/units'),
          api.get('/tanks'),
          api.get('/purchases'),
          api.get('/shifts?status=active'),
        ]);

      setData({
        units: unitsResponse.data,
        tanks: tanksResponse.data,
        purchases: purchasesResponse.data,
        shifts: shiftsResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load manager dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const occupiedUnits = useMemo(
    () => data.units.filter((unit) => unit.status === 'occupied'),
    [data.units]
  );

  const handlePurchaseSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await api.post('/purchases', purchaseForm);
      setPurchaseForm({
        tankId: '',
        quantityLitres: '',
        pricePerLitre: '',
        supplier: '',
        invoiceNumber: '',
        date: '',
      });
      setMessage('Fuel purchase recorded successfully.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save purchase');
    }
  };

  return (
    <Layout
      title="Manager Dashboard"
      subtitle="Monitor live unit occupancy and record stock purchases without manual unit assignment."
    >
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
          <SectionCard
            title="Operations Snapshot"
            description="Managers now monitor sessions instead of assigning units manually."
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

          <SectionCard
            title="Unit Availability"
            description="Pump operators choose units at session start, and units remain locked until session close."
          >
            <DataTable
              rows={data.units}
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
                    row.nozzles?.length
                      ? row.nozzles.map((nozzle) => nozzle.nozzleNumber).join(', ')
                      : '-',
                },
              ]}
              emptyMessage="No units configured."
            />
          </SectionCard>

          <SectionCard
            title="Record Fuel Purchase"
            description="Increase tank stock with supplier invoice details."
          >
            <form className="entity-form" onSubmit={handlePurchaseSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Tank</span>
                  <select
                    value={purchaseForm.tankId}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        tankId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select tank</option>
                    {data.tanks.map((tank) => (
                      <option key={tank._id} value={tank._id}>
                        {tank.fuelType?.name} ({tank.currentLevel}/{tank.capacity})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Quantity Litres</span>
                  <input
                    type="number"
                    value={purchaseForm.quantityLitres}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        quantityLitres: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Price Per Litre</span>
                  <input
                    type="number"
                    value={purchaseForm.pricePerLitre}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        pricePerLitre: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Supplier</span>
                  <input
                    type="text"
                    value={purchaseForm.supplier}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        supplier: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Invoice Number</span>
                  <input
                    type="text"
                    value={purchaseForm.invoiceNumber}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        invoiceNumber: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className="form-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={purchaseForm.date}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="primary-button">
                  Record Purchase
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Tank Levels" description="Current stock position by tank.">
            <DataTable
              rows={data.tanks}
              columns={[
                {
                  key: 'fuelType',
                  label: 'Fuel',
                  render: (row) => row.fuelType?.name || '-',
                },
                { key: 'capacity', label: 'Capacity' },
                { key: 'currentLevel', label: 'Current Level' },
              ]}
              emptyMessage="No tanks configured."
            />
          </SectionCard>

          <SectionCard title="Recent Purchases" description="Financial records remain read-only here.">
            <DataTable
              rows={data.purchases}
              columns={[
                {
                  key: 'tank',
                  label: 'Fuel',
                  render: (row) => row.tank?.fuelType?.name || '-',
                },
                { key: 'quantityLitres', label: 'Litres' },
                {
                  key: 'pricePerLitre',
                  label: 'Price',
                  render: (row) => currencyFormatter.format(row.pricePerLitre || 0),
                },
                {
                  key: 'totalCost',
                  label: 'Total Cost',
                  render: (row) => currencyFormatter.format(row.totalCost || 0),
                },
                {
                  key: 'date',
                  label: 'Date',
                  render: (row) => formatDateTime(row.date),
                },
              ]}
              emptyMessage="No purchases recorded yet."
            />
          </SectionCard>

          <SectionCard title="Active Shifts" description="Each open unit session creates and owns its shift.">
            <DataTable
              rows={data.shifts}
              columns={[
                {
                  key: 'unit',
                  label: 'Unit',
                  render: (row) => row.unit?.name || '-',
                },
                {
                  key: 'startedBy',
                  label: 'Started By',
                  render: (row) => row.startedBy?.name || '-',
                },
                {
                  key: 'startTime',
                  label: 'Start Time',
                  render: (row) => formatDateTime(row.startTime),
                },
              ]}
              emptyMessage="No active shifts right now."
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default ManagerDashboard;
