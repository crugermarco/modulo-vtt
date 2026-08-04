import React, { useState } from 'react'
import ShimmerWrapper from './ShimmerWrapper'
import { ZABGeneratorEngine } from '../../utils/zabGeneratorEngine'
import { zabDatabaseService } from '../../services/zabDatabaseService'
import toast from 'react-hot-toast'
import './ZabGeneratorModal.css'

function ZabGeneratorModal({ isOpen, onClose, tableName }) {
  const [lastZabInput, setLastZabInput] = useState('') // ZAB que el usuario ingresa manualmente
  const [quantity, setQuantity] = useState(1)
  const [targetTable, setTargetTable] = useState(tableName || 'zab_database_normal')
  const [loading, setLoading] = useState(false)
  const [generatedCodes, setGeneratedCodes] = useState([])

  const generator = new ZABGeneratorEngine()

  const handleGenerate = async () => {
    // Validar que se haya ingresado un ZAB
    if (!lastZabInput.trim()) {
      toast.error('Debes ingresar el último ZAB que tienes')
      return
    }

    // Validar formato del ZAB ingresado
    if (!generator.validateZabFormat(lastZabInput.trim().toUpperCase())) {
      toast.error('El formato del ZAB no es válido. Debe ser: ZAB + 6 dígitos + 1 carácter (Ej: ZAB300000A)')
      return
    }

    if (quantity < 1 || quantity > 1000) {
      toast.error('La cantidad debe ser entre 1 y 1000')
      return
    }

    setLoading(true)
    setGeneratedCodes([])

    try {
      const cleanZab = lastZabInput.trim().toUpperCase()
      
      console.log('=== INICIANDO GENERACIÓN DE ZABs ===')
      console.log('Último ZAB ingresado:', cleanZab)
      console.log('Tabla destino:', targetTable)
      console.log('Cantidad a generar:', quantity)
      
      // Obtener el siguiente contador desde el ZAB ingresado
      const nextCounter = generator.getNextCounter(cleanZab)
      console.log('Siguiente contador:', nextCounter)

      // Generar códigos
      const result = generator.generateCodes(nextCounter, quantity)
      console.log('Códigos generados:', result.codes.map(c => c.code))
      
      // Guardar en la base de datos
      const codes = result.codes.map(c => c.code)
      await zabDatabaseService.insertZabs(targetTable, codes)

      setGeneratedCodes(codes)
      
      toast.success(`${codes.length} ZABs generados y guardados en ${targetTable === 'zab_database_normal' ? 'NORMAL' : 'ADA'}`)
      console.log('=== GENERACIÓN COMPLETADA ===')

    } catch (error) {
      console.error('Error detallado:', error)
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

  const handleClear = () => {
    setLastZabInput('')
    setQuantity(1)
    setGeneratedCodes([])
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
              {/* Input para el último ZAB */}
              <div className="form-group">
                <label className="form-label">
                  Último ZAB que tienes:
                  <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={lastZabInput}
                  onChange={(e) => setLastZabInput(e.target.value.toUpperCase())}
                  placeholder="Ejemplo: ZAB300000A"
                  className="input-premium zab-input"
                  maxLength={10}
                  autoFocus
                />
                <small className="form-hint">
                  Ingresa el último código ZAB que tienes registrado
                </small>
              </div>

              {/* Selección de tabla destino */}
              <div className="form-group">
                <label className="form-label">
                  Guardar en:
                  <span className="required">*</span>
                </label>
                <select
                  value={targetTable}
                  onChange={(e) => setTargetTable(e.target.value)}
                  className="input-premium"
                >
                  <option value="zab_database_normal">ZAB DATA BASE - NORMAL</option>
                  <option value="zab_database_ada">ZAB DATA BASE - ADA</option>
                </select>
              </div>

              {/* Cantidad a generar */}
              <div className="form-group">
                <label className="form-label">
                  Cantidad a Generar:
                  <span className="required">*</span>
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="input-premium"
                  min="1"
                  max="1000"
                />
                <small className="form-hint">
                  Mínimo 1, máximo 1000 ZABs
                </small>
              </div>

              {/* Vista previa del siguiente ZAB */}
              {lastZabInput.trim() && generator.validateZabFormat(lastZabInput.trim().toUpperCase()) && (
                <div className="preview-info">
                  <div className="preview-item">
                    <span className="preview-label">Último ZAB:</span>
                    <span className="preview-value">{lastZabInput.trim().toUpperCase()}</span>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">Siguiente contador:</span>
                    <span className="preview-value next">
                      {generator.getNextCounter(lastZabInput.trim().toUpperCase())}
                    </span>
                  </div>
                  <div className="preview-item">
                    <span className="preview-label">Se generarán:</span>
                    <span className="preview-value quantity">{quantity} ZABs</span>
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="generator-buttons">
                <button
                  className="btn-primary btn-generate"
                  onClick={handleGenerate}
                  disabled={loading || !lastZabInput.trim()}
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
                <button
                  className="btn-clear"
                  onClick={handleClear}
                  disabled={loading}
                >
                  🧹 Limpiar
                </button>
              </div>
            </div>

            {/* Resultados generados */}
            {generatedCodes.length > 0 && (
              <div className="generated-codes-section">
                <div className="codes-header">
                  <h3>✅ ZABs Generados ({generatedCodes.length})</h3>
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
                          toast.success('¡Copiado!')
                        }}
                      >
                        📋
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Información del generador */}
            <div className="generator-info">
              <h4>📝 Instrucciones</h4>
              <ul>
                <li>Ingresa el <strong>último código ZAB</strong> que tienes registrado</li>
                <li>Selecciona en qué <strong>base de datos</strong> se guardarán (NORMAL o ADA)</li>
                <li>Define <strong>cuántos ZABs</strong> necesitas generar</li>
                <li>Los nuevos ZABs se generarán a partir del siguiente al que ingresaste</li>
                <li>Formato: <strong>ZAB + 6 dígitos + 1 dígito verificador</strong></li>
              </ul>
            </div>
          </div>
        </ShimmerWrapper>
      </div>
    </div>
  )
}

export default ZabGeneratorModal