const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/pages/Cotizaciones.jsx');
let code = fs.readFileSync(file, 'utf8');

// Replacement 1: State variables
code = code.replace(
`  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNumber, setDeleteNumber] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [pdfPreview, setPdfPreview] = useState(null);`,
`  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteNumber, setDeleteNumber] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Traslado Masivo
  const [showMassiveTransferModal, setShowMassiveTransferModal] = useState(false);
  const [transferTargetWarehouse, setTransferTargetWarehouse] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [warehouses, setWarehouses] = useState([]);

  const [pdfPreview, setPdfPreview] = useState(null);`);

// Replacement 2: fetchWarehouses
code = code.replace(
`  useEffect(() => {
    fetchCotizaciones();
  }, []);`,
`  useEffect(() => {
    fetchCotizaciones();
    fetchWarehouses();
  }, []);`);

code = code.replace(
`  const fetchCotizaciones = async () => {`,
`  const fetchWarehouses = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/warehouses');
      setWarehouses(res.data);
    } catch (error) {
      console.error("Error cargando almacenes:", error);
    }
  };

  const handleMassiveTransfer = async () => {
    if (!selectedCotizacion) return;
    setIsTransferring(true);
    try {
      const res = await axios.post(\`http://localhost:3000/api/quotations/\${selectedCotizacion.id}/transfer-all\`, {
        target_warehouse_id: transferTargetWarehouse
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

  const fetchCotizaciones = async () => {`);

// Replacement 3: Buttons
code = code.replace(
`                                    {selectedCotizacion.status === 'FACTURADO' && (
                                      <button 
                                        disabled
                                        style={{ padding: '6px 12px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'not-allowed', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        ✅ Facturado
                                      </button>
                                    )}`,
`                                    {selectedCotizacion.status === 'FACTURADO' && (
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
                                    {(selectedCotizacion.status === 'PENDIENTE' || selectedCotizacion.status === 'RESERVADO') && (
                                      <button 
                                        onClick={() => setShowMassiveTransferModal(true)}
                                        style={{ padding: '6px 12px', backgroundColor: '#f3e8ff', color: '#7e22ce', border: '1px solid #d8b4fe', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem' }}
                                      >
                                        🚚 Traslado Masivo
                                      </button>
                                    )}`);

// Replacement 4: Modal
const modalJSX = `
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
`;

code = code.replace(`      {/* Modal Eliminar Cotización */}`, modalJSX + `\n      {/* Modal Eliminar Cotización */}`);

fs.writeFileSync(file, code);
console.log("Patched successfully");
