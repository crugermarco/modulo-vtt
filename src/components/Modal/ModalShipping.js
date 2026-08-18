import React, { useState, useEffect, useCallback } from 'react'
import ShimmerWrapper from './ShimmerWrapper'
import { towerSentService } from '../../services/towerSentService'
import { generateShippingSheetPDF } from '../../utils/pdfGenerator'
import { validators } from '../../utils/validators'
import { zabDatabaseService } from '../../services/zabDatabaseService'
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
  const [showConfirm, setShowConfirm] = useState(false)
  const [availableZabs, setAvailableZabs] = useState({
    normal: [],
    ada: []
  })

  // Cargar ZABs disponibles al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadAvailableZabs()
    }
  }, [isOpen])

  const loadAvailableZabs = async () => {
    try {
      const normalZabs = await zabDatabaseService.getZabs('zab_database_normal')
      const adaZabs = await zabDatabaseService.getZabs('zab_database_ada')
      
      setAvailableZabs({
        normal: normalZabs.filter(z => z.status === 'available').map(z => z.zab_number),
        ada: adaZabs.filter(z => z.status === 'available').map(z => z.zab_number)
      })
    } catch (error) {
      console.error('Error cargando ZABs:', error)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
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

  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA)
      setRows([])
      setImages({})
      setErrors({})
      setLoading(false)
      setShowConfirm(false)
    }
  }, [isOpen])

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[name]; return n })
  }, [])

  const handleRowChange = useCallback((index, field, value) => {
    setRows(prev => {
      const newRows = [...prev]
      if (!newRows[index]) newRows[index] = { ul: '', zabNumber: '', serialWunder: '' }
      newRows[index] = { ...newRows[index], [field]: value }
      return newRows
    })
    setErrors(prev => { const n = { ...prev }; delete n[`row_${index}_${field}`]; return n })
  }, [])

  const handleImageUpload = useCallback((index, file) => {
    if (!file) return
    if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
      toast.error('Solo se permiten archivos JPG')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe superar 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => setImages(prev => ({ ...prev, [index]: { file, preview: e.target.result } }))
    reader.onerror = () => toast.error('Error al leer la imagen')
    reader.readAsDataURL(file)
  }, [])

  const removeImage = useCallback((index) => {
    setImages(prev => { const n = { ...prev }; delete n[index]; return n })
  }, [])

  // Validar UL con formato 90-6326-003
  const validateULFormat = (ul) => {
    const ulRegex = /^\d{2}-\d{4}-\d{3}$/
    return ulRegex.test(ul.trim())
  }

  // Validar ZAB: debe existir, estar disponible y no usado
  const validateZabInDatabase = (zabNumber) => {
    const isAdaModel = formData.type === 'WB-RT-4-N-ADA'
    const zabList = isAdaModel ? availableZabs.ada : availableZabs.normal
    
    // availableZabs YA contiene solo ZABs con status='available'
    // Por lo tanto si el ZAB está en la lista, NO ha sido utilizado
    if (!zabList.includes(zabNumber)) {
      return { 
        valid: false, 
        error: `ZAB ${zabNumber} no encontrado o ya fue utilizado en la base ${isAdaModel ? 'ADA' : 'NORMAL'}` 
      }
    }
    return { valid: true, error: null }
  }

  // Validar ZAB ya utilizado en tower_sent
  const validateZabNotInTowerSent = async (zabNumber) => {
    try {
      const duplicates = await towerSentService.findDuplicates(zabNumber)
      if (duplicates.length > 0) {
        return { 
          valid: false, 
          error: `ZAB ${zabNumber} ya existe en TOWER SENT` 
        }
      }
      return { valid: true, error: null }
    } catch (error) {
      console.error('Error validando tower_sent:', error)
      return { valid: true, error: null }
    }
  }

  const handleSubmitClick = async (e) => {
    e.preventDefault()
    const newErrors = {}
    let hasErrors = false

    // Validar formulario base
    const validation = validators.validateShippingForm({ ...formData, rows })
    if (!validation.isValid) {
      Object.assign(newErrors, validation.errors)
      hasErrors = true
    }

    const unitsPerPallet = parseInt(formData.unitsPerPallet) || 0
    const missingImages = []

    // Validar cada fila
    for (let i = 0; i < unitsPerPallet; i++) {
      const row = rows[i] || { ul: '', zabNumber: '', serialWunder: '' }

      // Validar formato UL
      if (row.ul && !validateULFormat(row.ul)) {
        newErrors[`row_${i}_ul`] = 'Formato requerido: XX-XXXX-XXX (ej: 90-6326-003)'
        hasErrors = true
      }

      // Validar ZAB en base de datos correspondiente
      if (row.zabNumber) {
        const zabValidation = validateZabInDatabase(row.zabNumber)
        if (!zabValidation.valid) {
          newErrors[`row_${i}_zab`] = zabValidation.error
          hasErrors = true
        } else {
          // Solo si pasó la primera validación, verificar tower_sent
          const towerValidation = await validateZabNotInTowerSent(row.zabNumber)
          if (!towerValidation.valid) {
            newErrors[`row_${i}_zab`] = towerValidation.error
            hasErrors = true
          }
        }
      }

      // Validar imagen
      if (!images[i]?.file) {
        missingImages.push(i + 1)
      }
    }

    if (missingImages.length > 0) {
      toast.error(`Faltan imagenes en las filas: ${missingImages.join(', ')}`)
      hasErrors = true
    }

    if (hasErrors) {
      setErrors(newErrors)
      const firstError = Object.values(newErrors)[0]
      toast.error(firstError || 'Corrige los errores antes de enviar')
      return
    }

    setShowConfirm(true)
  }

  const handleConfirmSubmit = async () => {
    setShowConfirm(false)
    setLoading(true)

    const unitsPerPallet = parseInt(formData.unitsPerPallet) || 0

    try {
      const towerRecords = rows.slice(0, unitsPerPallet).map((row) => ({
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

      const savedRecords = await towerSentService.insertBatch(towerRecords)

      for (let i = 0; i < savedRecords.length; i++) {
        if (images[i]?.file) {
          try {
            await towerSentService.uploadImage(images[i].file, savedRecords[i].id)
          } catch (imgError) {
            toast.error('Error al subir imagen: ' + imgError.message)
          }
        }
      }

      try {
        await generateShippingSheetPDF(formData, rows)
      } catch (pdfError) {
        toast.error('Registro guardado pero error al generar PDF')
      }

      toast.success('Envio registrado exitosamente')

      setFormData(INITIAL_FORM_DATA)
      setRows([])
      setImages({})
      setErrors({})
      setShowConfirm(false)
      onClose()

    } catch (error) {
      if (error.message?.includes('Bucket')) {
        toast.error('Bucket no existe. Creelo en Supabase Storage.')
      } else if (error.message?.includes('duplicate')) {
        toast.error('ZAB Number duplicado')
      } else {
        toast.error('Error: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const displayRows = Math.min(parseInt(formData.unitsPerPallet) || 0, 12)

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <ShimmerWrapper>
          <div className="modal-shipping">
            <div className="modal-header">
              <h2 className="modal-title">REGISTRA LAS TORRES POR PALLET</h2>
              <button className="modal-close" onClick={onClose} type="button">X</button>
            </div>

            <form onSubmit={handleSubmitClick} className="modal-form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Customer:</label>
                  <input type="text" name="customer" value={formData.customer} onChange={handleInputChange}
                    className={`input-premium ${errors.customer ? 'input-error' : ''}`} placeholder="Nombre del cliente" disabled={loading} />
                  {errors.customer && <span className="error-text">{errors.customer}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Total Units in P.O.:</label>
                  <input type="number" name="totalUnits" value={formData.totalUnits} onChange={handleInputChange}
                    className={`input-premium ${errors.totalUnits ? 'input-error' : ''}`} min="1" placeholder="Total" disabled={loading} />
                  {errors.totalUnits && <span className="error-text">{errors.totalUnits}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Units per Pallet: (MAX 12)</label>
                  <input type="number" name="unitsPerPallet" value={formData.unitsPerPallet} onChange={handleInputChange}
                    className={`input-premium ${errors.unitsPerPallet ? 'input-error' : ''}`} min="1" max="12" disabled={loading} />
                  {errors.unitsPerPallet && <span className="error-text">{errors.unitsPerPallet}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Product Model:</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} className="input-premium" disabled={loading}>
                    <option value="WB-RT-4-N">WB-RT-4-N (NORMAL)</option>
                    <option value="WB-RT-4-N-ADA">WB-RT-4-N-ADA (ADA)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Ship Date:</label>
                  <input type="date" name="fecha" value={formData.fecha} onChange={handleInputChange} className="input-premium" disabled={loading} />
                </div>
                <div className="form-group">
                  <label className="form-label">Purchase Order Number:</label>
                  <input type="text" name="so" value={formData.so} onChange={handleInputChange}
                    className={`input-premium ${errors.so ? 'input-error' : ''}`} placeholder="SO-000000" disabled={loading} />
                  {errors.so && <span className="error-text">{errors.so}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Pallet Number:</label>
                  <input type="text" name="palletNumber" value={formData.palletNumber} onChange={handleInputChange}
                    className={`input-premium ${errors.palletNumber ? 'input-error' : ''}`} placeholder="Numero de pallet" disabled={loading} />
                  {errors.palletNumber && <span className="error-text">{errors.palletNumber}</span>}
                </div>
              </div>

              {displayRows > 0 && (
                <div className="rows-section">
                  <h3 className="rows-title">Detalle de Unidades ({displayRows})</h3>
                  <div className="rows-table-container">
                    <table className="rows-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Serial Number (ABC, Inc.)</th>
                          <th>Bar Code Number (ZAB)</th>
                          <th>Serial Number</th>
                          <th>Formato (JPG)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, displayRows).map((row, index) => (
                          <tr key={index}>
                            <td className="row-number">{index + 1}</td>
                            <td>
                              <input type="text" value={row.ul || ''} onChange={(e) => handleRowChange(index, 'ul', e.target.value)}
                                className={`input-premium ${errors[`row_${index}_ul`] ? 'input-error' : ''}`} 
                                placeholder="90-6326-003" disabled={loading} />
                              {errors[`row_${index}_ul`] && <span className="error-text">{errors[`row_${index}_ul`]}</span>}
                            </td>
                            <td>
                              <input type="text" value={row.zabNumber || ''} onChange={(e) => handleRowChange(index, 'zabNumber', e.target.value)}
                                className={`input-premium ${errors[`row_${index}_zab`] ? 'input-error' : ''}`} 
                                placeholder={`ZAB (${formData.type === 'WB-RT-4-N-ADA' ? 'ADA' : 'NORMAL'})`} disabled={loading} />
                              {errors[`row_${index}_zab`] && <span className="error-text">{errors[`row_${index}_zab`]}</span>}
                            </td>
                            <td>
                              <input type="text" value={row.serialWunder || ''} onChange={(e) => handleRowChange(index, 'serialWunder', e.target.value)}
                                className="input-premium" placeholder={`Serial ${index + 1}`} disabled={loading} />
                            </td>
                            <td>
                              <div className="image-upload">
                                <input type="file" accept="image/jpeg,image/jpg" onChange={(e) => handleImageUpload(index, e.target.files[0])}
                                  className="file-input" id={`image-${index}`} disabled={loading} />
                                <label htmlFor={`image-${index}`} className="file-label">
                                  {images[index]?.preview ? (
                                    <div className="image-preview-container">
                                      <img src={images[index].preview} alt="Preview" className="image-preview" />
                                      <button type="button" className="image-remove" onClick={(e) => { e.preventDefault(); removeImage(index) }} disabled={loading}>X</button>
                                    </div>
                                  ) : (<span className="upload-placeholder">Subir JPG</span>)}
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

              <div className="form-actions">
                <button type="submit" className="btn-primary btn-submit" disabled={loading}>
                  {loading ? 'Procesando...' : 'ENVIAR'}
                </button>
                <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>Cancelar</button>
              </div>
            </form>
          </div>
        </ShimmerWrapper>
      </div>

      {showConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-modal">
            <div className="confirm-header">
              <h3>CONFIRMAR ENVIO</h3>
              <button className="confirm-close" onClick={() => setShowConfirm(false)}>X</button>
            </div>
            <div className="confirm-body">
              <div className="confirm-icon">!</div>
              <p className="confirm-message">
                Esta seguro de enviar este pallet?<br/>
                Esta accion no se puede deshacer.
              </p>
              <div className="confirm-summary">
                <div className="summary-row">
                  <span>Customer:</span>
                  <strong>{formData.customer}</strong>
                </div>
                <div className="summary-row">
                  <span>PO Number:</span>
                  <strong>{formData.so}</strong>
                </div>
                <div className="summary-row">
                  <span>Pallet Number:</span>
                  <strong>{formData.palletNumber}</strong>
                </div>
                <div className="summary-row">
                  <span>Unidades:</span>
                  <strong>{formData.unitsPerPallet}</strong>
                </div>
                <div className="summary-row">
                  <span>Modelo:</span>
                  <strong>{formData.type}</strong>
                </div>
              </div>
            </div>
            <div className="confirm-actions">
              <button className="btn-confirm" onClick={handleConfirmSubmit} disabled={loading}>
                {loading ? 'Procesando...' : 'CONFIRMAR ENVIO'}
              </button>
              <button className="btn-cancel-confirm" onClick={() => setShowConfirm(false)} disabled={loading}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModalShipping