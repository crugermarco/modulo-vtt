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

  const handleSubmit = async (e) => {
    e.preventDefault()

    const validation = validators.validateShippingForm({ ...formData, rows })
    if (!validation.isValid) {
      setErrors(validation.errors)
      toast.error(Object.values(validation.errors)[0] || 'Complete todos los campos')
      return
    }

    const unitsPerPallet = parseInt(formData.unitsPerPallet) || 0
    const missingImages = []
    for (let i = 0; i < unitsPerPallet; i++) {
      if (!images[i]?.file) missingImages.push(i + 1)
    }
    if (missingImages.length > 0) {
      toast.error(`Faltan imagenes en las filas: ${missingImages.join(', ')}`)
      return
    }

    setLoading(true)

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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <ShimmerWrapper>
          <div className="modal-shipping">
            <div className="modal-header">
              <h2 className="modal-title">REGISTRA LAS TORRES POR PALLET</h2>
              <button className="modal-close" onClick={onClose} type="button">X</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
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
                    <option value="WB-RT-4-N">WB-RT-4-N</option>
                    <option value="WB-RT-4-N-ADA">WB-RT-4-N-ADA</option>
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
                          <th>Bar Code Number</th>
                          <th>Serial Number</th>
                          <th>Formato (JPG)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, displayRows).map((row, index) => (
                          <tr key={index}>
                            <td className="row-number">{index + 1}</td>
                            <td><input type="text" value={row.ul || ''} onChange={(e) => handleRowChange(index, 'ul', e.target.value)}
                              className="input-premium" placeholder={`UL ${index + 1}`} disabled={loading} /></td>
                            <td><input type="text" value={row.zabNumber || ''} onChange={(e) => handleRowChange(index, 'zabNumber', e.target.value)}
                              className="input-premium" placeholder={`ZAB${index + 1}`} disabled={loading} /></td>
                            <td><input type="text" value={row.serialWunder || ''} onChange={(e) => handleRowChange(index, 'serialWunder', e.target.value)}
                              className="input-premium" placeholder={`Serial ${index + 1}`} disabled={loading} /></td>
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
    </div>
  )
}

export default ModalShipping