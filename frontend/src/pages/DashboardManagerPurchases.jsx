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

const DashboardManagerPurchases = () => {
  const [data, setData] = useState({ tanks: [], purchases: [] });
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

  const loadPurchases = async () => {
    setLoading(true);
    setError('');

    try {
      const [tanksResponse, purchasesResponse] = await Promise.all([
        api.get('/tanks'),
        api.get('/purchases'),
      ]);

      setData({
        tanks: tanksResponse.data,
        purchases: purchasesResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const tankOptions = useMemo(
    () =>
      data.tanks.map((tank) => ({
        label: `${tank.fuelType?.name || 'Unknown'} tank`,
        value: tank._id,
      })),
    [data.tanks]
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
      await loadPurchases();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save purchase');
    }
  };

  return (
    <Layout title="Purchases" subtitle="Record stock purchases and review recent entries.">
      {loading ? <div className="page-state">Loading purchases...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
          <SectionCard
            title="Record Fuel Purchase"
            description="Purchases increase the linked tank current level automatically."
          >
            <form className="entity-form" onSubmit={handlePurchaseSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Tank</span>
                  <select
                    value={purchaseForm.tankId}
                    onChange={(event) =>
                      setPurchaseForm((current) => ({ ...current, tankId: event.target.value }))
                    }
                  >
                    <option value="">Select</option>
                    {tankOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Quantity (Litres)</span>
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
                      setPurchaseForm((current) => ({ ...current, supplier: event.target.value }))
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
                      setPurchaseForm((current) => ({ ...current, date: event.target.value }))
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
                { key: 'fuelType', label: 'Fuel', render: (row) => row.fuelType?.name || '-' },
                { key: 'capacity', label: 'Capacity' },
                { key: 'currentLevel', label: 'Current Stock Level' },
              ]}
              emptyMessage="No tanks configured."
            />
          </SectionCard>

          <SectionCard title="Recent Purchases" description="Financial records remain read-only here.">
            <DataTable
              rows={data.purchases}
              columns={[
                { key: 'tank', label: 'Fuel', render: (row) => row.tank?.fuelType?.name || '-' },
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
                { key: 'date', label: 'Date', render: (row) => formatDateTime(row.date) },
              ]}
              emptyMessage="No purchases recorded yet."
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardManagerPurchases;

