import React, { useState } from 'react'
import ShimmerWrapper from './ShimmerWrapper'
import { ZABGeneratorEngine } from '../../utils/zabGeneratorEngine'
import { zabDatabaseService } from '../../services/zabDatabaseService'
import toast from 'react-hot-toast'
import './ZabGeneratorModal.css'

function ZabGeneratorModal({ isOpen, onClose, tableName }) {
  const [quantity, setQuantity] = useState(1)
  const [targetTable, setTargetTable] = useState(tableName || 'zab_database_normal')
  const [loading, setLoading] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState([])

  const generator = new ZABGeneratorEngine()

  const handleGenerate = async () => {
    if (quantity < 1 || quantity > 1000) {
      toast.error('La cantidad debe ser entre 1 y 1000')
      return
    }

    setLoading(true)
    setGeneratedCodes([])

    try {
      // Obtener último ZAB de la tabla destino
      const lastZab = await zabDatabaseService.getLastZab(targetTable)
      const nextCounter = generator.getNextCounter(lastZab)

      // Generar códigos
      const result = generator.generateCodes(nextCounter, quantity)
      
      // Guardar en la base de datos
      const codes = result.codes.map(c => c.code)
      await zabDatabaseService.insertZabs(targetTable, codes)

      setGeneratedCodes(codes)
      toast.success(`${codes.length} ZABs generados exitosamente`)

    } catch (error) {
      console.error('Error generating ZABs:', error)
      toast.error('Error al generar ZABs: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyAll = () => {
    const text = generatedCodes.join('\n')
    navigator.clipboard.writeText(text).then(() => {
      toast.success('ZABs copiados al portapapeles')
    })
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-small" onClick={(e) => e.stopPropagation()}>
        <ShimmerWrapper>
          <div className="zab-generator-modal">
            <div className="modal-header">
              <h2 className="modal-title">GENERADOR DE ZAB</h2>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>

            <div className="generator-form">
              <div className="form-group">
                <label className="form-label">Tabla Destino:</label>
                <select
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  className="input-premium"
                >
                  <option value="zab_database_normal">ZAB DATA BASE - NORMAL</option>
                  <option value="zab_database_ada">ZAB DATA BASE - ADA</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cantidad a Generar (1-1000):</label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="input-premium"
                  min="1"
                  max="1000"
                />
              </div>

              <button
                className="btn-primary btn-generate"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Generando...
                  </>
                ) : (
                  '🔢 Generar ZABs'
                )}
              </button>
            </div>

            {generatedCodes.length > 0 && (
              <div className="generated-codes-section">
                <div className="codes-header">
                  <h3>ZABs Generados ({generatedCodes.length})</h3>
                  <button 
                    className="btn-copy-all"
                    onClick={handleCopyAll}
                  >
                    📋 Copiar Todos
                  </button>
                </div>
                <div className="codes-list">
                  {generatedCodes.map((code, index) => (
                    <div key={index} className="code-item">
                      <span className="code-index">{index + 1}</span>
                      <span className="code-value">{code}</span>
                      <button
                        className="btn-copy-one"
                        onClick={() => {
                          navigator.clipboard.writeText(code)
                          toast.success('Copiado!')
                        }}
                      >
                        📋
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="generator-info">
              <h4>Información del Generador</h4>
              <ul>
                <li>Los ZABs se generan secuencialmente desde el último registrado</li>
                <li>Formato: ZAB + 6 dígitos + 1 dígito verificador</li>
                <li>El dígito verificador se calcula con algoritmo ponderado</li>
                <li>Base: 36 caracteres (0-9, A-Z)</li>
              </ul>
            </div>
          </div>
        </ShimmerWrapper>
      </div>
    </div>
  )
}

export default ZabGeneratorModal