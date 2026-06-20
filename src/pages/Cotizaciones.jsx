import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import { Toaster } from 'react-hot-toast';
import { generarCotizacionPDF } from '../utils/pdfGenerator';
import ManualQuotationModal from '../components/ManualQuotationModal';
import * as XLSX from 'xlsx';

export default function Cotizaciones({ filterMode = 'nacional' }) {
  const { confirm, ConfirmModal } = useConfirmDialog();
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos los estados');
  
  // Ordenamiento
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('cotizacionesItemsPerPage');
    return saved ? Number(saved) : 10;
  });

  // Detalle
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);

  // Modal y Notificaciones
  const [showNewCotizacionModal, setShowNewCotizacionModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [importNumber, setImportNumber] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNumber, setDeleteNumber] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Traslado Masivo
  const [showMassiveTransferModal, setShowMassiveTransferModal] = useState(false);
  const [transferTargetWarehouse, setTransferTargetWarehouse] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedItemsToTransfer, setSelectedItemsToTransfer] = useState([]);

  const [pdfPreview, setPdfPreview] = useState(null);

  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    fetchCotizaciones();
    fetchWarehouses();
  }, [filterMode]);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/warehouses');
      setWarehouses(res.data);
    } catch (error) {
      console.error("Error cargando almacenes:", error);
    }
  };

  const handleMassiveTransfer = async () => {
    if (!selectedCotizacion) return;

    // Verificar si hay stock negativo
    const hasNegativeStock = selectedCotizacion.items.some(item => parseFloat(item.quantity) > parseFloat(item.stockTotal || 0));
    if (hasNegativeStock) {
        const isConfirmed = await confirm("Estás a punto de realizar un traslado sin tener el stock completo (algunos productos quedarán en negativo). ¿Deseas continuar?");
        if (!isConfirmed) return;
    }

    setIsTransferring(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/${selectedCotizacion.id}/transfer-all`, {
        target_warehouse_id: transferTargetWarehouse,
        selected_item_ids: selectedItemsToTransfer
      });
      if (res.data.success) {
        showNotification(res.data.message, 'success');
        setShowMassiveTransferModal(false);
        fetchCotizaciones();
        setSelectedCotizacion(null);
      }
    } catch (error) {
      showNotification(error.response?.data?.error || "Error al trasladar cotización", 'error');
    } finally {
      setIsTransferring(false);
    }
  };

  const fetchCotizaciones = async () => {
    try {
      setLoading(true);
      const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/quotations');
      let data = res.data.value || res.data || [];
      if (filterMode === 'internacional') {
        data = data.filter(q => q.number && q.number.startsWith('EXT-'));
      } else {
        data = data.filter(q => !q.number || !q.number.startsWith('EXT-'));
      }
      setCotizaciones(data);
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncInvoices = async () => {
    try {
      showNotification("Iniciando sincronización masiva. Esto puede tardar unos minutos...", "info");
      const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/sync-invoices');
      fetchCotizaciones();
      const count = res.data.updatedCount || 0;
      showNotification(`Sincronización completada. ${count} fueron actualizados.`, "success");
    } catch (error) {
      showNotification("Error al sincronizar: " + (error.response?.data?.error || error.message), "error");
    }
  };

  const handleVerDetalle = async (number) => {
    try {
      setSelectedCotizacion({ number, loading: true }); 
      setSelectedItemsToTransfer([]); // Reset selection
      
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/${number}`);
      setSelectedCotizacion({ ...res.data, loading: false });
      
      // Auto-scroll
      setTimeout(() => {
        document.getElementById('detalle-cotizacion')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      showNotification("Error cargando detalles: " + (error.response?.data?.error || error.message), "error");
      setSelectedCotizacion(null);
    }
  };

  const handleEditDate = async (id, currentVal) => {
    const rawDate = currentVal ? new Date(currentVal).toISOString().split('T')[0] : '';
    const newDate = prompt("Editar Fecha de Importación (YYYY-MM-DD):", rawDate);
    if (!newDate) return;
    try {
      showNotification(`Actualizando fecha...`, "info");
      const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/${id}/date`, { newDate });
      if (res.data.success) {
        showNotification("Fecha actualizada correctamente", "success");
        fetchCotizaciones();
      }
    } catch(e) {
      showNotification("Error al actualizar fecha", "error");
    }
  };

  const handleImportCotizacion = async () => {
    if (!importNumber.trim()) {
      showNotification("Por favor, ingresa un número de cotización.", "error");
      return;
    }
    
    const numberOnly = importNumber.replace(/\D/g, '');
    if (!numberOnly) {
      showNotification("Por favor, ingresa un número válido.", "error");
      return;
    }

    try {
        const existingRes = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/COT-${numberOnly}`).catch(() => null);
        if (existingRes && existingRes.data && (existingRes.data.status === 'TRASLADADO' || existingRes.data.status === 'FACTURADO')) {
            const isConfirmed = await confirm(`⚠️ ATENCIÓN: La cotización COT-${numberOnly} ya se encuentra en estado ${existingRes.data.status}.\n\nSi la importas nuevamente, sus datos se sobreescribirán y regresará a PENDIENTE, corriendo el riesgo de duplicar traslados o procesos.\n\n¿Estás completamente seguro de continuar y reescribirla?`);
            if (!isConfirmed) return;
        }
    } catch(e) {}

    try {
      setIsImporting(true);
      showNotification(`Importando cotización ${importNumber}...`, "info");
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/add-quotation`, { quotationNumber: numberOnly });
      
      showNotification(res.data.message || `Cotización ${importNumber} importada exitosamente.`, "success");
      setShowNewCotizacionModal(false);
      setImportNumber('');
      fetchCotizaciones(); // Recargar la lista
    } catch (error) {
      showNotification("Error al importar: " + (error.response?.data?.error || error.message), "error");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      showNotification("Generando reporte Excel...", "info");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations-export-data`);
      if (res.data.success && res.data.data.length > 0) {
        // Filtrar según nacional o internacional
        let exportData = res.data.data;
        if (filterMode === 'internacional') {
          exportData = exportData.filter(q => q.Cotizacion && q.Cotizacion.startsWith('EXT-'));
        } else {
          exportData = exportData.filter(q => !q.Cotizacion || !q.Cotizacion.startsWith('EXT-'));
        }

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Cotizaciones");
        XLSX.writeFile(wb, `Cotizaciones_${filterMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
        showNotification("Excel descargado correctamente.", "success");
      } else {
        showNotification("No hay datos para exportar.", "error");
      }
    } catch (error) {
      showNotification("Error al exportar a Excel: " + (error.response?.data?.error || error.message), "error");
    }
  };

  const handleDeleteCotizacion = async () => {
    if (!deleteNumber.trim()) {
      showNotification("Por favor, ingresa el número de cotización a eliminar.", "error");
      return;
    }
    
    let finalNumber = deleteNumber.trim().toUpperCase();
    if (!finalNumber.startsWith('EXT-') && !finalNumber.startsWith('COT-')) {
      finalNumber = `COT-${finalNumber.replace(/\D/g, '')}`;
    }
    
    if (!finalNumber || finalNumber === 'COT-') {
      showNotification("Número inválido.", "error");
      return;
    }

    const isConfirmed = await confirm(`¿Estás completamente seguro de eliminar la cotización ${finalNumber}? Esta acción no se puede deshacer.`);
    if (!isConfirmed) {
      return;
    }

    try {
      setIsDeleting(true);
      showNotification(`Eliminando ${finalNumber}...`, "info");
      
      const res = await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/${finalNumber}`);
      
      showNotification(res.data.message || `Cotización eliminada exitosamente.`, "success");
      setShowDeleteModal(false);
      setDeleteNumber('');
      fetchCotizaciones(); // Recargar la lista
      if (selectedCotizacion?.number === finalNumber) {
        setSelectedCotizacion(null);
      }
    } catch (error) {
      showNotification("Error al eliminar: " + (error.response?.data?.error || error.message), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    try {
      if (!selectedCotizacion?.id) {
        showNotification("No se puede actualizar porque no hay ID.", "error");
        return;
      }
      showNotification(`Cambiando estado a ${newStatus}...`, "info");
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/${selectedCotizacion.id}/status`, { status: newStatus });
      showNotification(`Cotización actualizada a ${newStatus}.`, "success");
      
      // Recargar completamente el detalle para que el backend recalcule las reservas y stock de los items
      await handleVerDetalle(selectedCotizacion.number);
      
      // Recargamos la tabla principal
      fetchCotizaciones();
    } catch (error) {
      showNotification("Error al actualizar: " + (error.response?.data?.error || error.message), "error");
    }
  };

  const handleUpdateObservation = async (id, isObserved, text) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/quotations/${id}/observation`, { 
        isObserved: isObserved, 
        observationText: text 
      });
      setCotizaciones(prev => prev.map(c => c.id === id ? { ...c, isObserved, observationText: text } : c));
      if (selectedCotizacion?.id === id) {
        setSelectedCotizacion(prev => ({ ...prev, isObserved, observationText: text }));
      }
      showNotification("Observación guardada correctamente.", "success");
    } catch(error) {
      showNotification("Error al guardar observación.", "error");
    }
  };

  // Filtrado
  const filteredData = cotizaciones.filter((item) => {
    // Filtro por estado
    if (statusFilter !== 'Todos los estados' && item.status !== statusFilter) return false;

    // Filtro por texto
    if (!searchTerm) return true;
    const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.trim() !== '');
    const searchableString = `${item.number || ''} ${item.customerName || ''} ${item.documentRef || ''}`.toLowerCase();
    return searchTerms.every(term => searchableString.includes(term));
  }).sort((a, b) => {
    if (!sortConfig.key) return 0;
    
    let aVal, bVal;
    
    switch (sortConfig.key) {
      case 'status':
        const statusOrder = { 'PENDIENTE': 1, 'RESERVADO': 2, 'TRASLADADO': 3, 'FACTURADO': 4 };
        aVal = statusOrder[a.status] || 99;
        bVal = statusOrder[b.status] || 99;
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt || a.date || 0).getTime();
        bVal = new Date(b.createdAt || b.date || 0).getTime();
        break;
      case 'number':
        aVal = parseInt((a.number || '').replace(/\D/g, '')) || 0;
        bVal = parseInt((b.number || '').replace(/\D/g, '')) || 0;
        break;
      default:
        aVal = (a[sortConfig.key] || '').toString().toLowerCase();
        bVal = (b[sortConfig.key] || '').toString().toLowerCase();
        break;
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (status) => {
    if (status === 'FACTURADO') return <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>FACTURADO</span>;
    if (status === 'TRASLADADO') return <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>TRASLADADO</span>;
    if (status === 'PENDIENTE') return <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>PENDIENTE</span>;
    if (status === 'RESERVADO') return <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>RESERVADO</span>;
    return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>{status}</span>;
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span style={{ opacity: 0.3, marginLeft: '4px', fontSize: '0.75rem' }}>↕</span>;
    return <span style={{ marginLeft: '4px', fontSize: '0.75rem' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Toaster position="bottom-right" />
      {/* Tabla Principal */}
      <div className="premium-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
          <h2 style={{ color: '#1e293b', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            {filterMode === 'internacional' ? '🌍 Cotizaciones Internacionales' : '📄 Gestión de Cotizaciones'}
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {filterMode === 'nacional' && (
              <>
                <button 
                  onClick={() => setShowNewCotizacionModal(true)}
                  style={{ padding: '8px 16px', backgroundColor: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  📥 Importar de Volper
                </button>
                <button 
                  onClick={handleSyncInvoices}
                  style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  ✅ Sincronizar Facturas (Masivo)
                </button>
              </>
            )}
            {filterMode === 'internacional' && (
              <button 
                onClick={() => setShowManualModal(true)}
                style={{ padding: '8px 16px', backgroundColor: '#eab308', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                📝 Nueva Cotización Internacional
              </button>
            )}
            <button 
              onClick={handleExportExcel}
              style={{ padding: '8px 16px', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              📊 Exportar Excel
            </button>
            <button 
              onClick={() => setShowDeleteModal(true)}
              style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              🗑️ Eliminar
            </button>
          </div>
        </div>

        {/* Barra de Filtros Unificada */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '15px', flexWrap: 'wrap' }}>
          
          <input 
            type="text" 
            placeholder="🔍 Buscar por número, cliente, RUC, factura o vendedor..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ flex: 1, minWidth: '300px', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none', fontSize: '0.9rem' }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '8px 15px', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>Estado:</label>
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ padding: '4px 8px', border: '1px solid #3b82f6', borderRadius: '4px', outline: 'none', backgroundColor: 'white', fontSize: '0.85rem', color: '#312e81', minWidth: '130px' }}
              >
                <option value="Todos los estados">Todos los estados</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="RESERVADO">RESERVADO</option>
                <option value="TRASLADADO">TRASLADADO</option>
                {filterMode === 'nacional' && <option value="FACTURADO">FACTURADO</option>}
              </select>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#ffffff', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                <th onClick={() => handleSort('number')} style={{ padding: '12px 8px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                  Número <SortIcon columnKey="number" />
                </th>
                <th onClick={() => handleSort('createdAt')} style={{ padding: '12px 8px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                  Fecha <SortIcon columnKey="createdAt" />
                </th>
                <th onClick={() => handleSort('customerName')} style={{ padding: '12px 8px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                  Cliente <SortIcon columnKey="customerName" />
                </th>
                <th onClick={() => handleSort('customerRuc')} style={{ padding: '12px 8px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                  RUC <SortIcon columnKey="customerRuc" />
                </th>
                <th onClick={() => handleSort('status')} style={{ padding: '12px 8px', fontWeight: '600', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                  Estado <SortIcon columnKey="status" />
                </th>
                <th onClick={() => handleSort('documentRef')} style={{ padding: '12px 8px', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}>
                  Documento <SortIcon columnKey="documentRef" />
                </th>
                <th style={{ padding: '12px 8px', fontWeight: '600' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {loading && cotizaciones.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Cargando cotizaciones...</td></tr>
              ) : currentData.length > 0 ? (
                currentData.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.2s', backgroundColor: selectedCotizacion?.number === c.number ? '#f8fafc' : c.isObserved ? '#fef3c7' : 'white' }}>
                      <td style={{ padding: '12px 8px', fontWeight: 'bold', color: '#3b82f6' }}>{c.number}</td>
                      <td style={{ padding: '12px 8px', color: '#64748b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span>{c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : c.date}</span>
                          <span 
                            title="Editar fecha de importación" 
                            style={{ cursor: 'pointer', fontSize: '1.1rem' }} 
                            onClick={(e) => { e.stopPropagation(); handleEditDate(c.id, c.createdAt || c.date); }}
                          >
                            ✏️
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 8px', color: '#475569' }}>{c.customerName || '-'}</td>
                      <td style={{ padding: '12px 8px', color: '#64748b' }}>{c.customerRuc || '-'}</td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>{getStatusBadge(c.status)}</td>
                      <td style={{ padding: '12px 8px', color: '#64748b' }}>{c.documentRef || '-'}</td>
                      <td style={{ padding: '12px 8px' }}>
                        <button 
                          onClick={() => {
                            if (selectedCotizacion?.number === c.number) {
                              setSelectedCotizacion(null);
                            } else {
                              handleVerDetalle(c.number);
                            }
                          }}
                          style={{ padding: '6px 12px', backgroundColor: selectedCotizacion?.number === c.number ? '#e2e8f0' : '#4f46e5', color: selectedCotizacion?.number === c.number ? '#334155' : 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {selectedCotizacion?.number === c.number ? '❌ Ocultar' : '🔍 Ver Detalle'}
                        </button>
                      </td>
                    </tr>

                    {selectedCotizacion?.number === c.number && (
                      <tr id="detalle-cotizacion" style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <td colSpan="7" style={{ padding: '15px 30px' }}>
                          <div style={{ backgroundColor: 'white', borderRadius: '6px', border: '1px solid #cbd5e1', padding: '20px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                            {selectedCotizacion.loading ? (
                              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Cargando detalles de la cotización...</div>
                            ) : (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                                  <div>
                                    <h3 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.1rem' }}>Detalle: {selectedCotizacion.number}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 40px', fontSize: '0.85rem', color: '#475569' }}>
                                      <div><strong>Cliente:</strong> {selectedCotizacion.customerName || '-'}</div>
                                      <div><strong>Fecha/Hora:</strong> {selectedCotizacion.date} {selectedCotizacion.time}</div>
                                      <div><strong>Dirección:</strong> {selectedCotizacion.address || '-'}</div>
                                      <div><strong>Vendedor:</strong> {selectedCotizacion.sellerName || '-'}</div>
                                      <div style={{ gridColumn: '1 / -1' }}><strong>Observación:</strong> {selectedCotizacion.description || 'N/A'}</div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {selectedCotizacion.status === 'PENDIENTE' && (
                                      <button 
                                        onClick={() => handleUpdateStatus('RESERVADO')}
                                        style={{ padding: '6px 12px', backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        🔒 Reservar
                                      </button>
                                    )}
                                    {selectedCotizacion.status === 'RESERVADO' && (
                                      <button 
                                        onClick={() => handleUpdateStatus('PENDIENTE')}
                                        style={{ padding: '6px 12px', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        🔓 Quitar Reserva
                                      </button>
                                    )}
                                    {selectedCotizacion.status === 'FACTURADO' && (
                                      <button 
                                        disabled
                                        style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'not-allowed', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        ✅ Facturado
                                      </button>
                                    )}
                                    {selectedCotizacion.status === 'TRASLADADO' && (
                                      <button 
                                        disabled
                                        style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'not-allowed', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        📦 Trasladado
                                      </button>
                                    )}
                                    {(selectedCotizacion.status === 'PENDIENTE' || selectedCotizacion.status === 'RESERVADO' || selectedCotizacion.status === 'TRASLADO PARCIAL') && (
                                      <button 
                                        onClick={() => setShowMassiveTransferModal(true)}
                                        style={{ padding: '6px 12px', backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        🚚 Traslado Parcial / Masivo
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => {
                                        const result = generarCotizacionPDF(selectedCotizacion);
                                        if (result) setPdfPreview(result);
                                      }}
                                      style={{ padding: '6px 12px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}>
                                      📄 PDF (Guía)
                                    </button>
                                  </div>
                                </div>

                                <div style={{ marginTop: '15px', marginBottom: '20px', padding: '15px', backgroundColor: selectedCotizacion.isObserved ? '#fffbeb' : '#f8fafc', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: selectedCotizacion.isObserved ? '10px' : '0' }}>
                                    <label style={{ fontWeight: '500', color: '#1e293b' }}>Observación Interna:</label>
                                    <div 
                                      onClick={() => handleUpdateObservation(selectedCotizacion.id, !selectedCotizacion.isObserved, selectedCotizacion.observationText)}
                                      style={{ 
                                        width: '40px', height: '22px', backgroundColor: selectedCotizacion.isObserved ? '#f59e0b' : '#cbd5e1', 
                                        borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: 'background-color 0.2s' 
                                      }}>
                                      <div style={{ 
                                        width: '18px', height: '18px', backgroundColor: 'white', borderRadius: '50%', 
                                        position: 'absolute', top: '2px', left: selectedCotizacion.isObserved ? '20px' : '2px', 
                                        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' 
                                      }} />
                                    </div>
                                  </div>
                                  {selectedCotizacion.isObserved && (
                                    <div>
                                      <textarea
                                        value={selectedCotizacion.observationText || ''}
                                        onChange={(e) => setSelectedCotizacion(prev => ({ ...prev, observationText: e.target.value }))}
                                        onBlur={(e) => handleUpdateObservation(selectedCotizacion.id, true, e.target.value)}
                                        placeholder="Escribe una observación manual aquí... (Ej: Faltan enviar 2 unidades de X producto)"
                                        style={{ width: '100%', minHeight: '60px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', resize: 'vertical', fontSize: '0.9rem' }}
                                      />
                                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '5px' }}>* Se guarda automáticamente al hacer clic fuera del cuadro de texto.</div>
                                    </div>
                                  )}
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                                    <thead>
                                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#334155' }}>
                                        <th style={{ padding: '8px', fontWeight: '600' }}>Sel.</th>
                                        <th style={{ padding: '8px', fontWeight: '600' }}>#</th>
                                        <th style={{ padding: '8px', fontWeight: '600' }}>Producto</th>
                                        <th style={{ padding: '8px', fontWeight: '600', textAlign: 'center' }}>Requerido</th>
                                        <th style={{ padding: '8px', fontWeight: '600', textAlign: 'center' }}>Reserva Global</th>
                                        <th style={{ padding: '8px', fontWeight: '600', textAlign: 'center' }}>Stock Disp.</th>
                                        <th style={{ padding: '8px', fontWeight: '600', textAlign: 'center' }}>Estado</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {selectedCotizacion.items && selectedCotizacion.items.length > 0 ? (
                                        selectedCotizacion.items.map((item, idx) => {
                                          const isSuficiente = item.stockDisponibleParaMi >= item.quantity;
                                          return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', opacity: item.isTransferred ? 0.6 : 1 }}>
                                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                                <input 
                                                  type="checkbox" 
                                                  disabled={item.isTransferred || selectedCotizacion.status === 'FACTURADO' || selectedCotizacion.status === 'TRASLADADO'}
                                                  checked={item.isTransferred || selectedItemsToTransfer.includes(item.id)}
                                                  onChange={(e) => {
                                                    if (e.target.checked) {
                                                      setSelectedItemsToTransfer([...selectedItemsToTransfer, item.id]);
                                                    } else {
                                                      setSelectedItemsToTransfer(selectedItemsToTransfer.filter(id => id !== item.id));
                                                    }
                                                  }}
                                                  style={{ cursor: item.isTransferred ? 'not-allowed' : 'pointer' }}
                                                />
                                              </td>
                                              <td style={{ padding: '8px', color: '#64748b' }}>{idx + 1}</td>
                                              <td style={{ padding: '8px', color: '#1e293b', fontWeight: '500' }}>{item.description || item.productName || item.productId}</td>
                                              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: '#1e293b' }}>{item.quantity}</td>
                                              <td style={{ padding: '8px', textAlign: 'center', color: '#ea580c', fontWeight: 'bold' }}>{item.reservaGlobal || 0}</td>
                                              <td style={{ padding: '8px', textAlign: 'center', color: '#ea580c', fontWeight: 'bold' }}>{item.stockDispGlobal || 0}</td>
                                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                                {item.isTransferred ? (
                                                  <span style={{ color: '#7e22ce', fontWeight: 'bold' }}>📦 Ya trasladado</span>
                                                ) : selectedCotizacion.status === 'TRASLADADO' ? (
                                                  <span style={{ color: '#7e22ce', fontWeight: 'bold' }}>📦 Ya trasladado</span>
                                                ) : selectedCotizacion.status === 'FACTURADO' ? (
                                                  <span style={{ color: '#166534', fontWeight: 'bold' }}>✅ Facturado</span>
                                                ) : selectedCotizacion.status === 'RESERVADO' ? (
                                                  isSuficiente ? (
                                                    <span style={{ color: '#1e40af', fontWeight: 'bold' }}>🔒 Reservado</span>
                                                  ) : (
                                                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>❌ Insuficiente (Reservado)</span>
                                                  )
                                                ) : isSuficiente ? (
                                                  <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✅ Suficiente</span>
                                                ) : (
                                                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>❌ Insuficiente</span>
                                                )}
                                              </td>
                                            </tr>
                                          );
                                        })
                                      ) : (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', padding: '15px', color: '#64748b' }}>No hay productos en esta cotización.</td></tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No se encontraron cotizaciones.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación Estilo Nuevo */}
        {!loading && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', color: '#64748b', fontSize: '0.85rem', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              Mostrando {filteredData.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} a {Math.min(currentPage * itemsPerPage, filteredData.length)} de {filteredData.length} registros
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <select 
                value={itemsPerPage} 
                onChange={(e) => { 
                  const val = Number(e.target.value);
                  setItemsPerPage(val); 
                  localStorage.setItem('cotizacionesItemsPerPage', val);
                  setCurrentPage(1); 
                }}
                style={{ padding: '6px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', color: '#475569' }}
              >
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
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
      </div>


      {/* Modal Nueva Cotización */}
      {showNewCotizacionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>➕ Importar Nueva Cotización</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Número de Cotización:</label>
              <input 
                type="text" 
                placeholder="Ej: 1532 o COT-1532" 
                value={importNumber}
                onChange={(e) => setImportNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleImportCotizacion(); }}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '0.95rem' }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => { setShowNewCotizacionModal(false); setImportNumber(''); }}
                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                disabled={isImporting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleImportCotizacion}
                disabled={isImporting}
                style={{ padding: '8px 16px', backgroundColor: isImporting ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: isImporting ? 'not-allowed' : 'pointer', fontWeight: '500' }}
              >
                {isImporting ? 'Importando...' : 'Importar'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal Traslado Masivo */}
      {showMassiveTransferModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '500px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🚚 Traslado Masivo a Ventas</h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '20px' }}>
              Se trasladarán todos los productos de la cotización <strong>{selectedCotizacion?.number}</strong> desde sus almacenes de origen hacia el almacén seleccionado. Esta acción <strong>no se puede revertir</strong> y la reserva será eliminada (Estado: TRASLADADO).
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Almacén Destino (Ventas):</label>
              <select
                value={transferTargetWarehouse}
                onChange={(e) => setTransferTargetWarehouse(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '0.95rem' }} 
              >
                <option value="">Seleccione el almacén de ventas...</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setShowMassiveTransferModal(false)}
                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                disabled={isTransferring}
              >
                Cancelar
              </button>
              <button 
                onClick={handleMassiveTransfer}
                disabled={isTransferring || !transferTargetWarehouse}
                style={{ padding: '8px 16px', backgroundColor: isTransferring || !transferTargetWarehouse ? '#d8b4fe' : '#9333ea', color: 'white', border: 'none', borderRadius: '4px', cursor: isTransferring || !transferTargetWarehouse ? 'not-allowed' : 'pointer', fontWeight: '500' }}
              >
                {isTransferring ? 'Trasladando...' : 'Confirmar Traslado Masivo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Eliminar Cotización */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, color: '#dc2626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>🗑️ Eliminar Cotización</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Número de Cotización a eliminar:</label>
              <input 
                type="text" 
                placeholder="Ej: 1532, COT-1532 o EXT-0001" 
                value={deleteNumber}
                onChange={(e) => setDeleteNumber(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleDeleteCotizacion(); }}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', fontSize: '0.95rem' }} 
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => { setShowDeleteModal(false); setDeleteNumber(''); }}
                style={{ padding: '8px 16px', backgroundColor: 'white', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteCotizacion}
                disabled={isDeleting}
                style={{ padding: '8px 16px', backgroundColor: isDeleting ? '#fca5a5' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: isDeleting ? 'not-allowed' : 'pointer', fontWeight: '500' }}
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar Definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sistema de Notificaciones Flotantes (Toast) */}
      {notification && (
        <div style={{
          position: 'fixed', bottom: '30px', right: '30px', zIndex: 9999,
          backgroundColor: notification.type === 'error' ? '#ef4444' : notification.type === 'success' ? '#10b981' : '#3b82f6',
          color: 'white', padding: '15px 25px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.95rem', fontWeight: '500',
          animation: 'fadeInUp 0.3s ease-out'
        }}>
          {notification.type === 'error' ? '❌' : notification.type === 'success' ? '✅' : 'ℹ️'}
          {notification.message}
        </div>
      )}

      {/* Modal Vista Previa de PDF */}
      {pdfPreview && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', width: '85%', height: '90%', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>📄 Vista Previa: {pdfPreview.filename}</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = pdfPreview.url;
                    link.download = pdfPreview.filename;
                    link.click();
                  }}
                  style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ⬇️ Descargar PDF
                </button>
                <button 
                  onClick={() => setPdfPreview(null)}
                  style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  ❌ Cerrar
                </button>
              </div>
            </div>
            <iframe 
              src={pdfPreview.url} 
              style={{ flex: 1, border: '1px solid #cbd5e1', borderRadius: '4px', backgroundColor: '#e2e8f0' }} 
              title="PDF Preview"
            />
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <ConfirmModal />
      <ManualQuotationModal 
        isOpen={showManualModal} 
        onClose={() => setShowManualModal(false)} 
        onQuotationCreated={fetchCotizaciones} 
      />
    </div>
  );
}
