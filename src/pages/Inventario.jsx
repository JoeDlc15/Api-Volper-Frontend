import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Inventario() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Nuevos estados para filtros
  const [almacenFilter, setAlmacenFilter] = useState('Todos');
  const [stockFilter, setStockFilter] = useState('Todos');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, almacenFilter, stockFilter]);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/products');
      setProductos(res.data);
      
      const updatesRes = await axios.get('http://localhost:3000/api/last-updates');
      if (updatesRes.data && updatesRes.data.catalog) {
        setLastUpdate(new Date(updatesRes.data.catalog).toLocaleString());
      }
    } catch (error) {
      console.error("Error cargando productos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCatalog = async () => {
    try {
      setLoading(true);
      await axios.get('http://localhost:3000/api/update-catalog');
      fetchProductos();
    } catch (error) {
      alert("Error actualizando catálogo.");
      setLoading(false);
    }
  };

  // Obtener lista única de almacenes para el select
  const almacenesUnicos = ['Todos', ...new Set(productos.map(p => p.warehouse_name).filter(Boolean))];

  const filteredProductos = productos.filter(p => {
    // Filtro de Búsqueda de texto (Multi-palabra o letras sueltas)
    const searchTerms = search.toLowerCase().trim().split(/\s+/);
    const textToSearch = `${p.internal_id || ''} ${p.name || ''}`.toLowerCase();
    const matchSearch = searchTerms.every(term => textToSearch.includes(term));
    
    // Filtro de Almacén
    const matchAlmacen = almacenFilter === 'Todos' || p.warehouse_name === almacenFilter;

    // Filtro de Stock
    let matchStock = true;
    if (stockFilter === 'Con Stock') matchStock = p.stock > 0;
    if (stockFilter === 'Sin Stock') matchStock = p.stock === 0;
    if (stockFilter === 'Stock Negativo') matchStock = p.stockDiferencia < 0;
    if (stockFilter === 'Con Reserva') matchStock = p.reserva > 0;

    return matchSearch && matchAlmacen && matchStock;
  }).sort((a, b) => {
    const codeA = (a.internal_id || '').toLowerCase();
    const codeB = (b.internal_id || '').toLowerCase();
    if (codeA < codeB) return -1;
    if (codeA > codeB) return 1;
    
    // Si tienen el mismo código, ordenar por almacén
    const whA = (a.warehouse_name || '').toLowerCase();
    const whB = (b.warehouse_name || '').toLowerCase();
    if (whA < whB) return -1;
    if (whA > whB) return 1;
    return 0;
  });

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredProductos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredProductos.length / itemsPerPage);

  return (
    <div className="premium-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#1e293b' }}>📦 Inventario de Productos</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {lastUpdate && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Última actualización: <strong>{lastUpdate}</strong></span>}
          <button 
            onClick={handleUpdateCatalog}
            disabled={loading}
            style={{
              padding: '8px 16px', backgroundColor: 'var(--primary-color)', 
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
            }}
          >
            {loading ? 'Actualizando...' : '🔄 Actualizar Catálogo'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Buscador Global</label>
          <input 
            type="text" 
            placeholder="Buscar código o nombre..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
          />
        </div>

        <div style={{ minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Filtrar por Almacén</label>
          <select 
            value={almacenFilter} 
            onChange={(e) => setAlmacenFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: 'white' }}
          >
            {almacenesUnicos.map(almacen => (
              <option key={almacen} value={almacen}>{almacen}</option>
            ))}
          </select>
        </div>

        <div style={{ minWidth: '200px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Filtrar por Stock</label>
          <select 
            value={stockFilter} 
            onChange={(e) => setStockFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', backgroundColor: 'white' }}
          >
            <option value="Todos">Todos los productos</option>
            <option value="Con Stock">Con Stock Positivo</option>
            <option value="Sin Stock">Sin Stock (Cero)</option>
            <option value="Stock Negativo">Con Stock Negativo</option>
            <option value="Con Reserva">Con Reservas Activas</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px' }}>Código</th>
              <th style={{ padding: '8px' }}>Descripción</th>
              <th style={{ padding: '8px' }}>Categoría</th>
              <th style={{ padding: '8px' }}>Almacén</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Stock Total</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Reserva</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Disponible</th>
            </tr>
          </thead>
          <tbody>
            {loading && productos.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '15px' }}>Cargando inventario...</td></tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((p, index) => (
                <tr key={`${p.internal_id}-${index}`} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', fontWeight: '600' }}>{p.internal_id}</td>
                  <td style={{ padding: '8px' }}>{p.name}</td>
                  <td style={{ padding: '8px' }}>{p.item_category_name}</td>
                  <td style={{ padding: '8px' }}>{p.warehouse_name}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{p.stock}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: p.reserva > 0 ? '#ef4444' : '#64748b' }}>
                    {p.reserva}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: p.stockDiferencia > 0 ? '#10b981' : '#ef4444' }}>
                    {p.stockDiferencia}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" style={{ textAlign: 'center', padding: '15px' }}>No hay productos que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
          Mostrando {filteredProductos.length === 0 ? 0 : indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filteredProductos.length)} de {filteredProductos.length} registros
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem' }}>
          <select 
            value={itemsPerPage} 
            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
          >
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={200}>200 por página</option>
          </select>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', background: currentPage === 1 ? '#f1f5f9' : 'white', borderRadius: '4px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              Anterior
            </button>
            <span style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px' }}>
              Página {currentPage} de {totalPages || 1}
            </span>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages || totalPages === 0}
              style={{ padding: '6px 10px', border: '1px solid #cbd5e1', background: (currentPage === totalPages || totalPages === 0) ? '#f1f5f9' : 'white', borderRadius: '4px', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer' }}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
