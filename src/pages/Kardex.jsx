import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

export default function Kardex() {
  const [kardex, setKardex] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    fetchKardex();
  }, []);

  const fetchKardex = async () => {
    try {
      setLoading(true);
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/kardex');
      // Asegurar que si el backend manda un objeto con {data: ...} o solo el array lo manejemos bien
      const dataArray = Array.isArray(res.data) ? res.data : (res.data.data || []);
      // Ordenar más recientes primero
      setKardex(dataArray.sort((a, b) => b.id - a.id));
    } catch (error) {
      console.error("Error cargando kardex:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = kardex.filter(k => {
    const searchTerms = search.toLowerCase().trim().split(/\s+/);
    const textToSearch = `${k.item_code || ''} ${k.item_description || ''} ${k.comments || ''}`.toLowerCase();
    return searchTerms.every(term => textToSearch.includes(term));
  });

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert("No hay registros en el Kardex para exportar.");
      return;
    }
    const dataToExport = filtered.map(k => ({
      Fecha: k.date,
      Codigo: k.item_code,
      Descripcion: k.item_description,
      Almacen: k.warehouse_description,
      Stock_Inicial: k.initial_stock,
      Movimiento: k.added_quantity,
      Stock_Final: k.final_stock,
      Comentarios: k.comments
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kardex");
    XLSX.writeFile(wb, `Kardex_Filtrado_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Lógica de paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  return (
    <div className="premium-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#1e293b' }}>📊 Kardex de Ingresos y Traslados</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Buscar en el historial..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
          />
          <button 
            onClick={handleExportExcel}
            style={{
              padding: '8px 16px', backgroundColor: '#059669', 
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            📊 Exportar Excel
          </button>
          <button 
            onClick={fetchKardex}
            disabled={loading}
            style={{
              padding: '8px 16px', backgroundColor: '#10b981', 
              color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {loading ? '⏳ Cargando...' : '🔄 Actualizar Vista'}
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <th style={{ padding: '8px' }}>Fecha y Hora</th>
              <th style={{ padding: '8px' }}>Código</th>
              <th style={{ padding: '8px' }}>Descripción</th>
              <th style={{ padding: '8px' }}>Almacén</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Stock Inicial</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Movimiento</th>
              <th style={{ padding: '8px', textAlign: 'center' }}>Stock Final</th>
              <th style={{ padding: '8px' }}>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {loading && kardex.length === 0 ? (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '15px' }}>Cargando historial...</td></tr>
            ) : currentItems.length > 0 ? (
              currentItems.map((k, idx) => {
                const isPositive = k.added_quantity > 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', color: '#64748b' }}>{k.date}</td>
                    <td style={{ padding: '8px', fontWeight: '500' }}>{k.item_code}</td>
                    <td style={{ padding: '8px' }}>{k.item_description}</td>
                    <td style={{ padding: '8px' }}>{k.warehouse_description}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{k.initial_stock}</td>
                    <td style={{ 
                      padding: '8px', 
                      textAlign: 'center', 
                      fontWeight: 'bold',
                      color: isPositive ? '#10b981' : '#ef4444' 
                    }}>
                      {isPositive ? `+${k.added_quantity}` : k.added_quantity}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{k.final_stock}</td>
                    <td style={{ padding: '8px', color: '#64748b', fontStyle: 'italic' }}>{k.comments}</td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="8" style={{ textAlign: 'center', padding: '15px' }}>No hay registros en el Kardex.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginación */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
        <span style={{ color: '#64748b', fontSize: '0.85rem' }}>
          Mostrando {filtered.length === 0 ? 0 : indexOfFirstItem + 1} a {Math.min(indexOfLastItem, filtered.length)} de {filtered.length} registros
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
