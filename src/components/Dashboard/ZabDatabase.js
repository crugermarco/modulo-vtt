import React, { useState, useEffect, useCallback } from 'react'
import { zabDatabaseService } from '../../services/zabDatabaseService'
import { validators } from '../../utils/validators'
import ZabGeneratorModal from '../Modal/ZabGeneratorModal'
import toast from 'react-hot-toast'
import './ZabDatabase.css'

function ZabDatabase({ tableName, title, duplicateZabs }) {
  const [zabs, setZabs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [availableCount, setAvailableCount] = useState(0)

  // Cargar ZABs
  const loadZabs = useCallback(async () => {
    try {
      setLoading(true)
      const data = await zabDatabaseService.getZabs(tableName)
      setZabs(data)
      
      const count = await zabDatabaseService.countAvailable(tableName)
      setAvailableCount(count)
    } catch (error) {
      console.error('Error loading ZABs:', error)
      toast.error('Error al cargar ZABs')
    } finally {
      setLoading(false)
    }
  }, [tableName])

  useEffect(() => {
    loadZabs()
  }, [loadZabs])

  // Descargar CSV
  const handleDownloadCSV = useCallback(async () => {
    try {
      const csvData = await zabDatabaseService.downloadCSV(tableName)
      
      // Crear blob y descargar
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
      
      toast.success('CSV descargado exitosamente')
    } catch (error) {
      console.error('Error downloading CSV:', error)
      toast.error('Error al descargar CSV')
    }
  }, [tableName])

  // Obtener color del contador
  const counterColor = validators.getCounterColor(availableCount)
  const counterStatus = availableCount >= 200 ? 'Óptimo' : availableCount >= 100 ? 'Medio' : 'Crítico'

  return (
    <div className="zab-database-page">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">{title}</h1>
          <p className="page-description">Base de datos de códigos ZAB</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn-primary"
            onClick={() => setShowGenerator(true)}
          >
            <span className="btn-icon"></span>
            Generar ZAB
          </button>
          <button 
            className="btn-download"
            onClick={handleDownloadCSV}
          >
             Descargar CSV
          </button>
          <button 
            className="btn-refresh"
            onClick={loadZabs}
            disabled={loading}
          >
             Actualizar
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <span className="stat-label">Total ZABs</span>
          <span className="stat-value">{zabs.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Disponibles</span>
          <span className="stat-value" style={{ color: counterColor }}>
            {availableCount}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Estado</span>
          <span className="stat-value status" style={{ color: counterColor }}>
            <span 
              className="status-dot" 
              style={{ 
                backgroundColor: counterColor,
                boxShadow: `0 0 10px ${counterColor}`
              }}
            ></span>
            {counterStatus}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Utilizados</span>
          <span className="stat-value used">
            {zabs.filter(z => z.status === 'used').length}
          </span>
        </div>
      </div>

      <div className="zab-grid card-premium">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Cargando ZABs...</p>
          </div>
        ) : zabs.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"></span>
            <h3>No hay ZABs generados</h3>
            <p>Utilice el botón "Generar ZAB" para crear nuevos códigos</p>
          </div>
        ) : (
          <div className="zab-list">
            <div className="zab-list-header">
              <span className="zab-header-item">#</span>
              <span className="zab-header-item">ZAB Number</span>
              <span className="zab-header-item">Estado</span>
              <span className="zab-header-item">Fecha Creación</span>
            </div>
            {zabs.map((zab, index) => (
              <div 
                key={zab.id} 
                className={`zab-item ${duplicateZabs.includes(zab.zab_number) ? 'duplicate' : ''} ${zab.status === 'used' ? 'used' : 'available'}`}
              >
                <span className="zab-index">{index + 1}</span>
                <span className="zab-number">{zab.zab_number}</span>
                <span className={`zab-status ${zab.status}`}>
                  {zab.status === 'available' ? '✅ Disponible' : '🔴 Utilizado'}
                </span>
                <span className="zab-date">
                  {validators.formatDate(zab.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ZabGeneratorModal
        isOpen={showGenerator}
        onClose={() => {
          setShowGenerator(false)
          loadZabs()
        }}
        tableName={tableName}
      />
    </div>
  )
}

export default ZabDatabase