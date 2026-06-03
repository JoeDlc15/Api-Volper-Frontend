import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Inventario from './pages/Inventario';
import Movimientos from './pages/Movimientos';
import Kardex from './pages/Kardex';
import Cotizaciones from './pages/Cotizaciones';
import CotizacionesCliente from './pages/CotizacionesCliente';
import RevisarCotizacion from './pages/RevisarCotizacion';
import Almacenes from './pages/Almacenes';
import Catalogo from './pages/Catalogo';
import Configuracion from './pages/Configuracion';
import './index.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/inventario" replace />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/movimientos" element={<Movimientos />} />
          <Route path="/kardex" element={<Kardex />} />
          <Route path="/cotizaciones" element={<Cotizaciones />} />
          <Route path="/cotizaciones-cliente" element={<CotizacionesCliente />} />
          <Route path="/revisar-cotizacion" element={<RevisarCotizacion />} />
          <Route path="/almacenes" element={<Almacenes />} />
          <Route path="/catalogo" element={<Catalogo />} />
          <Route path="/configuracion" element={<Configuracion />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
