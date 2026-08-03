import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generateShippingSheetPDF = async (formData, rows) => {
  // Crear el HTML del formato
  const htmlContent = createSheetHTML(formData, rows)
  
  // Crear un div temporal
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.top = '-9999px'
  document.body.appendChild(tempDiv)

  try {
    // Convertir HTML a canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    // Crear PDF horizontal
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    
    // Descargar PDF
    const fileName = `Shipping_Sheet_${formData.so}_${Date.now()}.pdf`
    pdf.save(fileName)
    
    return true
  } catch (error) {
    console.error('Error generando PDF:', error)
    throw error
  } finally {
    document.body.removeChild(tempDiv)
  }
}

function createSheetHTML(formData, rows) {
  const { customer, totalUnits, so, fecha, type, palletNumber, unitsPerPallet } = formData
  
  // Generar filas dinámicas basadas en unitsPerPallet
  let rowsHTML = ''
  const maxRows = Math.min(unitsPerPallet, 12)
  
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i] || { ul: '', zabNumber: '', serialWunder: '' }
    rowsHTML += `
      <tr style="height: 20px">
        <td class="s11" dir="ltr">${row.ul || ''}</td>
        <td class="s11" dir="ltr">${row.zabNumber || ''}</td>
        <td class="s11" dir="ltr">${row.serialWunder || ''}</td>
      </tr>
    `
  }

  // Rellenar filas vacías si es necesario
  for (let i = maxRows; i < 12; i++) {
    rowsHTML += `
      <tr style="height: 20px">
        <td class="s11" dir="ltr"></td>
        <td class="s11" dir="ltr"></td>
        <td class="s11" dir="ltr"></td>
      </tr>
    `
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Times New Roman', Arial, sans-serif; }
        .waffle { border-collapse: collapse; width: 100%; }
        .s0 { border: 1px solid #000; background: #fff; text-align: center; font-weight: bold; font-family: Arial; font-size: 12pt; padding: 2px 3px; }
        .s1 { border: 1px solid #000; background: #fff; text-align: center; font-style: italic; font-family: 'Times New Roman'; font-size: 16pt; padding: 2px 3px; }
        .s2 { border: 1px solid #000; background: #fff; text-align: center; font-family: 'Times New Roman'; font-size: 12pt; padding: 2px 3px; }
        .s3 { border: 1px solid #000; background: #fff; text-align: center; font-weight: bold; font-family: 'Times New Roman'; font-size: 16pt; padding: 2px 3px; }
        .s4 { border: 1px solid #000; background: #fff; text-align: center; font-family: 'Times New Roman'; font-size: 16pt; padding: 2px 3px; }
        .s5 { border: 1px solid #000; background: #fff; text-align: center; font-family: 'Times New Roman'; font-size: 10pt; padding: 2px 3px; }
        .s6 { border: 1px solid #000; background: #fff; text-align: center; font-family: 'Times New Roman'; font-size: 16pt; padding: 2px 3px; }
        .s7 { border: 1px solid #000; background: #fff; text-align: center; font-style: italic; font-family: 'Times New Roman'; font-size: 14pt; padding: 2px 3px; }
        .s8 { border-right: none; border-bottom: 1px solid #000; background: #fff; text-align: center; font-style: italic; font-family: 'Times New Roman'; font-size: 14pt; padding: 2px 3px; }
        .s9 { border-left: none; border-bottom: 1px solid #000; background: #fff; text-align: center; font-style: italic; font-family: 'Times New Roman'; font-size: 14pt; padding: 2px 3px; }
        .s10 { border: 1px solid #000; background: #fff; text-align: center; font-family: Arial; font-size: 27pt; padding: 2px 3px; }
        .s11 { border: 1px solid #000; background: #fff; text-align: center; font-weight: bold; font-family: Arial; font-size: 16pt; padding: 2px 3px; }
        .softmerge-inner { width: 312px; left: -3px; }
      </style>
    </head>
    <body>
      <table class="waffle" cellspacing="0" cellpadding="0">
        <tr style="height: 20px">
          <td class="s0" colspan="4">${customer || '[CUSTOMER]'}</td>
        </tr>
        <tr style="height: 20px">
          <td class="s1">Total Units in P.O.:</td>
          <td class="s1" colspan="2">Purchase Order Number: </td>
          <td class="s1">Ship Date:</td>
        </tr>
        <tr style="height: 20px">
          <td class="s2">${totalUnits || ''}</td>
          <td class="s3" colspan="2">${so || '[SO]'}</td>
          <td class="s4">${fecha || '[FECHA]'}</td>
        </tr>
        <tr style="height: 20px">
          <td class="s1">Units per Pallet:</td>
          <td class="s1" colspan="2">Product Model:</td>
          <td class="s1">Product Description:</td>
        </tr>
        <tr style="height: 20px">
          <td class="s5">${unitsPerPallet || ''} (MAX 12)</td>
          <td class="s3" colspan="2">${type || '[TYPE]'}</td>
          <td class="s6">Beverage Dispensing Tower</td>
        </tr>
        <tr style="height: 20px">
          <td class="s7">Pallet Number:</td>
          <td class="s8">Serial Number (ABC, Inc.):</td>
          <td class="s9">
            <div class="softmerge-inner">Bar Code Number (The Coca-Cola Co.):</div>
          </td>
          <td class="s7">Serial Number</td>
        </tr>
        <tr style="height: 20px">
          <td class="s10" rowspan="12">${palletNumber || ''}</td>
          ${rowsHTML.split('</tr>')[0]}</tr>
        ${rowsHTML.split('</tr>').slice(1).join('</tr>')}
      </table>
    </body>
    </html>
  `
}