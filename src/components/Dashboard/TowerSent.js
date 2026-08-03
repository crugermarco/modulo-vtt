import React, { useState, useEffect, useCallback } from 'react'
import { towerSentService } from '../../services/towerSentService'
import { zabDatabaseService } from '../../services/zabDatabaseService'
import { isAdmin } from '../../services/supabaseClient'
import { validators } from '../../utils/validators'
import ModalShipping from '../Modal/ModalShipping'
import DataTable from '../Tables/DataTable'
import toast from 'react-hot-toast'
import './TowerSent.css'

function TowerSent({ currentUser, duplicateZabs }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRows, setSelectedRows] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const adminUser = isAdmin(currentUser?.email)

  // Cargar registros
  const loadRecords = useCallback(async () => {
    try {
      setLoading(true)
      const data = await towerSentService.getAll()
      setRecords(data)
    } catch (error) {
      console.error('Error loading records:', error)
      toast.error('Error al cargar registros')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRecords()
  }, [loadRecords])

  // Escuchar evento para abrir modal
  useEffect(() => {
    const handleOpenModal = () => setShowModal(true)
    window.addEventListener('openModalShipping', handleOpenModal)
    return () => window.removeEventListener('openModalShipping', handleOpenModal)
  }, [])

  // Verificar duplicados
  useEffect(() => {
    const checkDuplicates = async () => {
      for (const record of records) {
        if (record.zab_number) {
          const duplicates = await zabDatabaseService.checkDuplicateGlobally(record.zab_number)
          const totalDupes = Object.values(duplicates).reduce((sum, arr) => sum + arr.length, 0)
          
          if (totalDupes > 1) {
            setSelectedRows(prev => {
              if (!prev.includes(record.id)) {
                return [...prev, record.id]
              }
              return prev
            })
          }
        }
      }
    }
    
    if (records.length > 0) {
      checkDuplicates()
    }
  }, [records])

  // Manejar eliminación (solo admin)
  const handleDelete = useCallback(async (id) => {
    if (!adminUser) {
      toast.error('Solo el administrador puede eliminar registros')
      return
    }

    const confirmed = window.confirm('¿Está seguro de eliminar este registro?')
    if (!confirmed) return

    try {
      await towerSentService.delete(id)
      toast.success('Registro eliminado exitosamente')
      loadRecords()
    } catch (error) {
      console.error('Error deleting record:', error)
      toast.error('Error al eliminar registro')
    }
  }, [adminUser, loadRecords])

  // Iniciar edición
  const handleStartEdit = useCallback((record) => {
    if (!adminUser) {
      toast.error('Solo el administrador puede modificar registros')
      return
    }
    setEditingId(record.id)
    setEditValues({
      ul: record.ul,
      zab_number: record.zab_number,
      serial_wunder: record.serial_wunder,
      so: record.so,
      type: record.type,
      customer: record.customer,
      fecha: record.fecha
    })
  }, [adminUser])

  // Guardar edición
  const handleSaveEdit = useCallback(async (id) => {
    try {
      await towerSentService.update(id, editValues)
      toast.success('Registro actualizado exitosamente')
      setEditingId(null)
      setEditValues({})
      loadRecords()
    } catch (error) {
      console.error('Error updating record:', error)
      toast.error('Error al actualizar registro')
    }
  }, [editValues, loadRecords])

  // Cancelar edición
  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditValues({})
  }, [])

  // Ver imagen
  const handleViewImage = useCallback(async (towerId) => {
    try {
      const images = await towerSentService.getImages(towerId)
      if (images.length > 0) {
        window.open(images[0].image_url, '_blank')
      } else {
        toast.error('No hay imagen disponible')
      }
    } catch (error) {
      console.error('Error loading image:', error)
      toast.error('Error al cargar imagen')
    }
  }, [])

  // Columnas de la tabla
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
          <p className="page-description">Concentrado de todas las torres enviadas</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowModal(true)}
          >
            <span className="btn-icon">📦</span>
            Modal Shipping
          </button>
          <button 
            className="btn-refresh"
            onClick={loadRecords}
            disabled={loading}
          >
            🔄 Actualizar
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
          <span className="stat-value warning">{duplicateZabs.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Último Registro</span>
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
            <span className="empty-icon">📭</span>
            <h3>No hay registros</h3>
            <p>Utilice el Modal Shipping para agregar nuevos envíos</p>
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
            isAdmin={adminUser}
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