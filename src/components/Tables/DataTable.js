import React, { useState } from 'react'
import './DataTable.css'

function DataTable({ 
  columns, 
  data, 
  selectedRows,
  editingId,
  editValues,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onViewImage,
  isAdmin,
  onEditChange
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [searchTerm, setSearchTerm] = useState('')

  // Ordenar datos
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data
    
    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key]?.toString().toLowerCase() || ''
      const bVal = b[sortConfig.key]?.toString().toLowerCase() || ''
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortConfig])

  // Filtrar datos
  const filteredData = React.useMemo(() => {
    if (!searchTerm) return sortedData
    
    return sortedData.filter(row => {
      return columns.some(col => {
        const value = row[col.key]?.toString().toLowerCase() || ''
        return value.includes(searchTerm.toLowerCase())
      })
    })
  }, [sortedData, searchTerm, columns])

  // Manejar ordenamiento
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const isRowBlinking = (rowId) => {
    return selectedRows.includes(rowId)
  }

  return (
    <div className="data-table-wrapper">
      <div className="table-toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button 
              className="search-clear"
              onClick={() => setSearchTerm('')}
            >
              ×
            </button>
          )}
        </div>
        <div className="table-info">
          {filteredData.length} de {data.length} registros
        </div>
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={col.sortable ? 'sortable' : ''}
                >
                  <div className="th-content">
                    {col.label}
                    {sortConfig.key === col.key && (
                      <span className="sort-icon">
                        {sortConfig.direction === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th>IMAGEN</th>
              {isAdmin && <th>ACCIONES</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.map(row => (
              <tr 
                key={row.id}
                className={`${isRowBlinking(row.id) ? 'blink-warning duplicate-row' : ''} ${editingId === row.id ? 'editing-row' : ''}`}
              >
                {columns.map(col => (
                  <td key={col.key}>
                    {editingId === row.id ? (
                      <input
                        type={col.key === 'fecha' ? 'date' : 'text'}
                        value={editValues[col.key] || ''}
                        onChange={(e) => onEditChange(col.key, e.target.value)}
                        className="edit-input"
                      />
                    ) : (
                      <span className="cell-value">
                        {col.format ? col.format(row[col.key]) : row[col.key] || '-'}
                      </span>
                    )}
                  </td>
                ))}
                <td>
                  <button 
                    className="btn-view-image"
                    onClick={() => onViewImage(row.id)}
                    title="Ver imagen"
                  >
                    🖼️
                  </button>
                </td>
                {isAdmin && (
                  <td>
                    <div className="action-buttons">
                      {editingId === row.id ? (
                        <>
                          <button 
                            className="btn-save"
                            onClick={() => onSaveEdit(row.id)}
                            title="Guardar"
                          >
                            💾
                          </button>
                          <button 
                            className="btn-cancel-edit"
                            onClick={onCancelEdit}
                            title="Cancelar"
                          >
                            ❌
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="btn-edit"
                            onClick={() => onEdit(row)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => onDelete(row.id)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DataTable