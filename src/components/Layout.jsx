import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';

function Layout({ children }) {
  const location = useLocation();

  const getTitle = (path) => {
    switch (path) {
      case '/inventario': return 'Inventario';
      case '/movimientos': return 'Movimientos';
      case '/kardex': return 'Kardex Ingresos';
      case '/almacenes': return 'Almacenes';
      case '/catalogo': return 'Catálogo / Orígenes';
      case '/cotizaciones': return 'Cotizaciones';
      case '/cotizaciones-internacionales': return 'Cotizaciones Internacionales';
      case '/cotizaciones-cliente': return 'Cotizaciones x Cliente';
      case '/revisar-cotizacion': return 'Revisar Cotización';
      case '/configuracion': return 'Configuración';
      default: return 'Panel de Control Local';
    }
  };

  const title = getTitle(location.pathname);

  useEffect(() => {
    document.title = `${title} | Volper Seal`;
  }, [title]);

  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <h3 style={{ color: '#64748b', fontWeight: 500 }}>{title}</h3>
        </header>
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
