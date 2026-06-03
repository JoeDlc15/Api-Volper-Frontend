import React from 'react';
import Sidebar from './Sidebar';

function Layout({ children }) {
  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content">
        <header className="topbar">
          <h3 style={{ color: '#64748b', fontWeight: 500 }}>Panel de Control Local</h3>
        </header>
        <div className="page-container">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Layout;
