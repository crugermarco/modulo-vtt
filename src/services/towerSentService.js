import { supabase } from './supabaseClient'

export const towerSentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('tower_sent')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  async insert(record) {
    const { data, error } = await supabase
      .from('tower_sent')
      .insert([record])
      .select()
    if (error) throw error
    return data[0]
  },

  async insertBatch(records) {
    const { data, error } = await supabase
      .from('tower_sent')
      .insert(records)
      .select()
    if (error) throw error
    return data
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('tower_sent')
      .update(updates)
      .eq('id', id)
      .select()
    if (error) throw error
    return data[0]
  },

  async delete(id) {
    try {
      const images = await this.getImages(id)
      for (const img of images) {
        try {
          const urlParts = img.image_url.split('/')
          const fileName = urlParts[urlParts.length - 1]
          await supabase.storage.from('tower-images').remove([fileName])
        } catch (e) {}
      }
      await supabase.from('tower_images').delete().eq('tower_sent_id', id)
      const { error } = await supabase.from('tower_sent').delete().eq('id', id)
      if (error) throw error
      return true
    } catch (error) {
      throw error
    }
  },

  async findDuplicates(zabNumber) {
    const { data, error } = await supabase
      .from('tower_sent')
      .select('id, zab_number')
      .eq('zab_number', zabNumber)
    if (error) throw error
    return data || []
  },

  async getImages(towerId) {
    const { data, error } = await supabase
      .from('tower_images')
      .select('*')
      .eq('tower_sent_id', towerId)
      .order('created_at', { ascending: false })
    if (error) return []
    return data || []
  },

  async uploadImage(file, towerId) {
    if (!file) return null

    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const fileName = `${towerId}_${timestamp}_${cleanFileName}`

    const { error: uploadError } = await supabase.storage
      .from('tower-images')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      })

    if (uploadError) {
      throw new Error('Error al subir imagen: ' + uploadError.message)
    }

    const { data: urlData } = supabase.storage
      .from('tower-images')
      .getPublicUrl(fileName)

    const publicUrl = urlData?.publicUrl
    if (!publicUrl) throw new Error('No se pudo obtener URL publica')

    const { data: imageRecord, error: dbError } = await supabase
      .from('tower_images')
      .insert([{ tower_sent_id: towerId, image_url: publicUrl }])
      .select()
      .single()

    if (dbError) {
      await supabase.storage.from('tower-images').remove([fileName])
      throw new Error('Error al guardar referencia: ' + dbError.message)
    }

    return imageRecord
  }
}
