import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

export default function Catalogo() {
  const [productos, setProductos] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [almacenFilter, setAlmacenFilter] = useState('Todos');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Modal de Asignación
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newOrigin, setNewOrigin] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Modal de Importación
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, wareRes] = await Promise.all([
        axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/products'),
        axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/warehouses')
      ]);
      // Deduplicar productos para que solo haya 1 por cada internal_id (sin importar cuántos almacenes tenga)
      const uniqueProducts = [];
      const seen = new Set();
      for (const p of prodRes.data) {
        if (!p.internal_id) continue;
        if (!seen.has(p.internal_id)) {
          seen.add(p.internal_id);
          uniqueProducts.push(p);
        }
      }
      setProductos(uniqueProducts);
      setWarehouses(wareRes.data.value || wareRes.data || []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error al cargar el catálogo o almacenes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductos = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/products');
      const uniqueProducts = [];
      const seen = new Set();
      for (const p of res.data) {
        if (!p.internal_id) continue;
        if (!seen.has(p.internal_id)) {
          seen.add(p.internal_id);
          uniqueProducts.push(p);
        }
      }
      setProductos(uniqueProducts);
    } catch (error) {
      console.error("Error cargando productos:", error);
    }
  };

  const openAssignModal = (producto) => {
    setSelectedProduct(producto);
    setNewOrigin(producto.originWarehouse || '');
    setShowModal(true);
  };

  const handleSaveOrigin = async () => {
    if (!selectedProduct) return;
    
    setIsSaving(true);
    const loadingToast = toast.loading('Guardando origen...');
    
    try {
      // Ajusta este endpoint según tu backend si es necesario
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/products/${selectedProduct.id}/origin`, {
        originWarehouse: newOrigin || null
      });
      
      toast.success('Almacén de origen actualizado', { id: loadingToast });
      setShowModal(false);
      setSelectedProduct(null);
      fetchProductos(); // Recargar la lista
    } catch (error) {
      toast.error('Error al guardar el origen: ' + (error.response?.data?.error || error.message), { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  // Filtrado
  const filteredData = productos.filter((item) => {
    let match = true;
    if (searchTerm) {
      const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
      const textToSearch = `${item.internal_id || ''} ${item.name || ''} ${item.description || ''}`.toLowerCase();
      match = match && searchTerms.every(term => textToSearch.includes(term));
    }
    if (almacenFilter !== 'Todos') {
      const origin = item.originWarehouse || 'Automático (Por Stock)';
      match = match && origin === almacenFilter;
    }
    return match;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="premium-card">
        <Toaster position="bottom-right" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#1e293b', fontSize: '1.4rem', margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📦 Catálogo / Orígenes
          </h2>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>
            Asigna el almacén de origen para reservas automáticas.
          </p>
        </div>
        <button 
          onClick={() => setShowImportModal(true)}
          style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          📁 Importar Excel / CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', fontWeight: '500' }}>Buscador Global</label>
          <input 
            type="text" 
            placeholder="Buscar código o nombre..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px', fontWeight: '500' }}>Filtrar por Almacén</label>
          <select 
            value={almacenFilter} 
            onChange={(e) => { setAlmacenFilter(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', boxSizing: 'border-box' }}
          >
            <option value="Todos">Todos</option>
            <option value="Automático (Por Stock)">Automático (Por Stock)</option>
            {warehouses.map(w => {
              const displayName = w.alias || w.name;
              return <option key={w.id} value={displayName}>{displayName}</option>;
            })}
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
              <th style={{ padding: '12px 15px', fontWeight: '600' }}>ID Interno</th>
              <th style={{ padding: '12px 15px', fontWeight: '600' }}>Nombre</th>
              <th style={{ padding: '12px 15px', fontWeight: '600', textAlign: 'center' }}>Almacén Origen Actual</th>
              <th style={{ padding: '12px 15px', fontWeight: '600', textAlign: 'center' }}>Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading && productos.length === 0 ? (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Cargando catálogo...</td></tr>
            ) : currentData.length > 0 ? (
              currentData.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 15px', color: '#4f46e5', fontWeight: '500' }}>{prod.internal_id}</td>
                  <td style={{ padding: '12px 15px', color: '#1e293b' }}>{prod.name || prod.description || '-'}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'center', color: prod.originWarehouse ? '#1e293b' : '#94a3b8', fontStyle: prod.originWarehouse ? 'normal' : 'italic' }}>
                    {prod.originWarehouse || 'Automático (Por Stock)'}
                  </td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <button 
                      onClick={() => openAssignModal(prod)}
                      style={{ padding: '6px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500' }}
                    >
                      ✏️ Asignar Origen
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No se encontraron productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!loading && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.85rem', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            Mostrando {filteredData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', color: '#475569' }}
            >
              <option value={25}>25 por página</option>
              <option value={50}>50 por página</option>
              <option value={100}>100 por página</option>
            </select>

            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: currentPage === 1 ? '#f8fafc' : 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', color: currentPage === 1 ? '#94a3b8' : '#475569' }}
            >
              Anterior
            </button>
            <span style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: 'white', color: '#475569' }}>
              Página {currentPage} de {totalPages || 1}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.max(totalPages, 1)))}
              disabled={currentPage >= totalPages}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: currentPage >= totalPages ? '#f8fafc' : 'white', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', color: currentPage >= totalPages ? '#94a3b8' : '#475569' }}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
      </div> {/* Cierre del premium-card */}

      {/* Modal de Asignación - Colocado fuera del premium-card para arreglar z-index */}
      {showModal && selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '15px' }}>✏️ Asignar Almacén de Origen</h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px' }}>
              <strong>Producto:</strong> {selectedProduct.name || selectedProduct.description}
            </p>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Selecciona el almacén:</label>
              <select 
                value={newOrigin}
                onChange={(e) => setNewOrigin(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '0.95rem' }}
              >
                <option value="">Automático (Por Stock)</option>
                {warehouses.map(w => {
                  const displayName = w.alias || w.name;
                  return <option key={w.id} value={displayName}>{displayName}</option>;
                })}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveOrigin}
                disabled={isSaving}
                style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '500' }}
              >
                {isSaving ? 'Guardando...' : 'Guardar Origen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importación */}
      {showImportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '15px' }}>📁 Importar Catálogo / Orígenes</h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '15px' }}>
              Sube un archivo Excel (.xlsx) o CSV con el formato requerido para actualizar masivamente los orígenes.
            </p>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '6px', border: '1px dashed #cbd5e1', marginBottom: '20px' }}>
              <strong style={{ fontSize: '0.9rem', color: '#334155' }}>Formato Requerido (Ejemplo):</strong>
              <table style={{ width: '100%', marginTop: '10px', fontSize: '0.85rem', color: '#475569', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e2e8f0' }}>
                    <th style={{ padding: '5px', border: '1px solid #cbd5e1' }}>id_interno</th>
                    <th style={{ padding: '5px', border: '1px solid #cbd5e1' }}>origen</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>23-006004</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>2do Piso</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>10-A4500</td>
                    <td style={{ padding: '5px', border: '1px solid #cbd5e1' }}>Automático</td>
                  </tr>
                </tbody>
              </table>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '10px', marginBottom: 0 }}>
                Asegúrate de que la primera fila contenga exactamente las cabeceras <b>id_interno</b> y <b>origen</b>.
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowImportModal(false)}
                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  toast.error("Endpoint de importación pendiente de integrar.");
                  setShowImportModal(false);
                }}
                style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
              >
                Subir y Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
