import { useState, useEffect } from 'react'
import { supabaseStatus } from '../../services/supabaseClient'

export default function SystemGuard({ moduloId, children }) {
  const [accesoPermitido, setAccesoPermitido] = useState(false)
  const [loading, setLoading] = useState(true)

  const APP_URL = window.location.origin + window.location.pathname

  useEffect(() => {
    verificarAcceso()
   
    const channel = supabaseStatus
      .channel(`guard-${moduloId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'modulos_status',
          filter: `modulo_id=eq.${moduloId}`
        },
        (payload) => {
          if (payload.new.status !== 500) {
            window.location.href = `https://status-ten-sage.vercel.app?modulo=${moduloId}&redirect=${encodeURIComponent(APP_URL)}`
          } else {
            setAccesoPermitido(true)
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [moduloId])

  const verificarAcceso = async () => {
    try {
      const { data } = await supabaseStatus
        .from('modulos_status')
        .select('status')
        .eq('modulo_id', moduloId)
        .single()

      if (data?.status !== 500) {
        window.location.href = `https://status-ten-sage.vercel.app?modulo=${moduloId}&redirect=${encodeURIComponent(APP_URL)}`
        return
      }

      setAccesoPermitido(true)
      setLoading(false)
    } catch (error) {
      // Si hay error de conexion, permitir acceso para no bloquear
      console.warn('Error verificando status, permitiendo acceso:', error.message)
      setAccesoPermitido(true)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: '#94a3b8',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 50,
            height: 50,
            border: '3px solid rgba(0,212,170,0.2)',
            borderTopColor: '#00d4aa',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <p>Verificando acceso...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!accesoPermitido) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444', fontSize: 24 }}>ACCESO RESTRINGIDO</h1>
          <p style={{ color: '#94a3b8', marginTop: 16 }}>Este modulo no esta disponible en este momento.</p>
        </div>
      </div>
    )
  }

  return children
}