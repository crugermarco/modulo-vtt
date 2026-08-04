import { supabase } from './supabaseClient'

export const towerSentService = {
  // Obtener todos los registros
  async getAll() {
    const { data, error } = await supabase
      .from('tower_sent')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Insertar un registro
  async insert(record) {
    const { data, error } = await supabase
      .from('tower_sent')
      .insert([record])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Insertar múltiples registros
  async insertBatch(records) {
    const { data, error } = await supabase
      .from('tower_sent')
      .insert(records)
      .select()
    
    if (error) {
      console.error('Error insertando batch:', error)
      throw error
    }
    return data
  },

  // Actualizar registro
  async update(id, updates) {
    const { data, error } = await supabase
      .from('tower_sent')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Eliminar registro
  async delete(id) {
    const { error } = await supabase
      .from('tower_sent')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Buscar duplicados de ZAB
  async findDuplicates(zabNumber) {
    const { data, error } = await supabase
      .from('tower_sent')
      .select('id, zab_number')
      .eq('zab_number', zabNumber)
    
    if (error) throw error
    return data || []
  },

  // Obtener imágenes de una torre
  async getImages(towerId) {
    const { data, error } = await supabase
      .from('tower_images')
      .select('*')
      .eq('tower_sent_id', towerId)
    
    if (error) throw error
    return data || []
  },

  // Subir imagen - CORREGIDO
  async uploadImage(file, towerId) {
    try {
      // Validar que el archivo existe
      if (!file) {
        console.warn('No se proporcionó archivo para subir')
        return null
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${towerId}_${Date.now()}.${fileExt}`
      const filePath = `towers/${fileName}`

      console.log('Subiendo imagen:', filePath)

      // Subir a Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('tower-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError)
        throw uploadError
      }

      console.log('Imagen subida:', uploadData)

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('tower-images')
        .getPublicUrl(filePath)

      console.log('URL pública:', publicUrl)

      // Guardar referencia en la base de datos
      const { data: imageRecord, error: dbError } = await supabase
        .from('tower_images')
        .insert([{
          tower_sent_id: towerId,
          image_url: publicUrl
        }])
        .select()

      if (dbError) {
        console.error('Error guardando referencia de imagen:', dbError)
        throw dbError
      }

      return imageRecord[0]

    } catch (error) {
      console.error('Error en uploadImage:', error)
      // No lanzamos error para que no detenga el proceso
      return null
    }
  }
}