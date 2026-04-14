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

const DashboardAnalytics = () => {
  const [data, setData] = useState({ profit: null, daily: [], fuel: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const [profitResponse, dailyResponse, fuelResponse] = await Promise.all([
        api.get('/reports/profit'),
        api.get('/reports/daily'),
        api.get('/reports/fuel'),
      ]);

      setData({
        profit: profitResponse.data,
        daily: dailyResponse.data,
        fuel: fuelResponse.data,
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

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

  return (
    <Layout title="Analytics" subtitle="Revenue, cost, and fuel-wise breakdowns.">
      {loading ? <div className="page-state">Loading analytics...</div> : null}
      <AlertBox message={error} variant="error" />

      {!loading ? (
        <>
          <SectionCard title="Profit Summary" description="Totals for the selected period.">
            <div className="metric-grid">
              <div className="metric-card">
                <span>Revenue</span>
                <strong>{currencyFormatter.format(data.profit?.revenue || 0)}</strong>
              </div>
              <div className="metric-card">
                <span>Cost</span>
                <strong>{currencyFormatter.format(data.profit?.cost || 0)}</strong>
              </div>
              <div className="metric-card">
                <span>Profit</span>
                <strong>{currencyFormatter.format(data.profit?.profit || 0)}</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Daily Report" description="Revenue, cost, and profit grouped by day.">
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

export default DashboardAnalytics;

