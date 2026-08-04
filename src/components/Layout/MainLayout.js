import React, { useState } from 'react'
import Sidebar from '../Sidebar/Sidebar'
import './MainLayout.css'

function MainLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="main-layout">
      <Sidebar 
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  )
}

export default MainLayout