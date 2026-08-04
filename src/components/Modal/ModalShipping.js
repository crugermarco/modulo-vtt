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

  // Cerrar con tecla Escape
  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e) => {
        if (e.key === 'Escape') onClose()
      }
      window.addEventListener('keydown', handleEsc)
      return () => window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, onClose])

  // Generar filas dinámicas según unitsPerPallet
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

  // Resetear formulario cuando se abre
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA)
      setRows([])
      setImages({})
      setErrors({})
      setLoading(false)
    }
  }, [isOpen])

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Limpiar error del campo
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[name]
      return newErrors
    })
  }, [])

  const handleRowChange = useCallback((index, field, value) => {
    setRows(prev => {
      const newRows = [...prev]
      if (!newRows[index]) {
        newRows[index] = { ul: '', zabNumber: '', serialWunder: '' }
      }
      newRows[index] = { ...newRows[index], [field]: value }
      return newRows
    })
    // Limpiar error de la fila
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[`row_${index}_${field}`]
      return newErrors
    })
  }, [])

  const handleImageUpload = useCallback((index, file) => {
    if (file) {
      // Validar que sea JPG
      if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
        toast.error('Solo se permiten archivos JPG')
        return
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar 5MB')
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        setImages(prev => ({ ...prev, [index]: { file, preview: e.target.result } }))
      }
      reader.onerror = () => {
        toast.error('Error al leer la imagen')
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const removeImage = useCallback((index) => {
    setImages(prev => {
      const newImages = { ...prev }
      delete newImages[index]
      return newImages
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validar formulario
    const validation = validators.validateShippingForm({ ...formData, rows })
    if (!validation.isValid) {
      setErrors(validation.errors)
      const firstError = Object.values(validation.errors)[0]
      toast.error(firstError || 'Por favor complete todos los campos requeridos')
      return
    }

    // Verificar que todas las filas tengan imagen
    const unitsPerPallet = parseInt(formData.unitsPerPallet) || 0
    const missingImages = []
    for (let i = 0; i < unitsPerPallet; i++) {
      if (!images[i]?.file) {
        missingImages.push(i + 1)
      }
    }
    if (missingImages.length > 0) {
      toast.error(`Faltan imágenes JPG en las filas: ${missingImages.join(', ')}`)
      return
    }

    setLoading(true)

    try {
      console.log('=== INICIANDO ENVÍO DE PALLET ===')
      console.log('Datos del formulario:', formData)
      console.log('Filas:', rows)
      console.log('Imágenes:', Object.keys(images).length)

      // Preparar registros para Tower Sent
      const towerRecords = rows.slice(0, unitsPerPallet).map((row, index) => ({
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

      console.log('Registros a guardar:', towerRecords)

      // Guardar en Tower Sent
      const savedRecords = await towerSentService.insertBatch(towerRecords)
      console.log('Registros guardados en Tower Sent:', savedRecords)

      // Subir imágenes (continuar aunque alguna falle)
      const imageResults = []
      for (let i = 0; i < savedRecords.length; i++) {
        if (images[i]?.file) {
          try {
            const result = await towerSentService.uploadImage(images[i].file, savedRecords[i].id)
            imageResults.push({ index: i, success: true, result })
            console.log(`Imagen ${i + 1} subida correctamente`)
          } catch (imgError) {
            console.error(`Error subiendo imagen ${i + 1}:`, imgError)
            imageResults.push({ index: i, success: false, error: imgError })
          }
        }
      }

      // Generar PDF (no detener si falla)
      try {
        console.log('Generando PDF...')
        await generateShippingSheetPDF(formData, rows)
        console.log('PDF generado correctamente')
      } catch (pdfError) {
        console.error('Error generando PDF:', pdfError)
        toast.error('Registro guardado pero hubo error al generar el PDF')
      }

      // Verificar si todas las imágenes se subieron
      const failedImages = imageResults.filter(r => !r.success)
      if (failedImages.length > 0) {
        toast.warning(`${savedRecords.length} registros guardados. ${failedImages.length} imágenes no se pudieron subir.`)
      } else {
        toast.success(`✅ ${savedRecords.length} torres registradas exitosamente`)
      }

      console.log('=== ENVÍO COMPLETADO ===')
      
      // Limpiar formulario
      setFormData(INITIAL_FORM_DATA)
      setRows([])
      setImages({})
      setErrors({})
      onClose()

    } catch (error) {
      console.error('Error al guardar:', error)
      
      // Mensaje de error más descriptivo
      if (error.message?.includes('Bucket not found')) {
        toast.error('Error: Bucket de almacenamiento no configurado en Supabase. Crea el bucket "tower-images"')
      } else if (error.message?.includes('row-level security')) {
        toast.error('Error: Política de seguridad en Supabase. Ejecuta el script SQL de políticas.')
      } else if (error.message?.includes('duplicate key')) {
        toast.error('Error: ZAB Number duplicado. Verifica los datos.')
      } else {
        toast.error('Error al procesar el envío: ' + (error.message || 'Error desconocido'))
      }
    } finally {
      setLoading(false)
    }
  }

  // Si el modal no está abierto, no renderizar nada
  if (!isOpen) return null

  // Calcular filas a mostrar
  const unitsPerPallet = parseInt(formData.unitsPerPallet) || 0
  const displayRows = Math.min(unitsPerPallet, 12)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <ShimmerWrapper>
          <div className="modal-shipping">
            <div className="modal-header">
              <h2 className="modal-title">REGISTRA LAS TORRES POR PALLET</h2>
              <button 
                className="modal-close" 
                onClick={onClose}
                type="button"
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {/* Campos principales */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Customer:</label>
                  <input
                    type="text"
                    name="customer"
                    value={formData.customer}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.customer ? 'input-error' : ''}`}
                    placeholder="Nombre del cliente"
                    disabled={loading}
                  />
                  {errors.customer && <span className="error-text">{errors.customer}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Total Units in P.O.:</label>
                  <input
                    type="number"
                    name="totalUnits"
                    value={formData.totalUnits}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.totalUnits ? 'input-error' : ''}`}
                    min="1"
                    placeholder="Total de unidades"
                    disabled={loading}
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
                    placeholder="1-12"
                    disabled={loading}
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
                    disabled={loading}
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
                    disabled={loading}
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
                    placeholder="SO-000000"
                    disabled={loading}
                  />
                  {errors.so && <span className="error-text">{errors.so}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Pallet Number:</label>
                  <input
                    type="text"
                    name="palletNumber"
                    value={formData.palletNumber}
                    onChange={handleInputChange}
                    className={`input-premium ${errors.palletNumber ? 'input-error' : ''}`}
                    placeholder="Número de pallet"
                    disabled={loading}
                  />
                  {errors.palletNumber && <span className="error-text">{errors.palletNumber}</span>}
                </div>
              </div>

              {/* Tabla de filas dinámicas */}
              {displayRows > 0 && (
                <div className="rows-section">
                  <h3 className="rows-title">
                    Detalle de Unidades 
                    <span className="rows-count">({displayRows} unidades)</span>
                  </h3>
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
                        {rows.slice(0, displayRows).map((row, index) => (
                          <tr key={index}>
                            <td className="row-number">{index + 1}</td>
                            <td>
                              <input
                                type="text"
                                value={row.ul || ''}
                                onChange={(e) => handleRowChange(index, 'ul', e.target.value)}
                                className={`input-premium ${errors[`row_${index}_ul`] ? 'input-error' : ''}`}
                                placeholder={`UL ${index + 1}`}
                                disabled={loading}
                              />
                              {errors[`row_${index}_ul`] && (
                                <span className="error-text">{errors[`row_${index}_ul`]}</span>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={row.zabNumber || ''}
                                onChange={(e) => handleRowChange(index, 'zabNumber', e.target.value)}
                                className={`input-premium ${errors[`row_${index}_zab`] ? 'input-error' : ''}`}
                                placeholder={`ZAB${index + 1}`}
                                disabled={loading}
                              />
                              {errors[`row_${index}_zab`] && (
                                <span className="error-text">{errors[`row_${index}_zab`]}</span>
                              )}
                            </td>
                            <td>
                              <input
                                type="text"
                                value={row.serialWunder || ''}
                                onChange={(e) => handleRowChange(index, 'serialWunder', e.target.value)}
                                className={`input-premium ${errors[`row_${index}_serial`] ? 'input-error' : ''}`}
                                placeholder={`Serial ${index + 1}`}
                                disabled={loading}
                              />
                              {errors[`row_${index}_serial`] && (
                                <span className="error-text">{errors[`row_${index}_serial`]}</span>
                              )}
                            </td>
                            <td>
                              <div className="image-upload">
                                <input
                                  type="file"
                                  accept="image/jpeg,image/jpg"
                                  onChange={(e) => handleImageUpload(index, e.target.files[0])}
                                  className="file-input"
                                  id={`image-${index}`}
                                  disabled={loading}
                                />
                                <label htmlFor={`image-${index}`} className="file-label">
                                  {images[index]?.preview ? (
                                    <div className="image-preview-container">
                                      <img 
                                        src={images[index].preview} 
                                        alt={`Vista previa ${index + 1}`} 
                                        className="image-preview" 
                                      />
                                      <button
                                        type="button"
                                        className="image-remove"
                                        onClick={(e) => {
                                          e.preventDefault()
                                          removeImage(index)
                                        }}
                                        disabled={loading}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="upload-placeholder">
                                      📷<br/>Subir JPG
                                    </span>
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
              )}

              {/* Botones de acción */}
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
                    '📦 ENVIAR'
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