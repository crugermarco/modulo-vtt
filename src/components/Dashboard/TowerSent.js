import React, { useState, useEffect, useCallback } from 'react'
import { towerSentService } from '../../services/towerSentService'
import { zabDatabaseService } from '../../services/zabDatabaseService'
import { useAuth } from '../../context/AuthContext'
import { validators } from '../../utils/validators'
import ModalShipping from '../Modal/ModalShipping'
import DataTable from '../Tables/DataTable'
import toast from 'react-hot-toast'
import './TowerSent.css'

function TowerSent({ duplicateZabs }) {
  const { currentUser, canEdit, canDelete } = useAuth()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true)
      const data = await towerSentService.getAll()
      setRecords(data)
    } catch (error) {
      toast.error('Error al cargar registros')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  useEffect(() => {
    const handleOpenModal = () => setShowModal(true)
    window.addEventListener('openModalShipping', handleOpenModal)
    return () => window.removeEventListener('openModalShipping', handleOpenModal)
  }, [])

  useEffect(() => {
    const checkDuplicates = async () => {
      const blinkingIds = []
      for (const record of records) {
        if (record.zab_number) {
          try {
            const duplicates = await zabDatabaseService.checkDuplicateGlobally(record.zab_number)
            let totalCount = 0
            let hasAvailable = false

            if (duplicates['tower_sent']) {
              totalCount += duplicates['tower_sent'].length
            }
            if (duplicates['zab_database_normal']) {
              totalCount += duplicates['zab_database_normal'].length
              if (duplicates['zab_database_normal'].some(r => r.status === 'available')) {
                hasAvailable = true
              }
            }
            if (duplicates['zab_database_ada']) {
              totalCount += duplicates['zab_database_ada'].length
              if (duplicates['zab_database_ada'].some(r => r.status === 'available')) {
                hasAvailable = true
              }
            }

            if (totalCount >= 3 && hasAvailable) {
              blinkingIds.push(record.id)
            }
          } catch (error) {}
        }
      }
      setSelectedRows(blinkingIds)
    }

    if (records.length > 0) {
      checkDuplicates()
    }
  }, [records])

  const handleDelete = useCallback(async (id) => {
    if (!canDelete()) {
      toast.error('Solo Marco Cruger puede eliminar registros')
      return
    }

    const confirmed = window.confirm('Esta seguro de eliminar este registro?')
    if (!confirmed) return

    try {
      await towerSentService.delete(id)
      toast.success('Registro eliminado exitosamente')
      loadRecords()
    } catch (error) {
      toast.error('Error al eliminar registro')
    }
  }, [loadRecords, canDelete])

  const handleStartEdit = useCallback((record) => {
    if (!canEdit()) {
      toast.error('Solo Marco Cruger puede modificar registros')
      return
    }
    setEditingId(record.id)
    setEditValues({
      ul: record.ul || '',
      zab_number: record.zab_number || '',
      serial_wunder: record.serial_wunder || '',
      so: record.so || '',
      type: record.type || '',
      customer: record.customer || '',
      fecha: record.fecha || ''
    })
  }, [canEdit])

  const handleSaveEdit = useCallback(async (id) => {
    try {
      await towerSentService.update(id, editValues)
      toast.success('Registro actualizado exitosamente')
      setEditingId(null)
      setEditValues({})
      loadRecords()
    } catch (error) {
      toast.error('Error al actualizar registro')
    }
  }, [editValues, loadRecords])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValues({})
  }, [])

  const handleViewImage = useCallback(async (towerId) => {
    try {
      const images = await towerSentService.getImages(towerId)
      if (images && images.length > 0) {
        const imageUrl = images[0].image_url

        const overlay = document.createElement('div')
        overlay.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.95); display: flex; align-items: center;
          justify-content: center; z-index: 99999; cursor: pointer;
        `

        const img = document.createElement('img')
        img.src = imageUrl
        img.style.cssText = `
          max-width: 90vw; max-height: 90vh; object-fit: contain;
          border-radius: 12px;
        `

        overlay.appendChild(img)
        overlay.onclick = () => document.body.removeChild(overlay)
        document.body.appendChild(overlay)
      } else {
        toast.error('No hay imagen disponible')
      }
    } catch (error) {
      toast.error('Error al cargar imagen')
    }
  }, [])

  const columns = [
    { key: 'ul', label: 'UL', sortable: true },
    { key: 'zab_number', label: 'ZAB NUMBER', sortable: true },
    { key: 'serial_wunder', label: 'SERIAL WUNDER', sortable: true },
    { key: 'so', label: 'SO', sortable: true },
    { key: 'type', label: 'TYPE', sortable: true },
    { key: 'customer', label: 'CUSTOMER', sortable: true },
    { key: 'fecha', label: 'FECHA', sortable: true, format: validators.formatDate },
    { key: 'formatos', label: 'FORMATOS', sortable: false }
  ]

  return (
    <div className="tower-sent-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">TOWERS SENT</h1>
          <p className="page-description">
            Concentrado de todas las torres enviadas | Usuario: {currentUser?.name}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            Modal Shipping
          </button>
          <button className="btn-refresh" onClick={loadRecords} disabled={loading}>
            Actualizar
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-label">Total Registros</span>
          <span className="stat-value">{records.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">ZABs Duplicados</span>
          <span className="stat-value warning">{selectedRows.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ultimo Registro</span>
          <span className="stat-value small">
            {records.length > 0 ? validators.formatDate(records[0].created_at) : 'N/A'}
          </span>
        </div>
      </div>

      <div className="table-container card-premium">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando registros...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="empty-state">
            <h3>No hay registros</h3>
            <p>Utilice el Modal Shipping para agregar nuevos envios</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={records}
            selectedRows={selectedRows}
            editingId={editingId}
            editValues={editValues}
            onEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onDelete={handleDelete}
            onViewImage={handleViewImage}
            isAdmin={canDelete()}
            onEditChange={(field, value) => setEditValues(prev => ({ ...prev, [field]: value }))}
          />
        )}
      </div>

      <ModalShipping
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          loadRecords()
        }}
      />
    </div>
  )
}

export default TowerSent