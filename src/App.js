import React, { useState, useCallback } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import MainLayout from './components/Layout/MainLayout'
import TowerSent from './components/Dashboard/TowerSent'
import ZabDatabase from './components/Dashboard/ZabDatabase'
import { subscribeToZabChanges } from './services/supabaseClient'
import './App.css'

function App() {
  const [duplicateAlerts, setDuplicateAlerts] = useState([])
  const [currentUser, setCurrentUser] = useState({
    email: 'marco.cruger@example.com', // Simulado - implementar auth real
    name: 'Marco Cruger'
  })

  // Suscripción en tiempo real para detectar duplicados
  React.useEffect(() => {
    const unsubscribe = subscribeToZabChanges((payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        checkForDuplicates(payload.new.zab_number)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const checkForDuplicates = useCallback(async (zabNumber) => {
    try {
      const { zabDatabaseService } = await import('./services/zabDatabaseService')
      const duplicates = await zabDatabaseService.checkDuplicateGlobally(zabNumber)
      
      const totalDuplicates = Object.values(duplicates).reduce(
        (sum, arr) => sum + arr.length, 0
      )
      
      if (totalDuplicates > 1) {
        const newAlert = {
          id: Date.now(),
          zabNumber,
          message: 'SE ENCONTRO UN ZAB DUPLICADO FAVOR DE NOTIFICARLO',
          timestamp: new Date().toISOString()
        }
        
        setDuplicateAlerts(prev => {
          const exists = prev.find(a => a.zabNumber === zabNumber)
          if (!exists) {
            return [...prev, newAlert]
          }
          return prev
        })
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
    }
  }, [])

  const dismissAlert = useCallback((alertId) => {
    setDuplicateAlerts(prev => prev.filter(a => a.id !== alertId))
  }, [])

  return (
    <Router>
      <div className="app">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a24',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
          }}
        />
        
        {/* Alertas de duplicados */}
        {duplicateAlerts.length > 0 && (
          <div className="duplicate-alerts">
            {duplicateAlerts.map(alert => (
              <div key={alert.id} className="alert-item pulse-notification">
                <span className="alert-icon">⚠️</span>
                <span className="alert-message">{alert.message}: {alert.zabNumber}</span>
                <button 
                  className="alert-dismiss"
                  onClick={() => dismissAlert(alert.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <Routes>
          <Route 
            path="/" 
            element={
              <MainLayout currentUser={currentUser}>
                <TowerSent 
                  currentUser={currentUser}
                  duplicateZabs={duplicateAlerts.map(a => a.zabNumber)}
                />
              </MainLayout>
            } 
          />
          <Route 
            path="/tower-sent" 
            element={
              <MainLayout currentUser={currentUser}>
                <TowerSent 
                  currentUser={currentUser}
                  duplicateZabs={duplicateAlerts.map(a => a.zabNumber)}
                />
              </MainLayout>
            } 
          />
          <Route 
            path="/zab-database-normal" 
            element={
              <MainLayout currentUser={currentUser}>
                <ZabDatabase 
                  tableName="zab_database_normal"
                  title="ZAB DATA BASE - NORMAL"
                  duplicateZabs={duplicateAlerts.map(a => a.zabNumber)}
                />
              </MainLayout>
            } 
          />
          <Route 
            path="/zab-database-ada" 
            element={
              <MainLayout currentUser={currentUser}>
                <ZabDatabase 
                  tableName="zab_database_ada"
                  title="ZAB DATA BASE - ADA"
                  duplicateZabs={duplicateAlerts.map(a => a.zabNumber)}
                />
              </MainLayout>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App