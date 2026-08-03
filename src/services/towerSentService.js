import { supabase } from './supabaseClient'

export const towerSentService = {
  // Obtener todos los registros
  async getAll() {
    const { data, error } = await supabase
      .from('tower_sent')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
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

  // Insertar múltiples registros (para las filas del pallet)
  async insertBatch(records) {
    const { data, error } = await supabase
      .from('tower_sent')
      .insert(records)
      .select()
    
    if (error) throw error
    return data
  },

  // Actualizar registro
  async update(id, updates) {
    const { data, error } = await supabase
      .from('tower_sent')
      .from('tower_sent')
      .update(updates)
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // Eliminar registro (solo admin)
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
    return data
  },

  // Obtener imágenes de una torre
  async getImages(towerId) {
    const { data, error } = await supabase
      .from('tower_images')
      .select('*')
      .eq('tower_sent_id', towerId)
    
    if (error) throw error
    return data
  },

  // Subir imagen
  async uploadImage(file, towerId) {
    const fileName = `towers/${towerId}/${Date.now()}_${file.name}`
    
    const { error: uploadError } = await supabase.storage
      .from('tower-images')
      .upload(fileName, file)
    
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('tower-images')
      .getPublicUrl(fileName)

    const { data, error } = await supabase
      .from('tower_images')
      .insert([{
        tower_sent_id: towerId,
        image_url: publicUrl
      }])
      .select()
    
    if (error) throw error
    return data[0]
  }
}