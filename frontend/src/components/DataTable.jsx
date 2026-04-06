const DataTable = ({ columns, rows, emptyMessage = 'No data available.' }) => {
  if (!rows.length) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  const getRowKey = (row, index) =>
    row._id || row.id || row.date || row.fuelType || row.name || `row-${index}`;

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={getRowKey(row, index)}>
              {columns.map((column) => (
                <td key={`${getRowKey(row, index)}-${column.key}`}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
