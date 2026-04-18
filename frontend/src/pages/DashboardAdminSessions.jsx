import { useEffect, useMemo, useState } from 'react';
import AlertBox from '../components/AlertBox.jsx';
import DataTable from '../components/DataTable.jsx';
import Layout from '../components/Layout.jsx';
import SectionCard from '../components/SectionCard.jsx';
import api from '../services/api.js';

const formatDateTime = (value) => {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('en-IN', { hour12: true });
};

const buildForceCloseRows = (session) =>
  (session?.openingReadings || []).map((item) => ({
    nozzleId: item.nozzle?._id || item.nozzle,
    nozzleNumber: item.nozzle?.nozzleNumber || 'Nozzle',
    openingReading: item.reading,
    closingReading: '',
  }));

const DashboardAdminSessions = () => {
  const [data, setData] = useState({ openSessions: [], units: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [forceCloseRows, setForceCloseRows] = useState([]);
  const [closeReason, setCloseReason] = useState('');

  const loadSessions = async () => {
    setLoading(true);
    setError('');

    try {
      const [openSessionsResponse, unitsResponse] = await Promise.all([
        api.get('/unit-session?status=open'),
        api.get('/units'),
      ]);

      setData({
        openSessions: openSessionsResponse.data,
        units: unitsResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load live sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const occupiedUnits = useMemo(
    () => data.units.filter((unit) => unit.status === 'occupied' || unit.activeSession),
    [data.units]
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
      current.map((row) => (row.nozzleId === nozzleId ? { ...row, [field]: value } : row))
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
        })),
      });

      setSelectedSession(null);
      setForceCloseRows([]);
      setCloseReason('');
      setMessage('Open session force closed successfully.');
      await loadSessions();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to force close the session');
    }
  };

  return (
    <Layout title="Sessions" subtitle="Monitor occupied units and force close when needed.">
      {loading ? <div className="page-state">Loading sessions...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
          <SectionCard
            title="Live Unit Sessions"
            description="Force close is an admin override and requires closing readings."
          >
            <DataTable
              rows={data.openSessions}
              columns={[
                { key: 'unit', label: 'Unit', render: (row) => row.unit?.name || '-' },
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
              description={`Closing ${selectedSession.unit?.name || 'selected unit'} for ${
                selectedSession.pumpOperator?.name || 'selected pump operator'
              }.`}
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
                { key: 'assignedTo', label: 'Occupied By', render: (row) => row.assignedTo?.name || '-' },
                { key: 'activeSession', label: 'Session Started', render: (row) => formatDateTime(row.activeSession?.startTime) },
              ]}
              emptyMessage="All units are currently available."
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardAdminSessions;
