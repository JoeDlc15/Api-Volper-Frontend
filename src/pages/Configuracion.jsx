import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Configuracion() {
  const [creds, setCreds] = useState({
    ventasEmail: '',
    ventasPassword: '',
    almacenEmail: '',
    almacenPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/config/credentials');
      if (res.data.success) {
        setCreds({
          ventasEmail: res.data.ventasEmail || '',
          ventasPassword: res.data.ventasPassword || '',
          almacenEmail: res.data.almacenEmail || '',
          almacenPassword: res.data.almacenPassword || ''
        });
      }
    } catch (error) {
      console.error("Error cargando credenciales:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setCreds({ ...creds, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.post('http://localhost:3000/api/config/credentials', creds);
      alert('✅ Configuración guardada correctamente');
      fetchCredentials(); // Recargar
    } catch (error) {
      alert('❌ Error guardando credenciales: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px' }}>Cargando configuración...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#312e81', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          ⚙️ Configuración del Sistema
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Configura las credenciales de Volper Seal para sincronizar datos y realizar movimientos.
        </p>
      </div>

      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '1.1rem', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
          🔑 Credenciales de Volper Seal
        </h3>

        {/* Cuenta de Ventas */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ color: '#3b82f6', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            📊 Cuenta de Ventas / Administrador
          </h4>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px' }}>
            Esta cuenta se utiliza para importar cotizaciones del sistema y sincronizar facturas masivamente.
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '5px' }}>Correo de Ventas:</label>
              <input 
                type="email" 
                name="ventasEmail"
                value={creds.ventasEmail}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '5px' }}>Contraseña:</label>
              <input 
                type="password" 
                name="ventasPassword"
                value={creds.ventasPassword}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        {/* Cuenta de Almacén */}
        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ color: '#ea580c', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            🏢 Cuenta de Almacén
          </h4>
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px' }}>
            Esta cuenta se utiliza para registrar ingresos de productos (traslados, producciones) en el inventario real de Volper.
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '5px' }}>Correo de Almacén:</label>
              <input 
                type="email" 
                name="almacenEmail"
                value={creds.almacenEmail}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#1e293b', fontWeight: '500', marginBottom: '5px' }}>Contraseña:</label>
              <input 
                type="password" 
                name="almacenPassword"
                value={creds.almacenPassword}
                onChange={handleChange}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{ padding: '8px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', cursor: saving ? 'not-allowed' : 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            💾 {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}
