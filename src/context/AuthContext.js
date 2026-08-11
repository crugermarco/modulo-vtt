import React, { createContext, useState, useContext, useEffect, useCallback } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    try {
      // 1. Intentar obtener usuario de la URL
      const urlParams = new URLSearchParams(window.location.search)
      const userParam = urlParams.get('user')
      
      if (userParam) {
        const decodedUser = decodeURIComponent(userParam)
        const user = JSON.parse(decodedUser)
        
        if (!user.USUARIO || !user.ROL) {
          setError('Usuario invalido: faltan datos (USUARIO, ROL)')
          setLoading(false)
          return
        }
        
        const userData = {
          USUARIO: user.USUARIO,
          ROL: user.ROL,
          EMAIL: user.EMAIL || ''
        }
        
        localStorage.setItem('userSession', JSON.stringify(userData))
        setCurrentUser({
          name: userData.USUARIO,
          role: userData.ROL,
          email: userData.EMAIL
        })
        
        window.history.replaceState({}, document.title, window.location.pathname)
        setLoading(false)
        return
      }
      
      // 2. Intentar obtener usuario de localStorage
      const userSession = localStorage.getItem('userSession')
      
      if (userSession) {
        const user = JSON.parse(userSession)
        
        if (!user.USUARIO || !user.ROL) {
          localStorage.removeItem('userSession')
          setError('Sesion invalida. Inicie sesion nuevamente.')
          setLoading(false)
          return
        }
        
        setCurrentUser({
          name: user.USUARIO,
          role: user.ROL,
          email: user.EMAIL || ''
        })
        setLoading(false)
        return
      }
      
      // 3. No hay usuario - ACCESO DENEGADO
      setError('ACCESO NO AUTORIZADO')
      setLoading(false)
      
    } catch (err) {
      console.error('Error en AuthProvider:', err)
      localStorage.removeItem('userSession')
      setError('Error al cargar la sesion: ' + err.message)
      setLoading(false)
    }
  }, [])

  // Verificar si es usuario autorizado
  const isAuthorizedUser = useCallback(() => {
    if (!currentUser) return false
    const name = currentUser.name?.toLowerCase() || ''
    return name === 'marco cruger' || name === 'itati bautista'
  }, [currentUser])

  // Verificar si puede EDITAR (solo Marco Cruger)
  const canEdit = useCallback(() => {
    if (!currentUser) return false
    return currentUser.name?.toLowerCase() === 'marco cruger'
  }, [currentUser])

  // Verificar si puede ELIMINAR (solo Marco Cruger)
  const canDelete = useCallback(() => {
    if (!currentUser) return false
    return currentUser.name?.toLowerCase() === 'marco cruger'
  }, [currentUser])

  // Verificar si es administrador
  const isAdmin = useCallback(() => {
    if (!currentUser) return false
    return currentUser.role === 'admin' || currentUser.name?.toLowerCase() === 'marco cruger'
  }, [currentUser])

  // Cerrar sesion
  const logout = useCallback(() => {
    localStorage.removeItem('userSession')
    setCurrentUser(null)
    setError('Sesion cerrada')
  }, [])

  // Pantalla de carga
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid rgba(0,212,170,0.2)',
            borderTopColor: '#00d4aa',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ fontSize: 18, color: '#00d4aa', fontWeight: 500 }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // Pantalla de error / acceso denegado
  if (error || !currentUser) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: 'white',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 40 }}>
          <div style={{
            width: 80,
            height: 80,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '2px solid #ef4444',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: 36,
            fontWeight: 700,
            color: '#ef4444'
          }}>
            !
          </div>
          
          <h1 style={{ 
            fontSize: 24, 
            fontWeight: 700, 
            color: '#ef4444',
            marginBottom: 16,
            letterSpacing: 1
          }}>
            ACCESO DENEGADO
          </h1>
          
          <p style={{ 
            fontSize: 16, 
            color: 'rgba(255,255,255,0.7)',
            marginBottom: 24,
            lineHeight: 1.6
          }}>
            {error || 'No tiene autorizacion para acceder a este sistema.'}
          </p>
          
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: 20,
            marginBottom: 24,
            textAlign: 'left'
          }}>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
              Formato de URL requerido:
            </p>
            <code style={{
              display: 'block',
              background: 'rgba(0,0,0,0.3)',
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              color: '#00d4aa',
              wordBreak: 'break-all',
              fontFamily: 'monospace'
            }}>
              ?user=%7B%22USUARIO%22%3A%22Marco%20Cruger%22%2C%22ROL%22%3A%22admin%22%7D
            </code>
          </div>
          
          <button
            onClick={logout}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.background = '#dc2626'}
            onMouseOut={(e) => e.target.style.background = '#ef4444'}
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
      error,
      isAuthorizedUser, 
      canEdit,
      canDelete,
      isAdmin,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}