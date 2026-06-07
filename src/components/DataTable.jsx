import React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Inbox } from 'lucide-react';

const DataTable = ({ 
  columns, 
  data, 
  loading, 
  emptyMessage = "No records found",
  onSort,
  sortField,
  sortDirection
}) => {
  
  if (loading) {
    return (
      <div className="data-table-wrapper">
        <table className="data-table data-table-responsive">
          <thead>
            <tr>
              {columns.map((col, i) => <th key={i}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((_, j) => (
                  <td key={j}><div className="skeleton-cell"></div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="data-table-wrapper">
        <div className="table-empty">
          <Inbox />
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-wrapper">
      <table className="data-table data-table-responsive">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th 
                key={i}
                className={col.sortable ? 'sortable' : ''}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                {col.label}
                {col.sortable && (
                  <span className="sort-indicator">
                    {sortField === col.key ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} opacity={0.3} />
                    )}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map((col, j) => (
                <td key={j} data-label={col.label}>
                  {col.render ? col.render(row) : row[col.key]}
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
