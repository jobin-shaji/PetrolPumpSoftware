import { useEffect, useMemo, useState } from "react";
import AlertBox from "../components/AlertBox.jsx";
import DataTable from "../components/DataTable.jsx";
import Layout from "../components/Layout.jsx";
import SectionCard from "../components/SectionCard.jsx";
import api from "../services/api.js";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { hour12: true }) : "-";

const getTodayPriceReminder = (fuelPrices) => {
  const now = new Date();
  const sixAmToday = new Date(now);
  sixAmToday.setHours(6, 0, 0, 0);

  if (now < sixAmToday) {
    return "";
  }

  const missingFuelPrices = fuelPrices.filter((fuelPrice) => !fuelPrice.isUpdatedToday);

  if (!missingFuelPrices.length) {
    return "";
  }

  const missingFuelNames = missingFuelPrices
    .map((fuelPrice) => fuelPrice.fuelType?.name || "Fuel")
    .join(", ");

  return `Fuel price has not been updated today after 6:00 AM for: ${missingFuelNames}. The previous day's price will continue to be used until you record a new update.`;
};

const DashboardManagerOverview = () => {
  const [data, setData] = useState({ units: [], tanks: [], shifts: [], fuelPrices: [] });
  const [fuelPriceForm, setFuelPriceForm] = useState({ fuelTypeId: "", pricePerLitre: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError("");

    try {
      const [unitsResponse, tanksResponse, shiftsResponse, fuelPricesResponse] = await Promise.all([
        api.get("/units"),
        api.get("/tanks"),
        api.get("/shifts?status=active"),
        api.get("/fuel-prices/current"),
      ]);

      setData({
        units: unitsResponse.data,
        tanks: tanksResponse.data,
        shifts: shiftsResponse.data,
        fuelPrices: fuelPricesResponse.data,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Failed to load dashboard overview",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const occupiedUnits = useMemo(
    () => data.units.filter((unit) => unit.status === "occupied"),
    [data.units],
  );

  const tanksWithFill = useMemo(
    () =>
      data.tanks.map((tank) => {
        const capacity = Number(tank.capacity || 0);
        const currentLevel = Number(tank.currentLevel || 0);
        const fillPercent =
          capacity > 0 ? Math.max(0, Math.min(100, (currentLevel / capacity) * 100)) : 0;

        return {
          ...tank,
          fillPercent,
          capacity,
          currentLevel,
        };
      }),
    [data.tanks],
  );

  const priceReminder = useMemo(
    () => getTodayPriceReminder(data.fuelPrices),
    [data.fuelPrices],
  );

  const fuelPriceOptions = useMemo(
    () =>
      data.fuelPrices.map((fuelPrice) => ({
        label: fuelPrice.fuelType?.name || "Fuel",
        value: fuelPrice.fuelType?._id,
      })),
    [data.fuelPrices],
  );

  const currentFuelPrices = useMemo(
    () =>
      data.fuelPrices.map((fuelPrice) => ({
        fuelType: fuelPrice.fuelType,
        pricePerLitre: fuelPrice.pricePerLitre,
        priceDate: fuelPrice.priceDate,
        isUpdatedToday: fuelPrice.isUpdatedToday,
        updatedBy: fuelPrice.updatedBy,
      })),
    [data.fuelPrices],
  );

  const handleFuelPriceSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await api.post("/fuel-prices", fuelPriceForm);
      setFuelPriceForm({ fuelTypeId: "", pricePerLitre: "" });
      setMessage("Daily fuel price updated successfully.");
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save daily fuel price");
    }
  };

  return (
    <Layout
      title="Dashboard"
      subtitle="Monitor unit occupancy, active shifts, and stock coverage."
    >
      {loading ? <div className="page-state">Loading dashboard...</div> : null}
      <AlertBox message={error} variant="error" />
      <AlertBox message={priceReminder} variant="warning" />
      <AlertBox message={message} variant="success" />

      {!loading ? (
        <>
          <SectionCard
            title="Operations Snapshot"
            description="Pump operators choose units at session start; units lock until session close."
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
            title="Daily Fuel Prices"
            description="Update today's fuel price after 6:00 AM. The previous day's price stays active until you change it."
          >
            <form className="entity-form" onSubmit={handleFuelPriceSubmit}>
              <div className="form-grid">
                <label className="form-field">
                  <span>Fuel Type</span>
                  <select
                    value={fuelPriceForm.fuelTypeId}
                    onChange={(event) =>
                      setFuelPriceForm((current) => ({
                        ...current,
                        fuelTypeId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select fuel type</option>
                    {fuelPriceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Price Per Litre</span>
                  <input
                    type="number"
                    value={fuelPriceForm.pricePerLitre}
                    onChange={(event) =>
                      setFuelPriceForm((current) => ({
                        ...current,
                        pricePerLitre: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="form-actions">
                <button type="submit" className="primary-button">
                  Update Daily Price
                </button>
              </div>
            </form>

            <div className="section-spacer" />

            <DataTable
              rows={currentFuelPrices}
              emptyMessage="No daily fuel prices recorded yet."
              columns={[
                { key: "fuelType", label: "Fuel", render: (row) => row.fuelType?.name || "-" },
                {
                  key: "pricePerLitre",
                  label: "Price",
                  render: (row) => currencyFormatter.format(row.pricePerLitre || 0),
                },
                {
                  key: "priceDate",
                  label: "Last Updated",
                  render: (row) => formatDateTime(row.priceDate),
                },
                {
                  key: "updatedBy",
                  label: "Updated By",
                  render: (row) => row.updatedBy?.name || "-",
                },
                {
                  key: "status",
                  label: "Status",
                  render: (row) => (row.isUpdatedToday ? "Updated today" : "Pending today"),
                },
              ]}
            />
          </SectionCard>

          <SectionCard
            title="Tank Fuel Levels"
            description="Live stock markers by tank, based on current stock versus capacity."
          >
            <div className="tank-marker-grid">
              {tanksWithFill.map((tank) => (
                <div key={tank._id} className="tank-marker-card">
                  <div className="tank-marker-header">
                    <strong>{tank.fuelType?.name || "Fuel"}</strong>
                    <span>{tank.fillPercent.toFixed(0)}%</span>
                  </div>
                  <div className="tank-marker-body">
                    <div
                      className="tank-tube"
                      role="img"
                      aria-label="Tank fill level marker"
                    >
                      <div
                        className="tank-tube-fill"
                        style={{ height: `${tank.fillPercent}%` }}
                      />
                    </div>
                    <div className="tank-marker-values">
                      <span>Stock: {tank.currentLevel}</span>
                      <span>Capacity: {tank.capacity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardManagerOverview;
