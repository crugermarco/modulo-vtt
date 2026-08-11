import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Sidebar.css'

function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const { currentUser, canDelete, logout } = useAuth()

  const menuItems = [
    {
      path: '/tower-sent',
      label: 'TOWERS SENT',
      icon: '',
      description: 'Concentrado de envios'
    },
    {
      path: '/zab-database-normal',
      label: 'ZAB DATA BASE - NORMAL',
      icon: '',
      description: 'Base de datos ZAB Normal'
    },
    {
      path: '/zab-database-ada',
      label: 'ZAB DATA BASE - ADA',
      icon: '',
      description: 'Base de datos ZAB ADA'
    }
  ]

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">VTT</div>
          {!collapsed && (
            <div className="logo-text">
              <span className="logo-title">MODULO VTT</span>
              <span className="logo-subtitle">Sistema de Gestion</span>
            </div>
          )}
        </div>
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? '>' : '<'}
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">
          {!collapsed && <h3 className="nav-section-title">MENU PRINCIPAL</h3>}
          <ul className="nav-list">
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                  title={collapsed ? item.label : ''}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && (
                    <div className="nav-text">
                      <span className="nav-label">{item.label}</span>
                      <span className="nav-description">{item.description}</span>
                    </div>
                  )}
                  {location.pathname === item.path && (
                    <div className="active-indicator" />
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-section nav-section-divider">
          {!collapsed && <h3 className="nav-section-title">ACCIONES RAPIDAS</h3>}
          <ul className="nav-list">
            <li>
              <button 
                className="nav-link btn-modal-shipping"
                onClick={() => window.dispatchEvent(new CustomEvent('openModalShipping'))}
                title={collapsed ? 'Modal Shipping' : ''}
              >
                <span className="nav-icon">+</span>
                {!collapsed && (
                  <div className="nav-text">
                    <span className="nav-label">MODAL SHIPPING</span>
                    <span className="nav-description">Nuevo envio</span>
                  </div>
                )}
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <div className="sidebar-footer">
        {!collapsed && (
          <div className="user-info">
            <div className="user-avatar">
              {currentUser?.name?.charAt(0) || 'U'}
            </div>
            <div className="user-details">
              <span className="user-name">{currentUser?.name || 'Usuario'}</span>
              <span className="user-role">
                {canDelete() ? 'Administrador' : 'Usuario'}
              </span>
            </div>

          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar