import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function RevisarCotizacion() {
  const [searchNumber, setSearchNumber] = useState(() => sessionStorage.getItem('revisar_searchNumber') || '');
  const [currentQuote, setCurrentQuote] = useState(() => {
    const saved = sessionStorage.getItem('revisar_currentQuote');
    return saved ? JSON.parse(saved) : null;
  });
  const [loadingQuote, setLoadingQuote] = useState(false);
  
  const [customerHistory, setCustomerHistory] = useState(() => {
    const saved = sessionStorage.getItem('revisar_customerHistory');
    return saved ? JSON.parse(saved) : [];
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [importingHistory, setImportingHistory] = useState(false);
  const [importProgress, setImportProgress] = useState(null);
  
  // Estado para colapsar/expandir historiales
  const [expandedItems, setExpandedItems] = useState(() => {
    const saved = sessionStorage.getItem('revisar_expandedItems');
    return saved ? JSON.parse(saved) : {};
  });

  // Persistir estados en sessionStorage
  useEffect(() => {
    sessionStorage.setItem('revisar_searchNumber', searchNumber);
  }, [searchNumber]);

  useEffect(() => {
    if (currentQuote) {
      sessionStorage.setItem('revisar_currentQuote', JSON.stringify(currentQuote));
    } else {
      sessionStorage.removeItem('revisar_currentQuote');
    }
  }, [currentQuote]);

  useEffect(() => {
    sessionStorage.setItem('revisar_customerHistory', JSON.stringify(customerHistory));
  }, [customerHistory]);

  useEffect(() => {
    sessionStorage.setItem('revisar_expandedItems', JSON.stringify(expandedItems));
  }, [expandedItems]);

  const handleSearchQuote = async (numberToSearch = searchNumber) => {
    if (!numberToSearch.trim()) return;
    
    // Normalizar a formato BD (ej. COT-1391)
    let dbNumber = numberToSearch.trim().toUpperCase();
    if (!dbNumber.startsWith('COT-')) {
      dbNumber = `COT-${dbNumber}`;
    }

    try {
      setLoadingQuote(true);
      setCurrentQuote(null);
      setCustomerHistory([]); // Reset history when new quote loads
      
      const res = await axios.get(`http://localhost:3000/api/quotations/${dbNumber}`);
      const quoteData = res.data;
      setCurrentQuote(quoteData);

      // Si encuentra la cotización, carga el historial del cliente (si existe en BD local)
      if (quoteData.customerName || quoteData.customerRuc) {
        fetchCustomerHistory(quoteData.customerName, quoteData.customerRuc);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // La cotización no existe en la BD local. Preguntar si desea descargarla.
        if (window.confirm(`La cotización ${dbNumber} no existe en tu base de datos local.\n\n¿Deseas descargarla e importarla automáticamente desde Volper?`)) {
          await importMissingQuote(dbNumber);
        }
      } else {
        alert("Error al buscar cotización: " + (error.response?.data?.error || error.message));
      }
    } finally {
      setLoadingQuote(false);
    }
  };

  const importMissingQuote = async (number) => {
    try {
      // El script de Python/Node necesita solo el número para la URL (ej. 1391)
      const rawNumber = number.replace(/\D/g, '');

      setLoadingQuote(true);
      await axios.post('http://localhost:3000/api/add-quotation', { quotationNumber: rawNumber });
      
      // Una vez importada correctamente, la volvemos a buscar en formato BD
      await handleSearchQuote(`COT-${rawNumber}`);
    } catch (error) {
      alert("Error importando la cotización desde la nube: " + (error.response?.data?.error || error.message));
    }
  };

  // Cargar historial del JSON local
  const fetchCustomerHistory = async (name, ruc) => {
    try {
      setLoadingHistory(true);
      const res = await axios.get('http://localhost:3000/api/customer-quotations');
      const allHistory = res.data;

      // Filtrar historial exacto por este cliente (usando RUC o nombre)
      const filtered = allHistory.filter(item => 
        (ruc && item.customer_number === ruc) || 
        (name && item.customer_name?.toLowerCase() === name.toLowerCase())
      );

      setCustomerHistory(filtered);
    } catch (error) {
      console.error("Error cargando historial de cliente:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    let interval;
    if (importingHistory) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get('http://localhost:3000/api/import-customer-progress');
          const prog = res.data;
          setImportProgress(prog);

          if (prog.status === 'done' || prog.status === 'error') {
            setImportingHistory(false);
            clearInterval(interval);
            if (prog.status === 'done') {
              alert(prog.message || "Historial actualizado.");
              if (currentQuote) {
                fetchCustomerHistory(currentQuote.customerName, currentQuote.customerRuc);
              }
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
  }, [importingHistory, currentQuote]);

  // Importar / Scrapear historial completo de este cliente
  const handleImportHistory = async () => {
    if (!currentQuote) return;
    const query = currentQuote.customerRuc || currentQuote.customerName;
    if (!query) {
      alert("La cotización actual no tiene cliente válido para buscar historial.");
      return;
    }

    try {
      setImportingHistory(true);
      setImportProgress({ message: "Iniciando sincronización..." });
      await axios.post('http://localhost:3000/api/import-customer-quotations', { query });
    } catch (error) {
      alert("Error importando historial: " + (error.response?.data?.error || error.message));
      setImportingHistory(false);
    }
  };

  // Filtrar historial para un producto específico
  const getProductHistory = (productDesc, productId) => {
    if (!customerHistory || customerHistory.length === 0) return [];
    
    // Primero intentamos buscar por ID interno si existe en ambos lados
    // A veces en la cotización actual productId es solo "23", pero en history internal_id es "23-000100"
    // Así que usamos la descripción como base más confiable si no coinciden exactamente los IDs.
    
    return customerHistory.filter(h => {
      // Evitar incluir la cotización actual como "historial"
      if (h.number_full === currentQuote.number) return false;

      const descMatch = h.item_description?.toLowerCase().trim() === productDesc?.toLowerCase().trim();
      const idMatch = (h.internal_id && productId) ? h.internal_id.includes(productId) : false;
      
      return descMatch || idMatch;
    }).sort((a, b) => new Date(b.date_of_issue) - new Date(a.date_of_issue)); // Más recientes primero
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Panel Superior: Búsqueda */}
      <div className="premium-card" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1', minWidth: '300px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1e293b' }}>
            🔍 Revisar Cotización N°
          </label>
          <input 
            type="text" 
            placeholder="Ej: COT-1532 o 1532" 
            value={searchNumber}
            onChange={(e) => setSearchNumber(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchQuote(); }}
            style={{ width: '100%', padding: '10px 15px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '1rem', outline: 'none' }}
          />
        </div>
        <button 
          onClick={() => handleSearchQuote()}
          disabled={loadingQuote}
          style={{ padding: '10px 20px', backgroundColor: loadingQuote ? '#93c5fd' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loadingQuote ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '1rem' }}
        >
          {loadingQuote ? 'Procesando...' : 'Cargar Cotización'}
        </button>
      </div>

      {/* Panel Principal: Resultado */}
      {currentQuote && (
        <div className="premium-card" style={{ border: '1px solid #e2e8f0' }}>
          {/* Cabecera de la cotización actual */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div>
              <h2 style={{ color: '#1e293b', fontSize: '1.4rem', margin: '0 0 10px 0' }}>{currentQuote.number}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '8px 40px', fontSize: '0.9rem', color: '#475569' }}>
                <div><strong>Cliente:</strong> {currentQuote.customerName || '-'}</div>
                <div><strong>RUC:</strong> {currentQuote.customerRuc || '-'}</div>
                <div><strong>Fecha:</strong> {currentQuote.date}</div>
                <div><strong>Vendedor:</strong> {currentQuote.sellerName || '-'}</div>
                <div><strong>Estado Actual:</strong> 
                  <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: currentQuote.status === 'FACTURADO' ? '#dcfce7' : currentQuote.status === 'RESERVADO' ? '#dbeafe' : '#fef3c7', color: currentQuote.status === 'FACTURADO' ? '#166534' : currentQuote.status === 'RESERVADO' ? '#1e40af' : '#92400e' }}>
                    {currentQuote.status}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Botón para actualizar historial */}
            <div style={{ padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#64748b' }}>
                Total registros históricos locales: <strong>{customerHistory.length}</strong>
              </p>
              <button 
                onClick={handleImportHistory}
                disabled={importingHistory}
                style={{ padding: '8px 16px', backgroundColor: importingHistory ? '#cbd5e1' : '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: importingHistory ? 'not-allowed' : 'pointer', fontWeight: '500', fontSize: '0.85rem' }}
              >
                {importingHistory ? '🔄 Sincronizando en backend...' : '📥 Extraer / Actualizar Historial'}
              </button>
              {importingHistory && importProgress && (
                <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#10b981', fontWeight: '500' }}>
                  {importProgress.message}
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Productos con Comparativa Histórica */}
          <h3 style={{ color: '#334155', fontSize: '1.1rem', marginBottom: '15px' }}>Productos Solicitados y Comparativa</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {currentQuote.items && currentQuote.items.length > 0 ? (
              currentQuote.items.map((item, idx) => {
                const productDesc = item.description || item.productName;
                const historyList = getProductHistory(productDesc, item.productId);
                
                // Extraer los precios actuales si existen en el historial importado
                const currentPrices = customerHistory.find(h => h.number_full === currentQuote.number && (h.item_description?.toLowerCase().trim() === productDesc?.toLowerCase().trim() || (h.internal_id && item.productId && h.internal_id.includes(item.productId))));
                
                const isExpanded = !!expandedItems[idx];

                return (
                  <div key={idx} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* Fila del Producto Actual */}
                    <div style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: (isExpanded && historyList.length > 0) ? '1px solid #e2e8f0' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', minWidth: '300px' }}>
                        <span style={{ backgroundColor: '#3b82f6', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontSize: '0.85rem', fontWeight: 'bold' }}>{idx + 1}</span>
                        <div>
                          <strong style={{ color: '#1e293b', fontSize: '1rem', display: 'block', marginBottom: '4px' }}>{productDesc}</strong>
                          <div style={{ display: 'flex', gap: '15px', fontSize: '0.85rem', color: '#64748b' }}>
                            <span>Cant. Solicitada: <strong style={{ color: '#0f172a' }}>{item.quantity}</strong></span>
                            <span>Stock Disp: <strong style={{ color: '#0f172a' }}>{item.stockDispGlobal || 0}</strong></span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '25px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Precios actuales de la cotización */}
                        <div style={{ display: 'flex', gap: '15px', backgroundColor: '#f8fafc', padding: '8px 15px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>P. Sistema</span>
                            <strong style={{ color: '#475569', fontSize: '0.9rem' }}>{currentPrices ? `S/ ${currentPrices.sale_unit_price.toFixed(2)}` : '-'}</strong>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>P. Venta</span>
                            <strong style={{ color: '#16a34a', fontSize: '0.9rem' }}>{currentPrices ? `S/ ${currentPrices.unit_price.toFixed(2)}` : '-'}</strong>
                          </div>
                          <div style={{ textAlign: 'center', borderLeft: '1px solid #cbd5e1', paddingLeft: '15px' }}>
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Total</span>
                            <strong style={{ color: '#1e40af', fontSize: '0.9rem' }}>{currentPrices ? `S/ ${currentPrices.total.toFixed(2)}` : '-'}</strong>
                          </div>
                        </div>

                        {/* Botón de desglosar historial */}
                        <button 
                          onClick={() => setExpandedItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                          style={{ padding: '8px 16px', backgroundColor: isExpanded ? '#f1f5f9' : '#e0e7ff', color: isExpanded ? '#475569' : '#4338ca', border: isExpanded ? '1px solid #cbd5e1' : '1px solid #c7d2fe', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
                        >
                          {isExpanded ? '⬆️ Ocultar Historial' : `⬇️ Ver Historial (${historyList.length})`}
                        </button>
                      </div>
                    </div>

                    {/* Fila del Historial de este producto (Colapsable) */}
                    {isExpanded && (
                      historyList.length > 0 ? (
                      <div style={{ padding: '0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ backgroundColor: '#ffffff', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                              <th style={{ padding: '8px 20px', textAlign: 'left', width: '40px' }}></th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b' }}>Fecha</th>
                              <th style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b' }}>Cotización Ant.</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>Cant. Comprada</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>P. Sistema</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>P. Venta</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b' }}>Total</th>
                              <th style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>Estado</th>
                              <th style={{ padding: '8px 20px', textAlign: 'left', color: '#64748b' }}>Doc. Facturado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyList.map((h, i) => (
                              <tr key={i} style={{ borderBottom: '1px solid #f8fafc', backgroundColor: h.is_billed ? '#f8fafc' : '#ffffff' }}>
                                <td style={{ padding: '8px 20px', textAlign: 'center', color: '#cbd5e1' }}>🕒</td>
                                <td style={{ padding: '8px 10px', color: '#475569' }}>{h.date_of_issue}</td>
                                <td style={{ padding: '8px 10px', color: '#3b82f6', fontWeight: '500' }}>{h.number_full}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 'bold', color: '#334155' }}>{h.quantity}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', fontWeight: '500' }}>S/ {h.sale_unit_price ? h.sale_unit_price.toFixed(2) : '0.00'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: '600' }}>S/ {h.unit_price ? h.unit_price.toFixed(2) : '0.00'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'right', color: '#1e40af', fontWeight: '500' }}>S/ {h.total ? h.total.toFixed(2) : '0.00'}</td>
                                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                                  {h.is_billed ? (
                                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>Facturado</span>
                                  ) : (
                                    <span style={{ color: '#92400e' }}>Pendiente</span>
                                  )}
                                </td>
                                <td style={{ padding: '8px 20px', color: '#64748b' }}>{h.document_ref || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      ) : (
                        <div style={{ padding: '15px 20px', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', backgroundColor: '#f8fafc' }}>
                          No hay historial de ventas previo para este producto con este cliente.
                        </div>
                      )
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                Esta cotización no tiene productos registrados.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
