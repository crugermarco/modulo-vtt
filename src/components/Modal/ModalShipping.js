import React, { useState, useEffect, useCallback } from 'react'
import ShimmerWrapper from './ShimmerWrapper'
import { towerSentService } from '../../services/towerSentService'
import { generateShippingSheetPDF } from '../../utils/pdfGenerator'
import { validators } from '../../utils/validators'
import toast from 'react-hot-toast'
import './ModalShipping.css'

const INITIAL_FORM_DATA = {
  customer: '',
  totalUnits: '',
  unitsPerPallet: 1,
  so: '',
  type: 'WB-RT-4-N',
  fecha: new Date().toISOString().split('T')[0],
  palletNumber: ''
}

function ModalShipping({ isOpen, onClose }) {
  const [formData, setFormData] = useState(INITIAL_FORM_DATA)
  const [rows, setRows] = useState([])
  const [images, setImages] = useState({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    const units = parseInt(formData.unitsPerPallet) || 0
    const maxUnits = Math.min(units, 12)
    setRows(prev => {
      const newRows = [...prev]
      while (newRows.length < maxUnits) {
        newRows.push({ ul: '', zabNumber: '', serialWunder: '' })
      }
      return newRows.slice(0, maxUnits)
    })
  }, [formData.unitsPerPallet])

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }, [])

  const handleRowChange = useCallback((index, field, value) => {
    setRows(prev => {
      const newRows = [...prev]
      newRows[index] = { ...newRows[index], [field]: value }
      return newRows
    })
    setErrors(prev => ({ ...prev, [`row_${index}_${field}`]: '' }))
  }, [])

  const handleImageUpload = useCallback((index, file) => {
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => ({ ...prev, [index]: { file, preview: e.target.result } }))
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar formulario
    const validation = validators.validateShippingForm({ ...formData, rows })
    if (!validation.isValid) {
      setErrors(validation.errors)
      toast.error('Por favor complete todos los campos requeridos')
      return
    }

    // Verificar que todas las filas tengan imagen
    const missingImages = []
    for (let i = 0; i < formData.unitsPerPallet; i++) {
      if (!images[i]) {
        missingImages.push(i + 1)
      }
    }
    if (missingImages.length > 0) {
      toast.error(`Faltan imágenes en las filas: ${missingImages.join(', ')}`)
      return
    }

    setLoading(true)

    try {
      // Preparar registros para Tower Sent
      const towerRecords = rows.slice(0, formData.unitsPerPallet).map(row => ({
        ul: row.ul,
        zab_number: row.zabNumber,
        serial_wunder: row.serialWunder,
        so: formData.so,
        type: formData.type,
        customer: formData.customer,
        fecha: formData.fecha,
        formatos: 'JPG',
        created_by: 'Marco Cruger'
      }))

      // Guardar en Tower Sent
      const savedRecords = await towerSentService.insertBatch(towerRecords)

      // Subir imágenes
      for (let i = 0; i < savedRecords.length; i++) {
        if (images[i]?.file) {
          await towerSentService.uploadImage(images[i].file, savedRecords[i].id)
        }
      }

      // Generar PDF
      await generateShippingSheetPDF(formData, rows)

      toast.success('Envío registrado exitosamente')
      
      // Limpiar formulario
      setFormData(INITIAL_FORM_DATA)
      setRows([])
      setImages({})
      setErrors({})
      onClose()

    } catch (error) {
      console.error('Error al guardar:', error)
      toast.error('Error al procesar el envío: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <ShimmerWrapper>
          <div className="modal-shipping">
            <div className="modal-header">
              <h2 className="modal-title">REGISTRA LAS TORRES POR PALLET</h2>
              <button className="modal-close" onClick={onClose}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Total Units in P.O.:</label>
                  <input
                    type="number"
                    name="totalUnits"
                    value={formData.totalUnits}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.totalUnits ? 'input-error' : ''}`}
                    min="1"
                  />
                  {errors.totalUnits && <span className="error-text">{errors.totalUnits}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Units per Pallet: (MÁXIMO 12)</label>
                  <input
                    type="number"
                    name="unitsPerPallet"
                    value={formData.unitsPerPallet}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.unitsPerPallet ? 'input-error' : ''}`}
                    min="1"
                    max="12"
                  />
                  {errors.unitsPerPallet && <span className="error-text">{errors.unitsPerPallet}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Product Model:</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    className="input-premium"
                  >
                    <option value="WB-RT-4-N">WB-RT-4-N</option>
                    <option value="WB-RT-4-N-ADA">WB-RT-4-N-ADA</option>
                  </select>
                  {errors.type && <span className="error-text">{errors.type}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Ship Date:</label>
                  <input
                    type="date"
                    name="fecha"
                    value={formData.fecha}
                    onChange={handleInputChange}
                    className="input-premium"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Purchase Order Number:</label>
                  <input
                    type="text"
                    name="so"
                    value={formData.so}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.so ? 'input-error' : ''}`}
                  />
                  {errors.so && <span className="error-text">{errors.so}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Customer:</label>
                  <input
                    type="text"
                    name="customer"
                    value={formData.customer}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.customer ? 'input-error' : ''}`}
                  />
                  {errors.customer && <span className="error-text">{errors.customer}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Pallet Number:</label>
                  <input
                    type="text"
                    name="palletNumber"
                    value={formData.palletNumber}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.palletNumber ? 'input-error' : ''}`}
                  />
                  {errors.palletNumber && <span className="error-text">{errors.palletNumber}</span>}
                </div>
              </div>

              {/* Tabla de filas dinámicas */}
              <div className="rows-section">
                <h3 className="rows-title">Detalle de Unidades</h3>
                <div className="rows-table-container">
                  <table className="rows-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Serial Number (ABC, Inc.)</th>
                        <th>Bar Code Number (Coca-Cola Co.)</th>
                        <th>Serial Number</th>
                        <th>Formato (JPG)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => (
                        <tr key={index}>
                          <td className="row-number">{index + 1}</td>
                          <td>
                            <input
                              type="text"
                              value={row.ul}
                              onChange={(e) => handleRowChange(index, 'ul', e.target.value)}
                              className={`input-premium ${errors[`row_${index}_ul`] ? 'input-error' : ''}`}
                              placeholder={`UL ${index + 1}`}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.zabNumber}
                              onChange={(e) => handleRowChange(index, 'zabNumber', e.target.value)}
                              className={`input-premium ${errors[`row_${index}_zab`] ? 'input-error' : ''}`}
                              placeholder={`ZAB${index + 1}`}
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              value={row.serialWunder}
                              onChange={(e) => handleRowChange(index, 'serialWunder', e.target.value)}
                              className={`input-premium ${errors[`row_${index}_serial`] ? 'input-error' : ''}`}
                              placeholder={`Serial ${index + 1}`}
                            />
                          </td>
                          <td>
                            <div className="image-upload">
                              <input
                                type="file"
                                accept="image/jpeg"
                                onChange={(e) => handleImageUpload(index, e.target.files[0])}
                                className="file-input"
                                id={`image-${index}`}
                              />
                              <label htmlFor={`image-${index}`} className="file-label">
                                {images[index] ? (
                                  <img src={images[index].preview} alt="Preview" className="image-preview" />
                                ) : (
                                  <span className="upload-placeholder">📷 Subir JPG</span>
                                )}
                              </label>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-primary btn-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Procesando...
                    </>
                  ) : (
                    'ENVIAR'
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </ShimmerWrapper>
      </div>
    </div>
  )
}

export default ModalShipping