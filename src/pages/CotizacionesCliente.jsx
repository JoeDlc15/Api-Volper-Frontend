import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

export default function CotizacionesCliente() {
  const { confirm, ConfirmModal } = useConfirmDialog();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [importQuery, setImportQuery] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  
  // Filtros
  const [selectedClient, setSelectedClient] = useState('Todos los clientes importados');
  const [searchTerm, setSearchTerm] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval;
    if (isImporting) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/import-customer-progress');
          const prog = res.data;
          setImportProgress(prog);

          if (prog.status === 'done' || prog.status === 'error') {
            setIsImporting(false);
            clearInterval(interval);
            if (prog.status === 'done') {
              alert(prog.message || "Importación completada.");
              setImportQuery('');
              fetchData();
            } else {
              alert(prog.message || "Error en importación.");
            }
          }
        } catch (error) {
          console.error("Error polling progress", error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isImporting]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/customer-quotations');
      setData(res.data || []);
    } catch (error) {
      console.error("Error cargando el historial de clientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImportClient = async () => {
    if (!importQuery.trim()) {
      alert("Por favor ingresa un RUC o Nombre de cliente.");
      return;
    }

    try {
      setIsImporting(true);
      setImportProgress({ message: "Iniciando proceso..." });
      await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/import-customer-quotations', { query: importQuery.trim() });
      // El backend responde inmediatamente porque corre en segundo plano.
      // El useEffect de isImporting se encargará de hacer polling.
    } catch (error) {
      alert("Error al iniciar importación: " + (error.response?.data?.error || error.message));
      setIsImporting(false);
    }
  };

  const handleQuitarCliente = async () => {
    if (selectedClient === 'Todos los clientes importados') {
      alert("Selecciona un cliente específico de la lista para quitarlo.");
      return;
    }

    const isConfirmed = await confirm(`¿Estás seguro que deseas eliminar el historial descargado de ${selectedClient}?`);
    if (!isConfirmed) return;

    try {
      setLoading(true);
      await axios.delete((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/customer-quotations', { data: { customer_name: selectedClient } });
      setSelectedClient('Todos los clientes importados');
      fetchData();
    } catch (error) {
      alert("Error al eliminar cliente: " + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  const handleLimpiarTodo = async () => {
    const isConfirmed = await confirm("¿Estás seguro que deseas limpiar TODO el historial de clientes importados?");
    if (!isConfirmed) return;

    try {
      setLoading(true);
      await axios.delete((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/customer-quotations', { data: {} });
      setSelectedClient('Todos los clientes importados');
      fetchData();
    } catch (error) {
      alert("Error al limpiar todo: " + (error.response?.data?.error || error.message));
      setLoading(false);
    }
  };

  // Extraer lista única de clientes para el select
  const uniqueClients = Array.from(new Set(data.map(item => item.customer_name))).filter(Boolean).sort();

  // Filtrado de datos
  const filteredData = data.filter((item) => {
    // Filtro por cliente
    if (selectedClient !== 'Todos los clientes importados' && item.customer_name !== selectedClient) {
      return false;
    }

    // Filtro por texto de búsqueda global
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const searchableString = `${item.customer_name} ${item.number_full} ${item.internal_id} ${item.item_description}`.toLowerCase();
      if (!searchableString.includes(search)) {
        return false;
      }
    }

    return true;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h2 style={{ color: '#312e81', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 5px 0' }}>
            👥 Cotizaciones por Cliente
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Visualiza, filtra e importa cotizaciones y sus productos por cada cliente.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          {/* Lado Izquierdo: Importación */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ➕ Importar / Sincronizar Cliente
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '15px' }}>
              Busca un cliente por su RUC o Nombre exacto para extraer y guardar todas sus cotizaciones e ítems.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="Ej: 20609440458 o SERVICIO DE GRUA..." 
                value={importQuery}
                onChange={(e) => setImportQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleImportClient(); }}
                style={{ flex: 1, padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              />
              <button 
                onClick={handleImportClient}
                disabled={isImporting}
                style={{ padding: '10px 20px', backgroundColor: isImporting ? '#818cf8' : '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isImporting ? '⏳ Deteniendo...' : '⚡ Importar Cliente'}
              </button>
            </div>
            {isImporting && importProgress && (
              <div style={{ marginTop: '10px', fontSize: '0.85rem', color: '#10b981', fontWeight: '500' }}>
                🔄 {importProgress.message}
                {importProgress.total > 0 && ` (${importProgress.current}/${importProgress.total})`}
              </div>
            )}
          </div>

          {/* Lado Derecho: Filtros y Limpieza */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#ea580c', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚡ Opciones de Vista
            </h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '5px' }}>Filtrar por Cliente:</label>
              <select 
                value={selectedClient} 
                onChange={(e) => { setSelectedClient(e.target.value); setCurrentPage(1); }}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
              >
                <option value="Todos los clientes importados">Todos los clientes importados</option>
                {uniqueClients.map((client, idx) => (
                  <option key={idx} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleQuitarCliente}
                style={{ flex: 1, padding: '8px', backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                🗑️ Quitar Cliente
              </button>
              <button 
                onClick={handleLimpiarTodo}
                style={{ flex: 1, padding: '8px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                💀 Limpiar Todo
              </button>
            </div>
          </div>
        </div>

        {/* Controles de tabla */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', color: '#475569' }}>
            <span>Mostrar</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              style={{ padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
            >
              <option value={15}>15</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>registros</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569' }}>Buscar:</span>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', width: '250px' }}
            />
          </div>
        </div>

        {/* Tabla Principal */}
        <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#312e81' }}>
                <th style={{ padding: '12px', fontWeight: '600' }}>Cliente</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>Nro Cotización</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>Fecha</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>¿Vendido?</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>Código</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'center' }}>Cantidad</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>Precio Sistema</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>Precio Venta</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>Total Venta</th>
              </tr>
            </thead>
            <tbody>
              {loading && data.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Cargando datos...</td></tr>
              ) : currentData.length > 0 ? (
                currentData.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: 'white' }}>
                    <td style={{ padding: '12px', color: '#64748b', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.customer_name}>{item.customer_name}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#312e81' }}>{item.number_full}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>{item.date_of_issue}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {item.is_billed ? (
                        <span style={{ backgroundColor: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>✅ Sí</span>
                      ) : (
                        <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>❌ No</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#3b82f6', fontWeight: '500' }}>{item.internal_id || '-'}</td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>{item.quantity}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>S/ {item.sale_unit_price?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#16a34a', fontWeight: 'bold' }}>S/ {item.unit_price?.toFixed(2) || '0.00'}</td>
                    <td style={{ padding: '12px', textAlign: 'right', color: '#1e40af', fontWeight: 'bold' }}>S/ {item.total?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No hay registros disponibles.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Inferior */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
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
        )}
      </div>
      <ConfirmModal />
    </div>
  );
}
