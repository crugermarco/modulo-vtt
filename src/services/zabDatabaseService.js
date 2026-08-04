import { supabase } from './supabaseClient'

export const zabDatabaseService = {
  // Obtener todos los ZAB de una tabla específica
  async getZabs(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error getting ZABs:', error)
      throw error
    }
    return data || []
  },

  // Obtener el último ZAB generado (solo disponibles)
  async getLastZab(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('zab_number')
      .eq('status', 'available')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error getting last ZAB:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      console.log('No se encontraron ZABs disponibles en', tableName)
      return null
    }
    
    console.log('Último ZAB disponible:', data[0].zab_number)
    return data[0].zab_number
  },

  // Obtener TODOS los ZABs (incluyendo usados) para el generador
  async getLastZabOverall(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('zab_number')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('Error getting last ZAB overall:', error)
      throw error
    }
    
    if (!data || data.length === 0) {
      return null
    }
    
    return data[0].zab_number
  },

  // Insertar ZABs generados
  async insertZabs(tableName, zabNumbers) {
    const records = zabNumbers.map(zab => ({
      zab_number: zab,
      status: 'available'
    }))

    console.log('Insertando ZABs en', tableName, ':', records.length, 'registros')

    const { data, error } = await supabase
      .from(tableName)
      .insert(records)
      .select()
    
    if (error) {
      console.error('Error inserting ZABs:', error)
      throw error
    }
    
    console.log('ZABs insertados exitosamente:', data.length)
    return data
  },

  // Marcar ZAB como usado
  async markAsUsed(tableName, zabNumber, towerSentId) {
    const { data, error } = await supabase
      .from(tableName)
      .update({ 
        status: 'used',
        used_at: new Date().toISOString(),
        used_in_tower_sent_id: towerSentId
      })
      .eq('zab_number', zabNumber)
      .eq('status', 'available')
      .select()
    
    if (error) {
      console.error('Error marking ZAB as used:', error)
      throw error
    }
    
    return data
  },

  // Marcar ZAB como disponible
  async markAsAvailable(tableName, zabNumber) {
    const { data, error } = await supabase
      .from(tableName)
      .update({ 
        status: 'available',
        used_at: null,
        used_in_tower_sent_id: null
      })
      .eq('zab_number', zabNumber)
      .select()
    
    if (error) {
      console.error('Error marking ZAB as available:', error)
      throw error
    }
    
    return data
  },

  // Contar ZABs disponibles
  async countAvailable(tableName) {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
    
    if (error) {
      console.error('Error counting ZABs:', error)
      throw error
    }
    return count || 0
  },

  // Contar ZABs usados
  async countUsed(tableName) {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'used')
    
    if (error) {
      console.error('Error counting used ZABs:', error)
      throw error
    }
    return count || 0
  },

  // Verificar duplicado en todas las tablas - CORREGIDO
  async checkDuplicateGlobally(zabNumber) {
    const results = {}

    try {
      // Verificar en tower_sent (sin columna status)
      const { data: towerData, error: towerError } = await supabase
        .from('tower_sent')
        .select('id, zab_number')
        .eq('zab_number', zabNumber)
      
      if (towerError) {
        console.error('Error checking duplicates in tower_sent:', towerError)
      } else if (towerData && towerData.length > 0) {
        results['tower_sent'] = towerData
      }

      // Verificar en zab_database_normal
      const { data: normalData, error: normalError } = await supabase
        .from('zab_database_normal')
        .select('id, zab_number, status')
        .eq('zab_number', zabNumber)
      
      if (normalError) {
        console.error('Error checking duplicates in zab_database_normal:', normalError)
      } else if (normalData && normalData.length > 0) {
        results['zab_database_normal'] = normalData
      }

      // Verificar en zab_database_ada
      const { data: adaData, error: adaError } = await supabase
        .from('zab_database_ada')
        .select('id, zab_number, status')
        .eq('zab_number', zabNumber)
      
      if (adaError) {
        console.error('Error checking duplicates in zab_database_ada:', adaError)
      } else if (adaData && adaData.length > 0) {
        results['zab_database_ada'] = adaData
      }

    } catch (error) {
      console.error('Error general en checkDuplicateGlobally:', error)
    }

    return results
  },

  // Descargar como CSV
  async downloadCSV(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('zab_number, status, created_at, used_at')
      .csv()
    
    if (error) {
      console.error('Error downloading CSV:', error)
      throw error
    }
    return data
  }
}