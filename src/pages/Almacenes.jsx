import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

export default function Almacenes() {
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  const fetchAlmacenes = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/warehouses');
      setAlmacenes(res.data.value || res.data || []);
    } catch (error) {
      console.error("Error cargando almacenes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAliasChange = (id, newAlias) => {
    setAlmacenes(prev => prev.map(a => a.id === id ? { ...a, alias: newAlias } : a));
  };

  const saveAlias = async (id, alias) => {
    const loadingToast = toast.loading('Guardando alias...');
    try {
      await axios.put(`http://localhost:3000/api/warehouses/${id}`, { alias });
      toast.success('Alias guardado correctamente', { id: loadingToast });
    } catch (error) {
      toast.error('Error guardando alias: ' + error.message, { id: loadingToast });
    }
  };

  return (
    <div className="premium-card">
      <Toaster position="bottom-right" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#1e293b' }}>🏢 Gestión de Almacenes</h2>
        <button 
          onClick={fetchAlmacenes}
          disabled={loading}
          style={{
            padding: '8px 16px', backgroundColor: '#3b82f6', 
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
          }}
        >
          {loading ? 'Cargando...' : '🔄 Actualizar Lista'}
        </button>
      </div>

      <p style={{ color: '#64748b', marginBottom: '20px' }}>
        Asigna alias cortos a los almacenes para que se muestren de forma más limpia en los filtros y tablas de tu sistema.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '12px' }}>ID Interno</th>
              <th style={{ padding: '12px' }}>Nombre Original del Almacén</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Productos</th>
              <th style={{ padding: '12px' }}>Alias Personalizado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && almacenes.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Cargando almacenes...</td></tr>
            ) : almacenes.length > 0 ? (
              almacenes.map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px', color: '#64748b' }}>#{a.id}</td>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{a.name}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{ background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      {a.itemCount || 0} ítems
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <input 
                      type="text" 
                      value={a.alias || ''}
                      onChange={(e) => handleAliasChange(a.id, e.target.value)}
                      placeholder="Ej. Principal"
                      style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                    />
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button 
                      onClick={() => saveAlias(a.id, a.alias)}
                      style={{ padding: '6px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      💾 Guardar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No hay almacenes sincronizados.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
