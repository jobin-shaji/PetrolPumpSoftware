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

const buildOpeningRows = (unit) =>
  (unit?.nozzles || []).map((nozzle) => ({
    nozzleId: nozzle._id,
    nozzleNumber: nozzle.nozzleNumber,
    fuelName: nozzle.tank?.fuelType?.name || 'Fuel',
    reading: '',
  }));

const buildClosingRows = (session) =>
  (session?.openingReadings || []).map((item) => ({
    nozzleId: item.nozzle?._id || item.nozzle,
    nozzleNumber: item.nozzle?.nozzleNumber || 'Nozzle',
    openingReading: item.reading,
    closingReading: '',
    pricePerLitre: '',
  }));

const PumpOperatorDashboard = () => {
  const [data, setData] = useState({
    units: [],
    currentSession: null,
    readings: [],
  });
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [openingRows, setOpeningRows] = useState([]);
  const [closingRows, setClosingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    setError('');

    try {
      const [unitsResponse, currentSessionResponse, readingsResponse] = await Promise.all([
        api.get('/units'),
        api.get('/unit-session/current'),
        api.get('/readings'),
      ]);

      setData({
        units: unitsResponse.data,
        currentSession: currentSessionResponse.data,
        readings: readingsResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load pump operator dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (data.currentSession) {
      setSelectedUnitId(data.currentSession.unit?._id || '');
      setClosingRows(buildClosingRows(data.currentSession));
      return;
    }

    const selectedUnit = data.units.find((unit) => unit._id === selectedUnitId);
    setOpeningRows(selectedUnit ? buildOpeningRows(selectedUnit) : []);
    setClosingRows([]);
  }, [data.currentSession, data.units, selectedUnitId]);

  const selectedUnit = useMemo(
    () => data.units.find((unit) => unit._id === selectedUnitId),
    [data.units, selectedUnitId]
  );

  const occupiedUnits = useMemo(
    () => data.units.filter((unit) => unit.status === 'occupied'),
    [data.units]
  );

  const handleOpeningChange = (nozzleId, value) => {
    setOpeningRows((current) =>
      current.map((row) => (row.nozzleId === nozzleId ? { ...row, reading: value } : row))
    );
  };

  const handleClosingChange = (nozzleId, field, value) => {
    setClosingRows((current) =>
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

  const handleSelectUnit = (unit) => {
    if (data.currentSession || unit.status !== 'available') {
      return;
    }

    setSelectedUnitId(unit._id);
    setOpeningRows(buildOpeningRows(unit));
    setMessage('');
    setError('');
  };

  const handleStartSession = async (event) => {
    event.preventDefault();

    if (!selectedUnitId) {
      setError('Select an available unit first.');
      return;
    }

    setError('');
    setMessage('');

    try {
      await api.post('/unit-session/start', {
        unitId: selectedUnitId,
        openingReadings: openingRows.map((row) => ({
          nozzleId: row.nozzleId,
          reading: row.reading,
        })),
      });

      setMessage('Unit session started successfully.');
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to start unit session');
    }
  };

  const handleEndSession = async (event) => {
    event.preventDefault();

    if (!data.currentSession) {
      setError('No active session was found.');
      return;
    }

    setError('');
    setMessage('');

    try {
      await api.post('/unit-session/end', {
        sessionId: data.currentSession._id,
        closingReadings: closingRows.map((row) => ({
          nozzleId: row.nozzleId,
          reading: row.closingReading,
          pricePerLitre: row.pricePerLitre,
        })),
      });

      setMessage('Unit session closed successfully.');
      setSelectedUnitId('');
      setOpeningRows([]);
      setClosingRows([]);
      await loadDashboard();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to close unit session');
    }
  };

  return (
    <Layout
      title="Pump Operator Dashboard"
      subtitle="Choose an available unit, submit opening readings, and close the session with final readings."
    >
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
          <SectionCard
            title="Session Status"
            description="Units are locked automatically while your session is open."
          >
            <div className="metric-grid">
              <div className="metric-card">
                <span>Your Session</span>
                <strong>{data.currentSession ? 'Open' : 'Not started'}</strong>
              </div>
              <div className="metric-card">
                <span>Selected Unit</span>
                <strong>
                  {data.currentSession?.unit?.name || selectedUnit?.name || 'No unit selected'}
                </strong>
              </div>
              <div className="metric-card">
                <span>Occupied Units</span>
                <strong>{occupiedUnits.length}</strong>
              </div>
              <div className="metric-card">
                <span>Started At</span>
                <strong>{formatDateTime(data.currentSession?.startTime)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Available Units"
            description="Pick any available unit to begin work. Occupied units remain locked."
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
                  key: 'nozzles',
                  label: 'Nozzles',
                  render: (row) =>
                    row.nozzles?.length
                      ? row.nozzles.map((nozzle) => nozzle.nozzleNumber).join(', ')
                      : '-',
                },
                {
                  key: 'action',
                  label: 'Action',
                  render: (row) => {
                    if (data.currentSession?.unit?._id === row._id) {
                      return <span>Current session</span>;
                    }

                    if (row.status === 'occupied') {
                      return <span>Locked</span>;
                    }

                    return (
                      <button
                        type="button"
                        className="primary-button small"
                        onClick={() => handleSelectUnit(row)}
                        disabled={Boolean(data.currentSession)}
                      >
                        Start Work
                      </button>
                    );
                  },
                },
              ]}
              emptyMessage="No units configured."
            />
          </SectionCard>

          <SectionCard
            title="Opening Reading Form"
            description="Submit one opening reading for every nozzle before you begin sales."
          >
            {data.currentSession ? (
              <div className="empty-state">
                An active session already exists. Opening readings are locked for this shift.
              </div>
            ) : !selectedUnit ? (
              <div className="empty-state">Choose an available unit to enter opening readings.</div>
            ) : (
              <form className="entity-form" onSubmit={handleStartSession}>
                <div className="reading-stack">
                  {openingRows.map((row) => (
                    <div key={row.nozzleId} className="reading-row">
                      <div className="reading-meta">
                        <strong>{row.nozzleNumber}</strong>
                        <span>{row.fuelName}</span>
                      </div>
                      <label className="form-field">
                        <span>Opening Reading</span>
                        <input
                          type="number"
                          value={row.reading}
                          onChange={(event) => handleOpeningChange(row.nozzleId, event.target.value)}
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="form-actions">
                  <button type="submit" className="primary-button">
                    Start Unit Session
                  </button>
                </div>
              </form>
            )}
          </SectionCard>

          <SectionCard
            title="Closing Reading Form"
            description="Submit final readings and prices to unlock the unit and post the sale."
          >
            {!data.currentSession ? (
              <div className="empty-state">Start a unit session before entering closing readings.</div>
            ) : (
              <form className="entity-form" onSubmit={handleEndSession}>
                <div className="reading-stack">
                  {closingRows.map((row) => (
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
                            handleClosingChange(
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
                            handleClosingChange(
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
                    End Unit Session
                  </button>
                </div>
              </form>
            )}
          </SectionCard>

          <SectionCard title="Recent Readings" description="Sales recorded from your completed unit sessions.">
            <DataTable
              rows={data.readings}
              columns={[
                {
                  key: 'nozzle',
                  label: 'Nozzle',
                  render: (row) => row.nozzle?.nozzleNumber || '-',
                },
                {
                  key: 'fuel',
                  label: 'Fuel',
                  render: (row) => row.nozzle?.tank?.fuelType?.name || '-',
                },
                { key: 'litresSold', label: 'Litres Sold' },
                {
                  key: 'totalAmount',
                  label: 'Amount',
                  render: (row) => currencyFormatter.format(row.totalAmount || 0),
                },
                {
                  key: 'shiftStartTime',
                  label: 'Start Time',
                  render: (row) => formatDateTime(row.shift?.startTime),
                },
                {
                  key: 'shiftEndTime',
                  label: 'End Time',
                  render: (row) => formatDateTime(row.shift?.endTime),
                },
              ]}
              emptyMessage="No readings recorded yet."
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default PumpOperatorDashboard;
