import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Filtros avanzados
  const [almacenFilter, setAlmacenFilter] = useState('Todos');
  const [stockFilter, setStockFilter] = useState('Todos');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Reiniciar a la página 1 cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [search, almacenFilter, stockFilter]);
  
  // Modales state
  const [showIngresoModal, setShowIngresoModal] = useState(false);
  const [showTrasladoModal, setShowTrasladoModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // Estados para formularios
  const [actionLoading, setActionLoading] = useState(false);
  const [ingresoQty, setIngresoQty] = useState('');
  const [ingresoComments, setIngresoComments] = useState('');
  const [trasladoQty, setTrasladoQty] = useState('');
  const [targetWarehouse, setTargetWarehouse] = useState('');

  useEffect(() => {
    fetchMovimientos();
  }, []);

  const fetchMovimientos = async () => {
    try {
      setLoading(true);
      const res = await axios.get('http://localhost:3000/api/movimientos');
      setMovimientos(res.data);
    } catch (error) {
      console.error("Error cargando movimientos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await axios.get('http://localhost:3000/api/update-movimientos');
      fetchMovimientos();
    } catch (error) {
      alert("Error actualizando movimientos.");
      setLoading(false);
    }
  };

  const openIngreso = (item) => {
    setSelectedItem(item);
    setIngresoQty('');
    setIngresoComments('');
    setShowIngresoModal(true);
  };

  const openTraslado = (item) => {
    setSelectedItem(item);
    setTrasladoQty('');
    setTargetWarehouse('');
    setShowTrasladoModal(true);
  };

  const almacenesUnicos = ['Todos', ...new Set(movimientos.map(m => m.warehouse_description).filter(Boolean))];

  // Extraer mapa de almacenes para el modal de Traslado
  const warehouses = [];
  const warehouseMap = new Map();
  movimientos.forEach(m => {
    if (!warehouseMap.has(m.warehouse_id) && m.warehouse_id && m.warehouse_description) {
      warehouseMap.set(m.warehouse_id, m.warehouse_description);
      warehouses.push({ id: m.warehouse_id, name: m.warehouse_description });
    }
  });

  const handleSubmitIngreso = async () => {
    if (!ingresoQty || ingresoQty <= 0) return alert('Ingrese una cantidad válida mayor a cero.');
    try {
      setActionLoading(true);
      await axios.post('http://localhost:3000/api/add-transaction', {
        item_id: selectedItem.item_id,
        item_code: selectedItem.item_internal_id,
        item_description: selectedItem.item_description,
        warehouse_id: selectedItem.warehouse_id,
        warehouse_description: selectedItem.warehouse_description,
        initial_stock: selectedItem.stock,
        quantity: parseFloat(ingresoQty),
        inventory_transaction_id: "19",
        comments: ingresoComments
      });
      alert('✅ Ingreso registrado con éxito');
      setShowIngresoModal(false);
      fetchMovimientos();
    } catch (error) {
      alert('❌ Error al registrar ingreso: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitTraslado = async () => {
    if (!trasladoQty || trasladoQty <= 0) return alert('Ingrese una cantidad válida mayor a cero.');
    if (!targetWarehouse) return alert('Seleccione un almacén de destino.');
    if (String(targetWarehouse) === String(selectedItem.warehouse_id)) return alert('El almacén de destino debe ser diferente al de origen.');
    
    try {
      setActionLoading(true);
      await axios.post('http://localhost:3000/api/move-transaction', {
        id: selectedItem.id,
        item_id: selectedItem.item_id,
        item_code: selectedItem.item_internal_id,
        item_description: selectedItem.item_description,
        warehouse_id: selectedItem.warehouse_id,
        warehouse_description: selectedItem.warehouse_description,
        quantity: selectedItem.stock,
        warehouse_new_id: targetWarehouse,
        target_warehouse_description: warehouseMap.get(parseInt(targetWarehouse)) || warehouseMap.get(String(targetWarehouse)),
        quantity_move: parseFloat(trasladoQty),
        quantity_real: selectedItem.stock - parseFloat(trasladoQty),
        lots_enabled: false,
        series_enabled: false,
        lots: [],
        lots_group: [],
        detail: []
      });
      alert('✅ Traslado registrado con éxito');
      setShowTrasladoModal(false);
      fetchMovimientos();
    } catch (error) {
      alert('❌ Error al registrar traslado: ' + (error.response?.data?.error || error.message));
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = movimientos.filter(m => {
    // Búsqueda multi-palabra
    const searchTerms = search.toLowerCase().trim().split(/\s+/);
    const textToSearch = `${m.item_internal_id || ''} ${m.item_description || ''}`.toLowerCase();
    const matchSearch = searchTerms.every(term => textToSearch.includes(term));

    // Filtro Almacén
    const matchAlmacen = almacenFilter === 'Todos' || m.warehouse_description === almacenFilter;

    // Filtro Stock
    let matchStock = true;
    if (stockFilter === 'Con Stock') matchStock = parseFloat(m.stock) > 0;
    if (stockFilter === 'Sin Stock') matchStock = parseFloat(m.stock) === 0;

    return matchSearch && matchAlmacen && matchStock;
  });

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <>
      <div className="premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#1e293b' }}>🔄 Movimientos e Ingresos</h2>
        <button 
          onClick={handleUpdate}
          disabled={loading}
          style={{
            padding: '8px 16px', backgroundColor: '#3b82f6', 
            color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer'
          }}
        >
          {loading ? 'Extrayendo...' : '📥 Extraer Movimientos'}
        </button>
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
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px' }}>Código</th>
              <th style={{ padding: '8px' }}>Descripción</th>
              <th style={{ padding: '8px' }}>Almacén</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Stock</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && movimientos.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>Cargando movimientos...</td></tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px', fontWeight: '500' }}>{m.item_internal_id}</td>
                  <td style={{ padding: '8px' }}>{m.item_description}</td>
                  <td style={{ padding: '8px' }}>{m.warehouse_description}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{m.stock}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button onClick={() => openIngreso(m)} style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>➕ Ingreso</button>
                      <button onClick={() => openTraslado(m)} style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🔄 Traslado</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '15px' }}>No hay movimientos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
        <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Mostrando {filtered.length === 0 ? 0 : indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filtered.length)} de {filtered.length} registros
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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

      {/* Modal Ingreso */}
      {showIngresoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Ingreso de Producto</h3>
            <p style={{ fontWeight: 'bold', color: '#1e293b' }}>{selectedItem?.item_internal_id}</p>
            <p style={{ margin: '5px 0 15px', color: '#64748b', fontSize: '0.9rem' }}>{selectedItem?.item_description}</p>
            <p style={{ fontSize: '0.85rem', color: '#3b82f6', marginBottom: '15px' }}>📍 Origen: {selectedItem?.warehouse_description} (Stock: {selectedItem?.stock})</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Cantidad a Ingresar:</label>
              <input 
                type="number" 
                min="1"
                value={ingresoQty}
                onChange={e => setIngresoQty(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Comentario (Kardex):</label>
              <input 
                type="text" 
                placeholder="Ej. Ingreso de Producción"
                value={ingresoComments}
                onChange={e => setIngresoComments(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button disabled={actionLoading} onClick={() => setShowIngresoModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button disabled={actionLoading} onClick={handleSubmitIngreso} style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? 'Guardando...' : 'Guardar Ingreso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Traslado */}
      {showTrasladoModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px', width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Traslado entre Almacenes</h3>
            <p style={{ fontWeight: 'bold', color: '#1e293b' }}>{selectedItem?.item_internal_id}</p>
            <p style={{ margin: '5px 0 15px', color: '#64748b', fontSize: '0.9rem' }}>{selectedItem?.item_description}</p>
            <p style={{ fontSize: '0.85rem', color: '#3b82f6', marginBottom: '15px' }}>📍 Origen: {selectedItem?.warehouse_description} (Stock Disponible: {selectedItem?.stock})</p>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Almacén de Destino:</label>
              <select 
                value={targetWarehouse}
                onChange={e => setTargetWarehouse(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              >
                <option value="">Seleccione un almacén...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id} disabled={String(w.id) === String(selectedItem?.warehouse_id)}>
                    {w.name} {String(w.id) === String(selectedItem?.warehouse_id) ? '(Origen)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Cantidad a Trasladar:</label>
              <input 
                type="number" 
                min="1"
                max={selectedItem?.stock}
                value={trasladoQty}
                onChange={e => setTrasladoQty(e.target.value)}
                style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button disabled={actionLoading} onClick={() => setShowTrasladoModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
              <button disabled={actionLoading} onClick={handleSubmitTraslado} style={{ padding: '8px 16px', backgroundColor: '#64748b', color: 'white', border: 'none', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}>
                {actionLoading ? 'Procesando...' : 'Confirmar Traslado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
