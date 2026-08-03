export const validators = {
  // Validar formato ZAB
  isValidZAB(zab) {
    const regex = /^ZAB\d{6}[0-9A-Z]$/
    return regex.test(zab)
  },

  // Validar que units per pallet esté entre 1 y 12
  isValidUnitsPerPallet(value) {
    const num = parseInt(value)
    return !isNaN(num) && num >= 1 && num <= 12
  },

  // Validar campos requeridos del formulario
  validateShippingForm(formData) {
    const errors = {}
    
    if (!formData.customer?.trim()) {
      errors.customer = 'Customer es requerido'
    }
    
    if (!formData.totalUnits || formData.totalUnits < 1) {
      errors.totalUnits = 'Total Units debe ser mayor a 0'
    }
    
    if (!formData.unitsPerPallet || !this.isValidUnitsPerPallet(formData.unitsPerPallet)) {
      errors.unitsPerPallet = 'Units per Pallet debe ser entre 1 y 12'
    }
    
    if (!formData.so?.trim()) {
      errors.so = 'Purchase Order Number es requerido'
    }
    
    if (!formData.type) {
      errors.type = 'Product Model es requerido'
    }
    
    if (!formData.palletNumber?.trim()) {
      errors.palletNumber = 'Pallet Number es requerido'
    }

    // Validar filas
    const rows = formData.rows || []
    for (let i = 0; i < formData.unitsPerPallet; i++) {
      const row = rows[i] || {}
      if (!row.ul?.trim()) {
        errors[`row_${i}_ul`] = `UL ${i + 1} es requerido`
      }
      if (!row.zabNumber?.trim()) {
        errors[`row_${i}_zab`] = `ZAB Number ${i + 1} es requerido`
      } else if (!this.isValidZAB(row.zabNumber)) {
        errors[`row_${i}_zab`] = `ZAB Number ${i + 1} no tiene formato válido`
      }
      if (!row.serialWunder?.trim()) {
        errors[`row_${i}_serial`] = `Serial Number ${i + 1} es requerido`
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  },

  // Obtener color según contador
  getCounterColor(count) {
    if (count >= 200) return 'var(--color-success)' // Verde
    if (count >= 100) return 'var(--color-warning)' // Amarillo
    return 'var(--color-error)' // Rojo
  },

  // Formatear fecha
  formatDate(date) {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }
}