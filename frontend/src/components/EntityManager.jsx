import { useMemo, useState } from 'react';
import api from '../services/api.js';
import AlertBox from './AlertBox.jsx';
import DataTable from './DataTable.jsx';
import SectionCard from './SectionCard.jsx';

const getEmptyValue = (field) => (field.type === 'multiselect' ? [] : '');

const EntityManager = ({
  title,
  description,
  endpoint,
  fields,
  items,
  columns,
  onRefresh,
  mapItemToForm,
}) => {
  const initialState = useMemo(
    () => Object.fromEntries(fields.map((field) => [field.name, getEmptyValue(field)])),
    [fields]
  );
  const [form, setForm] = useState(initialState);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setError('');
    setForm(Object.fromEntries(fields.map((field) => [field.name, getEmptyValue(field)])));
  };

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field.name]: value,
    }));
  };

  const buildPayload = () => {
    const payload = {};

    fields.forEach((field) => {
      let value = form[field.name];

      if (field.type === 'number' && value !== '') {
        value = Number(value);
      }

      if (field.type === 'password' && editingId && !value) {
        return;
      }

      if (field.type === 'select' && value === '') {
        value = null;
      }

      if (field.type !== 'multiselect' && value === '' && field.optional) {
        return;
      }

      payload[field.name] = value;
    });

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = buildPayload();

      if (editingId) {
        await api.patch(`${endpoint}/${editingId}`, payload);
      } else {
        await api.post(endpoint, payload);
      }

      resetForm();
      await onRefresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save record');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingId(item._id);
    setError('');
    setForm(mapItemToForm ? mapItemToForm(item) : initialState);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this record?');

    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`${endpoint}/${id}`);
      if (editingId === id) {
        resetForm();
      }
      await onRefresh();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to delete record');
    }
  };

  const actionColumns = [
    ...columns,
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="row-actions">
          <button type="button" className="ghost-button small" onClick={() => handleEdit(row)}>
            Edit
          </button>
          <button
            type="button"
            className="danger-button small"
            onClick={() => handleDelete(row._id)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        editingId ? (
          <button type="button" className="ghost-button small" onClick={resetForm}>
            Cancel edit
          </button>
        ) : null
      }
    >
      <form className="entity-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          {fields.map((field) => {
            if (field.type === 'textarea') {
              return (
                <label key={field.name} className="form-field">
                  <span>{field.label}</span>
                  <textarea
                    value={form[field.name]}
                    onChange={(event) => handleChange(field, event.target.value)}
                    placeholder={field.placeholder || ''}
                  />
                </label>
              );
            }

            if (field.type === 'select' || field.type === 'multiselect') {
              return (
                <label key={field.name} className="form-field">
                  <span>{field.label}</span>
                  <select
                    multiple={field.type === 'multiselect'}
                    value={form[field.name]}
                    onChange={(event) => {
                      const value =
                        field.type === 'multiselect'
                          ? Array.from(event.target.selectedOptions).map((option) => option.value)
                          : event.target.value;
                      handleChange(field, value);
                    }}
                  >
                    {field.type === 'select' ? <option value="">Select</option> : null}
                    {field.options.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              );
            }

            return (
              <label key={field.name} className="form-field">
                <span>{field.label}</span>
                <input
                  type={field.type || 'text'}
                  value={form[field.name]}
                  onChange={(event) => handleChange(field, event.target.value)}
                  placeholder={field.placeholder || ''}
                />
              </label>
            );
          })}
        </div>

        <AlertBox message={error} variant="error" />

        <div className="form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </form>

      <DataTable columns={actionColumns} rows={items} />
    </SectionCard>
  );
};

export default EntityManager;
