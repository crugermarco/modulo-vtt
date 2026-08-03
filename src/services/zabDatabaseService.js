import { supabase } from './supabaseClient'

export const zabDatabaseService = {
  // Obtener todos los ZAB de una tabla específica
  async getZabs(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Obtener el último ZAB generado
  async getLastZab(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('zab_number')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (error) throw error
    return data[0]?.zab_number || 'ZAB3000000'
  },

  // Insertar ZABs generados
  async insertZabs(tableName, zabNumbers) {
    const records = zabNumbers.map(zab => ({
      zab_number: zab,
      status: 'available'
    }))

    const { data, error } = await supabase
      .from(tableName)
      .insert(records)
      .select()
    
    if (error) throw error
    return data
  },

  // Contar ZABs disponibles
  async countAvailable(tableName) {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')
    
    if (error) throw error
    return count
  },

  // Verificar duplicado en todas las tablas
  async checkDuplicateGlobally(zabNumber) {
    const tables = ['tower_sent', 'zab_database_normal', 'zab_database_ada']
    const results = {}

    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('id, zab_number')
        .eq('zab_number', zabNumber)
      
      if (!error && data.length > 0) {
        results[table] = data
      }
    }

    return results
  },

  // Descargar como CSV
  async downloadCSV(tableName) {
    const { data, error } = await supabase
      .from(tableName)
      .select('zab_number, status, created_at')
      .csv()
    
    if (error) throw error
    return data
  }
}