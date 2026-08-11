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
      const urlParams = new URLSearchParams(window.location.search)
      const userParam = urlParams.get('user')
      
      if (userParam) {
        let decodedUser
        
        try {
          // Intentar decodificar y parsear
          decodedUser = decodeURIComponent(userParam)
          // Si empieza con { es JSON, parsearlo
          if (decodedUser.trim().startsWith('{')) {
            decodedUser = JSON.parse(decodedUser)
          }
        } catch {
          setError('ACCESO DENEGADO')
          setLoading(false)
          return
        }
        
        // Validar que tenga USUARIO
        if (!decodedUser.USUARIO) {
          setError('ACCESO DENEGADO')
          setLoading(false)
          return
        }
        
        // Si no tiene ROL, asignar 'user' por defecto
        const userData = {
          USUARIO: decodedUser.USUARIO,
          ROL: decodedUser.ROL || 'user',
          EMAIL: decodedUser.email || decodedUser.EMAIL || '',
          rotaciones: decodedUser.rotaciones || false,
          vencimientos: decodedUser.vencimientos || false,
          wunder: decodedUser.wunder || false,
          empleados: decodedUser.empleados || false,
          reportes: decodedUser.reportes || false,
          enfermeria: decodedUser.enfermeria || false,
          produccion: decodedUser.produccion || false,
          bitacoras: decodedUser.bitacoras || false,
          configuracion: decodedUser.configuracion || false
        }
        
        localStorage.setItem('userSession', JSON.stringify(userData))
        setCurrentUser({
          name: userData.USUARIO,
          role: userData.ROL,
          email: userData.EMAIL,
          permissions: {
            rotaciones: userData.rotaciones,
            vencimientos: userData.vencimientos,
            wunder: userData.wunder,
            empleados: userData.empleados,
            reportes: userData.reportes,
            enfermeria: userData.enfermeria,
            produccion: userData.produccion,
            bitacoras: userData.bitacoras,
            configuracion: userData.configuracion
          }
        })
        
        window.history.replaceState({}, document.title, window.location.pathname)
        setLoading(false)
        return
      }
      
      // Intentar obtener de localStorage
      const userSession = localStorage.getItem('userSession')
      
      if (userSession) {
        const user = JSON.parse(userSession)
        
        if (!user.USUARIO) {
          localStorage.removeItem('userSession')
          setError('ACCESO DENEGADO')
          setLoading(false)
          return
        }
        
        setCurrentUser({
          name: user.USUARIO,
          role: user.ROL || 'user',
          email: user.EMAIL || '',
          permissions: {
            rotaciones: user.rotaciones || false,
            vencimientos: user.vencimientos || false,
            wunder: user.wunder || false,
            empleados: user.empleados || false,
            reportes: user.reportes || false,
            enfermeria: user.enfermeria || false,
            produccion: user.produccion || false,
            bitacoras: user.bitacoras || false,
            configuracion: user.configuracion || false
          }
        })
        setLoading(false)
        return
      }
      
      setError('ACCESO DENEGADO')
      setLoading(false)
      
    } catch (err) {
      localStorage.removeItem('userSession')
      setError('ACCESO DENEGADO')
      setLoading(false)
    }
  }, [])

  const isAuthorizedUser = useCallback(() => {
    if (!currentUser) return false
    const name = currentUser.name?.toLowerCase() || ''
    return name === 'marco cruger' || name === 'itati bautista'
  }, [currentUser])

  const canEdit = useCallback(() => {
    if (!currentUser) return false
    return currentUser.name?.toLowerCase() === 'marco cruger'
  }, [currentUser])

  const canDelete = useCallback(() => {
    if (!currentUser) return false
    return currentUser.name?.toLowerCase() === 'marco cruger'
  }, [currentUser])

  const isAdmin = useCallback(() => {
    if (!currentUser) return false
    return currentUser.role === 'admin' || currentUser.name?.toLowerCase() === 'marco cruger'
  }, [currentUser])

  const hasPermission = useCallback((permission) => {
    if (!currentUser) return false
    return currentUser.permissions?.[permission] === 'true' || currentUser.permissions?.[permission] === true
  }, [currentUser])

  const logout = useCallback(() => {
    localStorage.removeItem('userSession')
    setCurrentUser(null)
    setError('ACCESO DENEGADO')
  }, [])

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
        <div style={{ textAlign: 'center', maxWidth: 400, padding: 40 }}>
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
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#ef4444', marginBottom: 16, letterSpacing: 2 }}>
            ACCESO DENEGADO
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
            No tiene autorizacion para acceder a este sistema.
          </p>
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
      hasPermission,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}