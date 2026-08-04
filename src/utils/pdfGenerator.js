import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export const generateShippingSheetPDF = async (formData, rows) => {
  const htmlContent = createSheetHTML(formData, rows)
  
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = htmlContent
  tempDiv.style.position = 'absolute'
  tempDiv.style.left = '-9999px'
  tempDiv.style.top = '0'
  tempDiv.style.width = '1050px'
  document.body.appendChild(tempDiv)

  try {
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      width: 1050,
      windowWidth: 1050
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    
    const fileName = `Shipping_Sheet_${formData.so || 'envio'}_${Date.now()}.pdf`
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
  const customer = formData.customer || ''
  const totalUnits = formData.totalUnits || ''
  const so = formData.so || ''
  const fecha = formData.fecha || ''
  const type = formData.type || ''
  const palletNumber = formData.palletNumber || ''
  const unitsPerPallet = formData.unitsPerPallet || 1
  const maxRows = Math.min(unitsPerPallet, 12)

  let rowsHTML = ''
  
  for (let i = 0; i < maxRows; i++) {
    const row = rows[i] || { ul: '', zabNumber: '', serialWunder: '' }
    rowsHTML += `
            <tr style="height: 20px">
                <td class="s11" dir="ltr">${row.ul || ''}</td>
                <td class="s11" dir="ltr">${row.zabNumber || ''}</td>
                <td class="s11" dir="ltr">${row.serialWunder || ''}</td>
            </tr>`
  }

  for (let i = maxRows; i < 12; i++) {
    rowsHTML += `
            <tr style="height: 20px">
                <td class="s11" dir="ltr"></td>
                <td class="s11" dir="ltr"></td>
                <td class="s11" dir="ltr"></td>
            </tr>`
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <style type="text/css">
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Times New Roman', Arial, sans-serif; 
          background: #ffffff;
          padding: 20px;
          margin: 0;
        }
        
        .s0 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            border-top: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-weight: bold;
            color: #000000;
            font-family: Arial;
            font-size: 12pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s1 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-style: italic;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s2 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 12pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s3 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-weight: bold;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s4 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s5 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 10pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s6 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s7 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-style: italic;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 14pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s8 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-style: italic;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 14pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s9 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-style: italic;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 14pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s10 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: Arial;
            font-size: 27pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s11 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-weight: bold;
            color: #000000;
            font-family: Arial;
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s12 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            border-top: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-style: italic;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s13 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            border-top: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 12pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s14 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            border-top: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-weight: bold;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s15 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            border-top: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 16pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        .s16 {
            border-bottom: 1px SOLID #000000;
            border-right: 1px SOLID #000000;
            border-left: 1px SOLID #000000;
            border-top: 1px SOLID #000000;
            background-color: #ffffff;
            text-align: center;
            font-style: italic;
            color: #000000;
            font-family: "Times New Roman";
            font-size: 14pt;
            vertical-align: middle;
            padding: 4px 3px;
        }
        
        .waffle {
            border-collapse: collapse;
        }
      </style>
    </head>
    <body>
      <table class="waffle" cellspacing="0" cellpadding="0">
        <tbody>
          <tr style="height: 22px">
            <td class="s0" colspan="4">${customer}</td>
          </tr>
          <tr style="height: 22px">
            <td class="s12">Total Units in P.O.:</td>
            <td class="s12" colspan="2">Purchase Order Number:</td>
            <td class="s12">Ship Date:</td>
          </tr>
          <tr style="height: 22px">
            <td class="s13">${totalUnits}</td>
            <td class="s14" colspan="2">${so}</td>
            <td class="s15">${fecha}</td>
          </tr>
          <tr style="height: 22px">
            <td class="s1">Units per Pallet:</td>
            <td class="s1" colspan="2">Product Model:</td>
            <td class="s1">Product Description:</td>
          </tr>
          <tr style="height: 22px">
            <td class="s5">${unitsPerPallet}</td>
            <td class="s3" colspan="2">${type}</td>
            <td class="s6">Beverage Dispensing Tower</td>
          </tr>
          <tr style="height: 22px">
            <td class="s16">Pallet Number:</td>
            <td class="s8">Serial Number (ABC, Inc.):</td>
            <td class="s9">Bar Code Number (The Coca-Cola Co.):</td>
            <td class="s7">Serial Number</td>
          </tr>
          <tr style="height: 22px">
            <td class="s10" rowspan="12">${palletNumber}</td>
            ${rowsHTML.split('</tr>')[0]}</tr>
          ${rowsHTML.split('</tr>').slice(1).join('</tr>')}
        </tbody>
      </table>
    </body>
    </html>
  `
}