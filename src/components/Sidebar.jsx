import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

function Sidebar() {
  const [isPinned, setIsPinned] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [openSections, setOpenSections] = useState({
    almacen: true,
    ventas: true
  });
  const location = useLocation();

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const menuGroups = [
    {
      id: 'almacen',
      title: 'Almacén',
      icon: '📦',
      items: [
        { path: '/inventario', label: 'Inventario' },
        { path: '/movimientos', label: 'Movimientos' },
        { path: '/kardex', label: 'Kardex Ingresos' },
        { path: '/almacenes', label: 'Almacenes' },
        { path: '/catalogo', label: 'Catálogo / Orígenes' },
      ]
    },
    {
      id: 'ventas',
      title: 'Ventas',
      icon: '🛒',
      items: [
        { path: '/cotizaciones', label: 'Cotizaciones' },
        { path: '/cotizaciones-cliente', label: 'Cotizaciones x Cliente' },
        { path: '/revisar-cotizacion', label: 'Revisar Cotización' },
      ]
    }
  ];

  const isExpanded = isPinned || isHovered;
  const isCollapsed = !isExpanded;

  return (
    <div 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{fontSize: '1.5rem'}} className="nav-icon">⚙️</span>
          {!isCollapsed && <h2>Volper Seal</h2>}
        </div>
        {!isCollapsed && (
          <span 
            className={`pin-button ${isPinned ? 'pinned' : 'unpinned'}`}
            onClick={() => setIsPinned(!isPinned)}
            title={isPinned ? "Desfijar barra" : "Fijar barra"}
          >
            📌
          </span>
        )}
      </div>
      <nav className="nav-links">
        {menuGroups.map((group) => {
          const isGroupActive = group.items.some(item => location.pathname === item.path);
          const isOpen = openSections[group.id];
          
          return (
            <div key={group.id} className="nav-group">
              <div 
                className={`nav-group-header ${isGroupActive ? 'active' : ''}`} 
                onClick={() => !isCollapsed && toggleSection(group.id)}
                title={isCollapsed ? group.title : ''}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span className="nav-icon">{group.icon}</span>
                  {!isCollapsed && <span className="group-title">{group.title}</span>}
                </div>
                {!isCollapsed && (
                  <span className={`chevron ${isOpen ? 'open' : ''}`}>
                    ▼
                  </span>
                )}
              </div>
              
              {!isCollapsed && (
                <div className={`nav-group-items ${isOpen ? 'open' : 'closed'}`}>
                  {group.items.map((item) => (
                    <NavLink 
                      key={item.path} 
                      to={item.path} 
                      className={({ isActive }) => `nav-subitem ${isActive ? 'active' : ''}`}
                    >
                      <span className="subitem-dot">○</span>
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <NavLink 
          to="/configuracion" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          title={isCollapsed ? 'Configuración' : ''}
        >
          <span className="nav-icon">⚙️</span>
          {!isCollapsed && <span>Configuración</span>}
        </NavLink>
      </div>
    </div>
  );
}

export default Sidebar;
