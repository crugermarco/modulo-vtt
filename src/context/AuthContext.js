import React, { createContext, useState, useContext, useEffect } from 'react'

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

  useEffect(() => {
    // Intentar obtener usuario de la URL
    const urlParams = new URLSearchParams(window.location.search)
    const userParam = urlParams.get('user')
    
    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam))
        localStorage.setItem('userSession', JSON.stringify(user))
        setCurrentUser({
          name: user.USUARIO || 'Usuario',
          role: user.ROL || 'user',
          email: user.EMAIL || ''
        })
        window.history.replaceState({}, document.title, window.location.pathname)
        setLoading(false)
        return
      } catch (error) {
        console.error('Error al parsear usuario de URL:', error)
      }
    }
    
    // Intentar obtener usuario de localStorage
    const userSession = localStorage.getItem('userSession')
    
    if (userSession) {
      try {
        const user = JSON.parse(userSession)
        setCurrentUser({
          name: user.USUARIO || 'Usuario',
          role: user.ROL || 'user',
          email: user.EMAIL || ''
        })
      } catch (error) {
        console.error('Error al parsear usuario de localStorage:', error)
        setCurrentUser({
          name: 'Invitado',
          role: 'user',
          email: ''
        })
      }
    } else {
      // Usuario por defecto para desarrollo
      setCurrentUser({
        name: 'Marco Cruger',
        role: 'admin',
        email: 'marco.cruger@example.com'
      })
    }
    
    setLoading(false)
  }, [])

  // Verificar si es usuario autorizado (puede ver ciertas cosas)
  const isAuthorizedUser = () => {
    return currentUser && 
      (currentUser.name.toLowerCase() === 'marco cruger' || 
       currentUser.name.toLowerCase() === 'itati bautista')
  }

  // Verificar si puede EDITAR (solo Marco Cruger)
  const canEdit = () => {
    return currentUser && currentUser.name.toLowerCase() === 'marco cruger'
  }

  // Verificar si puede ELIMINAR (solo Marco Cruger)
  const canDelete = () => {
    return currentUser && currentUser.name.toLowerCase() === 'marco cruger'
  }

  // Verificar si es administrador
  const isAdmin = () => {
    return currentUser && 
      (currentUser.role === 'admin' || currentUser.name.toLowerCase() === 'marco cruger')
  }

  // Cerrar sesión
  const logout = () => {
    localStorage.removeItem('userSession')
    setCurrentUser({
      name: 'Invitado',
      role: 'user',
      email: ''
    })
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0f',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(0,212,170,0.2)',
            borderTopColor: '#00d4aa',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ fontSize: '18px', color: '#00d4aa' }}>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      loading, 
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