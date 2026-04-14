import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

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

const DashboardPumpOperatorSession = () => {
  const [data, setData] = useState({ units: [], currentSession: null });
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [openingRows, setOpeningRows] = useState([]);
  const [closingRows, setClosingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSession = async () => {
    setLoading(true);
    setError('');

    try {
      const [unitsResponse, currentSessionResponse] = await Promise.all([
        api.get('/units'),
        api.get('/unit-session/current'),
      ]);

      setData({
        units: unitsResponse.data,
        currentSession: currentSessionResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load session data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (data.currentSession) {
      setSelectedUnitId(data.currentSession.unit?._id || '');
      setClosingRows(buildClosingRows(data.currentSession));
      setOpeningRows([]);
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

  const handleOpeningChange = (nozzleId, value) => {
    setOpeningRows((current) =>
      current.map((row) => (row.nozzleId === nozzleId ? { ...row, reading: value } : row))
    );
  };

  const handleClosingChange = (nozzleId, field, value) => {
    setClosingRows((current) =>
      current.map((row) => (row.nozzleId === nozzleId ? { ...row, [field]: value } : row))
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
      await loadSession();
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
      await loadSession();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to close unit session');
    }
  };

  return (
    <Layout title="Session" subtitle="Start/end unit sessions with opening and closing readings.">
      {loading ? <div className="page-state">Loading session...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
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
                  key: 'nozzles',
                  label: 'Nozzles',
                  render: (row) =>
                    row.nozzles?.length ? row.nozzles.map((n) => n.nozzleNumber).join(', ') : '-',
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
                        Select
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
            description="Select a unit and submit opening readings once for every nozzle."
          >
            {data.currentSession ? (
              <div className="empty-state">
                You already have an open session for {data.currentSession.unit?.name || 'your unit'}.
              </div>
            ) : !selectedUnit ? (
              <div className="empty-state">Select an available unit to enter opening readings.</div>
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
                            handleClosingChange(row.nozzleId, 'closingReading', event.target.value)
                          }
                        />
                      </label>
                      <label className="form-field">
                        <span>Price Per Litre</span>
                        <input
                          type="number"
                          value={row.pricePerLitre}
                          onChange={(event) =>
                            handleClosingChange(row.nozzleId, 'pricePerLitre', event.target.value)
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
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardPumpOperatorSession;

