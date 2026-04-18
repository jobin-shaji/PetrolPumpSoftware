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
  const [data, setData] = useState({ units: [], tanks: [], shifts: [], fuelPrices: [], customers: [] });
  const [fuelPriceForm, setFuelPriceForm] = useState({ fuelTypeId: "", pricePerLitre: "" });
  const [customerForm, setCustomerForm] = useState({ name: "", phone: "", vehicleNumber: "", creditLimit: "" });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOverview = async () => {
    setLoading(true);
    setError("");

    try {
      const [unitsResponse, tanksResponse, shiftsResponse, fuelPricesResponse, customersResponse] = await Promise.all([
        api.get("/units"),
        api.get("/tanks"),
        api.get("/shifts?status=active"),
        api.get("/fuel-prices/current"),
        api.get("/customers"),
      ]);

      setData({
        units: unitsResponse.data,
        tanks: tanksResponse.data,
        shifts: shiftsResponse.data,
        fuelPrices: fuelPricesResponse.data,
        customers: customersResponse.data,
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

  const handleCustomerSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      if (editingCustomerId) {
        await api.patch(`/customers/${editingCustomerId}`, customerForm);
        setMessage("Customer updated successfully.");
        setEditingCustomerId(null);
      } else {
        await api.post("/customers", customerForm);
        setMessage("Customer added successfully.");
      }
      setCustomerForm({ name: "", phone: "", vehicleNumber: "", creditLimit: "" });
      setIsCustomerModalOpen(false);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save customer");
    }
  };

  const handleEditCustomer = (customer) => {
    setCustomerForm({
      name: customer.name,
      phone: customer.phone || "",
      vehicleNumber: customer.vehicleNumber || "",
      creditLimit: customer.creditLimit || "",
    });
    setEditingCustomerId(customer.id);
    setIsCustomerModalOpen(true);
  };

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setEditingCustomerId(null);
    setCustomerForm({ name: "", phone: "", vehicleNumber: "", creditLimit: "" });
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

          <SectionCard
            title="Credit Customers"
            description="Manage customers who can purchase fuel on credit during shifts."
          >
            <div className="section-header-actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsCustomerModalOpen(true)}
              >
                Add Customer
              </button>
            </div>

            {isCustomerModalOpen ? (
              <div className="modal-backdrop">
                <div className="modal-panel">
                  <div className="modal-header">
                    <h3>{editingCustomerId ? "Edit Customer" : "Add Customer"}</h3>
                    <button
                      type="button"
                      className="close-button"
                      onClick={handleCloseCustomerModal}
                    >
                      ×
                    </button>
                  </div>

                  <form className="entity-form" onSubmit={handleCustomerSubmit}>
                    <label className="form-field">
                      <span>Name *</span>
                      <input
                        type="text"
                        value={customerForm.name}
                        onChange={(e) =>
                          setCustomerForm({ ...customerForm, name: e.target.value })
                        }
                        required
                      />
                    </label>

                    <label className="form-field">
                      <span>Phone</span>
                      <input
                        type="tel"
                        value={customerForm.phone}
                        onChange={(e) =>
                          setCustomerForm({ ...customerForm, phone: e.target.value })
                        }
                      />
                    </label>

                    <label className="form-field">
                      <span>Vehicle Number</span>
                      <input
                        type="text"
                        value={customerForm.vehicleNumber}
                        onChange={(e) =>
                          setCustomerForm({ ...customerForm, vehicleNumber: e.target.value })
                        }
                      />
                    </label>

                    <label className="form-field">
                      <span>Credit Limit (₹)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={customerForm.creditLimit}
                        onChange={(e) =>
                          setCustomerForm({ ...customerForm, creditLimit: e.target.value })
                        }
                        required
                      />
                    </label>

                    <div className="form-actions">
                      <button type="submit" className="primary-button">
                        {editingCustomerId ? "Update Customer" : "Add Customer"}
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={handleCloseCustomerModal}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}

            <DataTable
              rows={data.customers}
              emptyMessage="No customers configured yet."
              columns={[
                { key: "name", label: "Name" },
                { key: "phone", label: "Phone", render: (row) => row.phone || "-" },
                { key: "vehicleNumber", label: "Vehicle", render: (row) => row.vehicleNumber || "-" },
                {
                  key: "creditLimit",
                  label: "Credit Limit",
                  render: (row) => currencyFormatter.format(row.creditLimit || 0),
                },
                {
                  key: "currentBalance",
                  label: "Current Balance",
                  render: (row) => currencyFormatter.format(row.currentBalance || 0),
                },
                {
                  key: "action",
                  label: "Action",
                  render: (row) => (
                    <button
                      type="button"
                      className="secondary-button small"
                      onClick={() => handleEditCustomer(row)}
                    >
                      Edit
                    </button>
                  ),
                },
              ]}
            />
          </SectionCard>
        </>
      ) : null}
    </Layout>
  );
};

export default DashboardManagerOverview;
