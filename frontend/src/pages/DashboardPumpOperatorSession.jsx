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

const buildClosingRows = (session) => {
  const openingReadings = session?.openingReadings || [];
  const closingByNozzleId = new Map(
    (session?.closingReadings || []).map((item) => [item.nozzle?._id || item.nozzle, item])
  );

  return openingReadings.map((item) => {
    const savedClosing = closingByNozzleId.get(item.nozzle?._id || item.nozzle);

    return {
      nozzleId: item.nozzle?._id || item.nozzle,
      nozzleNumber: item.nozzle?.nozzleNumber || 'Nozzle',
      openingReading: item.reading,
      closingReading: savedClosing?.reading ?? '',
    };
  });
};

const getFuelTypeIdFromNozzle = (nozzle) => nozzle?.tank?.fuelType?._id || nozzle?.tank?.fuelType?.id || '';

const DashboardPumpOperatorSession = () => {
  const [data, setData] = useState({ units: [], currentSession: null, customers: [], fuelPrices: [] });
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [openingRows, setOpeningRows] = useState([]);
  const [closingRows, setClosingRows] = useState([]);
  const [creditSales, setCreditSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [readingsRecorded, setReadingsRecorded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const [sessionPayment, setSessionPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    cash: '0',
    upi: '0',
    card: '0',
  });

  // Credit sale form state
  const [creditSaleForm, setCreditSaleForm] = useState({
    customerId: '',
    nozzleId: '',
    litres: '',
    pricePerLitre: '',
  });

  const loadSession = async () => {
    setLoading(true);
    setError('');

    try {
      const [unitsResponse, currentSessionResponse, customersResponse, fuelPricesResponse] = await Promise.all([
        api.get('/units'),
        api.get('/unit-session/current'),
        api.get('/customers?isActive=true'),
        api.get('/fuel-prices/current'),
      ]);

      setData({
        units: unitsResponse.data,
        currentSession: currentSessionResponse.data,
        customers: customersResponse.data,
        fuelPrices: fuelPricesResponse.data,
      });

      const currentSession = currentSessionResponse.data;
      let creditSalesData = [];
      if (currentSessionResponse.data?._id) {
        const creditSalesResponse = await api.get(
          `/credit-sales/session/${currentSessionResponse.data._id}`
        );
        creditSalesData = creditSalesResponse.data;
      }

      setCreditSales(creditSalesData);

      if (currentSession?.closingReadings?.length) {
        const totalSales = currentSession.closingReadings.reduce(
          (sum, reading) => sum + Number(reading.totalAmount || 0),
          0
        );
        const creditSalesTotal = creditSalesData.reduce(
          (sum, sale) => sum + Number(sale.totalAmount || 0),
          0
        );

        setReconciliation({
          totalSales,
          creditSalesTotal,
          expectedCollection: totalSales - creditSalesTotal,
        });
      } else {
        setReconciliation(null);
      }

      setReadingsRecorded(Boolean(currentSession?.closingReadings?.length));
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
      setReadingsRecorded(Boolean(data.currentSession.closingReadings?.length));
      setOpeningRows([]);
      return;
    }

    const selectedUnit = data.units.find((unit) => unit._id === selectedUnitId);
    setOpeningRows(selectedUnit ? buildOpeningRows(selectedUnit) : []);
    setClosingRows([]);
    setReadingsRecorded(false);
  }, [data.currentSession, data.units, selectedUnitId]);

  const selectedUnit = useMemo(
    () => data.units.find((unit) => unit._id === selectedUnitId),
    [data.units, selectedUnitId]
  );

  const metrics = useMemo(
    () => [
      { label: 'Session Status', value: data.currentSession ? 'Open' : 'Not started' },
      { label: 'Selected Unit', value: data.currentSession?.unit?.name || selectedUnit?.name || '-' },
      { label: 'Credit Sales', value: creditSales.length },
      { label: 'Payment Status', value: sessionPayment ? 'Recorded' : 'Pending' },
    ],
    [creditSales.length, data.currentSession, selectedUnit, sessionPayment]
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

  const getCurrentPriceForNozzle = (nozzleId) => {
    const unitNozzle = (selectedUnit?.nozzles || data.currentSession?.unit?.nozzles || []).find(
      (nozzle) => nozzle._id === nozzleId
    );

    if (!unitNozzle) {
      return '';
    }

    const fuelTypeId = getFuelTypeIdFromNozzle(unitNozzle);
    if (!fuelTypeId) {
      return '';
    }

    const fuelPrice = data.fuelPrices.find((item) => item.fuelType?._id === fuelTypeId);
    return fuelPrice?.pricePerLitre ?? '';
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

  const handleCreditSaleNozzleChange = (nozzleId) => {
    const defaultPrice = getCurrentPriceForNozzle(nozzleId);

    setCreditSaleForm((current) => ({
      ...current,
      nozzleId,
      pricePerLitre: defaultPrice === '' ? '' : String(defaultPrice),
    }));
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

  const handleAddCreditSale = async (event) => {
    event.preventDefault();

    if (!creditSaleForm.customerId || !creditSaleForm.nozzleId) {
      setError('Please select customer and nozzle');
      return;
    }

    setError('');
    setMessage('');

    try {
      await api.post('/credit-sales', {
        unitSessionId: data.currentSession._id,
        nozzleId: creditSaleForm.nozzleId,
        customerId: creditSaleForm.customerId,
        litres: creditSaleForm.litres,
        pricePerLitre: creditSaleForm.pricePerLitre,
      });

      setMessage('Credit sale recorded successfully.');
      setCreditSaleForm({ customerId: '', nozzleId: '', litres: '', pricePerLitre: '' });
      setIsModalOpen(false);
      setReconciliation(null);
      await loadSession();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to record credit sale');
    }
  };

  const handleRecordReadings = () => {
    const unitNozzles = selectedUnit?.nozzles || data.currentSession?.unit?.nozzles || [];

    if (!closingRows.length) {
      setError('No closing readings found for this session.');
      return;
    }

    const missingReading = closingRows.some(
      (row) => row.closingReading === '' || row.closingReading === null || row.closingReading === undefined
    );

    if (missingReading) {
      setError('Please enter closing reading for all nozzles before recording readings.');
      return;
    }

    let totalSales = 0;

    for (const row of closingRows) {
      const opening = Number(row.openingReading || 0);
      const closing = Number(row.closingReading);

      if (!Number.isFinite(closing) || closing < 0) {
        setError(`Closing reading for ${row.nozzleNumber} must be zero or greater.`);
        return;
      }

      if (closing < opening) {
        setError(`Closing reading for ${row.nozzleNumber} cannot be less than opening reading.`);
        return;
      }

      const nozzle = unitNozzles.find((item) => item._id === row.nozzleId);
      const fuelTypeId = getFuelTypeIdFromNozzle(nozzle);
      const fuelPrice = data.fuelPrices.find((item) => item.fuelType?._id === fuelTypeId);
      const pricePerLitre = Number(fuelPrice?.pricePerLitre);

      if (!Number.isFinite(pricePerLitre) || pricePerLitre <= 0) {
        setError(`Daily fuel price is not configured for ${nozzle?.tank?.fuelType?.name || row.nozzleNumber}.`);
        return;
      }

      const litresSold = closing - opening;
      totalSales += litresSold * pricePerLitre;
    }

    const creditSalesTotal = creditSales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount || 0),
      0
    );
    const expectedCollection = totalSales - creditSalesTotal;

    const persistReadings = async () => {
      await api.post('/unit-session/record-readings', {
        sessionId: data.currentSession._id,
        closingReadings: closingRows.map((row) => ({
          nozzleId: row.nozzleId,
          reading: row.closingReading,
        })),
      });

      setError('');
      setReconciliation({
        totalSales,
        creditSalesTotal,
        expectedCollection,
      });
      setReadingsRecorded(true);
      setMessage('Readings recorded and saved to the database.');
      await loadSession();
    };

    persistReadings().catch((requestError) => {
      setError(requestError.response?.data?.message || 'Unable to record readings');
    });
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
      });

      setMessage('Unit session closed successfully.');
      setSelectedUnitId('');
      setOpeningRows([]);
      setClosingRows([]);
      setCreditSales([]);
      setReconciliation(null);
      await loadSession();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to close unit session');
    }
  };

  const handleSubmitPayment = async () => {
    if (!readingsRecorded) {
      setError('Record readings before saving payment.');
      return;
    }

    const cashCollected = paymentForm.cash;
    const upiCollected = paymentForm.upi;
    const cardCollected = paymentForm.card;

    try {
      const paymentResponse = await api.post(`/session-payments/${data.currentSession._id}`, {
        cashCollected,
        upiCollected,
        cardCollected,
      });

      setSessionPayment(paymentResponse.data);
      setMessage('Payment recorded successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save payment');
    }
  };

  const currencyFormatter = (value) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(value);

  return (
    <Layout title="Session" subtitle="Start/end unit sessions with opening and closing readings.">
      {loading ? <div className="page-state">Loading session...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
          <SectionCard title="Session Snapshot" description="Current shift status and reconciliation progress.">
            <div className="metric-grid">
              {metrics.map((metric) => (
                <div key={metric.label} className="metric-card">
                  <span>{metric.label}</span>
                  <strong>{metric.value}</strong>
                </div>
              ))}
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

          {data.currentSession ? (
            <>
              <SectionCard title="Credit Sales" description="Record credit sales during the shift.">
                <div className="section-header-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add Credit Sale
                  </button>
                </div>

                {isModalOpen ? (
                  <div className="modal-backdrop">
                    <div className="modal-panel">
                      <div className="modal-header">
                        <h3>Add Credit Sale</h3>
                        <button
                          type="button"
                          className="close-button"
                          onClick={() => setIsModalOpen(false)}
                        >
                          ×
                        </button>
                      </div>

                      <form className="entity-form" onSubmit={handleAddCreditSale}>
                        <label className="form-field">
                          <span>Customer</span>
                          <select
                            value={creditSaleForm.customerId}
                            onChange={(e) =>
                              setCreditSaleForm({ ...creditSaleForm, customerId: e.target.value })
                            }
                            required
                          >
                            <option value="">Select customer</option>
                            {data.customers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} ({c.phone || 'N/A'})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="form-field">
                          <span>Nozzle</span>
                          <select
                            value={creditSaleForm.nozzleId}
                            onChange={(e) => handleCreditSaleNozzleChange(e.target.value)}
                            required
                          >
                            <option value="">Select nozzle</option>
                            {(selectedUnit?.nozzles || data.currentSession?.unit?.nozzles || []).map((n) => (
                              <option key={n._id} value={n._id}>
                                {n.nozzleNumber} ({n.tank?.fuelType?.name || 'Fuel'})
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="form-field">
                          <span>Litres</span>
                          <input
                            type="number"
                            step="0.001"
                            value={creditSaleForm.litres}
                            onChange={(e) =>
                              setCreditSaleForm({ ...creditSaleForm, litres: e.target.value })
                            }
                            required
                          />
                        </label>

                        <label className="form-field">
                          <span>Price Per Litre (₹)</span>
                          <input
                            type="number"
                            step="0.01"
                            value={creditSaleForm.pricePerLitre}
                            onChange={(e) =>
                              setCreditSaleForm({
                                ...creditSaleForm,
                                pricePerLitre: e.target.value,
                              })
                            }
                            required
                          />
                        </label>

                        <div className="form-actions">
                          <button type="submit" className="primary-button">
                            Save Credit Sale
                          </button>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setIsModalOpen(false)}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : null}

                <DataTable
                  rows={creditSales}
                  columns={[
                    { key: 'nozzleNumber', label: 'Nozzle' },
                    { key: 'customerName', label: 'Customer' },
                    {
                      key: 'litres',
                      label: 'Litres',
                      render: (row) => row.litres?.toFixed(2) || '-',
                    },
                    {
                      key: 'pricePerLitre',
                      label: 'Price/L',
                      render: (row) => currencyFormatter(row.pricePerLitre || 0),
                    },
                    {
                      key: 'totalAmount',
                      label: 'Total',
                      render: (row) => currencyFormatter(row.totalAmount || 0),
                    },
                  ]}
                  emptyMessage="No credit sales recorded."
                />
              </SectionCard>
            </>
          ) : null}

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
                    </div>
                  ))}
                </div>

                {reconciliation ? (
                  <div className="reconciliation-summary">
                    <div className="reconciliation-row">
                      <span>Total Sales</span>
                      <span>{currencyFormatter(reconciliation.totalSales || 0)}</span>
                    </div>
                    <div className="reconciliation-row credit">
                      <span>Credit Sales</span>
                      <span>{currencyFormatter(reconciliation.creditSalesTotal || 0)}</span>
                    </div>
                    <div className="reconciliation-row expected">
                      <span>Expected (Cash + UPI + Card)</span>
                      <span>{currencyFormatter(reconciliation.expectedCollection || 0)}</span>
                    </div>

                    <div className="section-spacer"></div>

                    <div className="entity-form">
                      <div className="form-row">
                        <label className="form-field">
                          <span>Cash Collected (₹)</span>
                          <input
                            type="number"
                            name="cash"
                            step="0.01"
                            value={paymentForm.cash}
                            onChange={(event) =>
                              setPaymentForm((current) => ({ ...current, cash: event.target.value }))
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span>UPI Collected (₹)</span>
                          <input
                            type="number"
                            name="upi"
                            step="0.01"
                            value={paymentForm.upi}
                            onChange={(event) =>
                              setPaymentForm((current) => ({ ...current, upi: event.target.value }))
                            }
                          />
                        </label>
                        <label className="form-field">
                          <span>Card Collected (₹)</span>
                          <input
                            type="number"
                            name="card"
                            step="0.01"
                            value={paymentForm.card}
                            onChange={(event) =>
                              setPaymentForm((current) => ({ ...current, card: event.target.value }))
                            }
                          />
                        </label>
                      </div>

                      {sessionPayment ? (
                        <>
                          <div className="reconciliation-row total">
                            <span>Total Collected</span>
                            <span>{currencyFormatter(sessionPayment.totalCollected || 0)}</span>
                          </div>
                          <div
                            className={`reconciliation-row ${sessionPayment.difference === 0 ? 'match' : 'mismatch'}`}
                          >
                            <span>Difference</span>
                            <span>{currencyFormatter(Math.abs(sessionPayment.difference) || 0)}</span>
                          </div>
                        </>
                      ) : null}

                      <div className="form-actions">
                        <button
                          type="button"
                          className="primary-button"
                          onClick={handleSubmitPayment}
                          disabled={!readingsRecorded}
                        >
                          Record Payment
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="form-actions">
                  <button type="button" className="primary-button" onClick={handleRecordReadings}>
                    Record Reading
                  </button>
                  <button type="submit" className="danger-button" disabled={!readingsRecorded}>
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

