import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ManualQuotationModal({ isOpen, onClose, onQuotationCreated }) {
    const [customerName, setCustomerName] = useState('');
    const [items, setItems] = useState([{ productId: '', description: '', quantity: 1 }]);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSearchIndex, setActiveSearchIndex] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        try {
            const res = await axios.get((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/products');
            setAvailableProducts(Array.isArray(res.data) ? res.data : (res.data.products || []));
        } catch (error) {
            console.error("Error cargando productos:", error);
        }
    };

    const handleAddItem = () => {
        setItems([...items, { productId: '', description: '', quantity: 1 }]);
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-fill description if product selected
        if (field === 'productId') {
            const prod = availableProducts.find(p => p.internal_id === value);
            if (prod) {
                newItems[index].description = prod.name;
            }
        }

        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        if (!customerName.trim()) {
            alert("El nombre del cliente es obligatorio.");
            return;
        }

        const validItems = items.filter(i => i.productId && i.quantity > 0);
        if (validItems.length === 0) {
            alert("Debes agregar al menos un producto válido.");
            return;
        }

        try {
            setIsSaving(true);
            const res = await axios.post((import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/quotations/manual', {
                customerName: customerName.trim(),
                items: validItems
            });

            if (res.data.success) {
                alert("Cotización manual creada con éxito: " + res.data.quotation.number);
                onQuotationCreated();
                onClose();
            }
        } catch (error) {
            alert("Error creando cotización: " + (error.response?.data?.error || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // Filter products for the datalist / select
    const filteredProducts = availableProducts.filter(p => {
        const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
        if (searchTerms.length === 0) return true;
        
        const textToSearch = `${p.internal_id || ''} ${p.name || ''}`.toLowerCase();
        let matchSearch = searchTerms.every(term => textToSearch.includes(term));
        
        if (matchSearch) {
            const numberTerms = searchTerms.filter(term => /\d/.test(term));
            if (numberTerms.length > 1) {
                let lastIndex = -1;
                for (const numTerm of numberTerms) {
                    const idx = textToSearch.indexOf(numTerm, lastIndex === -1 ? 0 : lastIndex);
                    if (idx === -1) {
                        matchSearch = false;
                        break;
                    }
                    lastIndex = idx + numTerm.length;
                }
            }
        }
        return matchSearch;
    }).slice(0, 100); // Limit to 100 for performance

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '1000px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        📝 Nueva Cotización Extranjero (Manual)
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>✖</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Nombre del Cliente (Ej: EXTRANJERO - ARGENTINA):</label>
                        <input 
                            type="text" 
                            required
                            placeholder="Ingrese nombre del cliente..." 
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }} 
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <h4 style={{ color: '#334155', marginBottom: '10px' }}>Productos:</h4>
                        
                        {items.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                                <div style={{ flex: 3, position: 'relative' }}>
                                    <input 
                                        type="text" 
                                        placeholder="Buscar producto (Código o Nombre)..."
                                        value={item.productId}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value);
                                            setActiveSearchIndex(index);
                                            handleItemChange(index, 'productId', e.target.value);
                                        }}
                                        onFocus={() => {
                                            setSearchTerm(item.productId || '');
                                            setActiveSearchIndex(index);
                                        }}
                                        onBlur={() => setTimeout(() => setActiveSearchIndex(null), 200)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                                    />
                                    {activeSearchIndex === index && searchTerm && (
                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, maxHeight: '250px', overflowY: 'auto', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                                            {filteredProducts.length > 0 ? filteredProducts.map(p => (
                                                <div 
                                                    key={p.internal_id} 
                                                    style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}
                                                    onMouseDown={() => {
                                                        handleItemChange(index, 'productId', p.internal_id);
                                                        handleItemChange(index, 'description', p.name);
                                                        setActiveSearchIndex(null);
                                                    }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                >
                                                    <strong style={{ color: '#3b82f6' }}>{p.internal_id}</strong> - <span style={{ color: '#475569' }}>{p.name}</span>
                                                </div>
                                            )) : (
                                                <div style={{ padding: '10px', fontSize: '0.85rem', color: '#94a3b8' }}>No se encontraron productos...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 5 }}>
                                    <input 
                                        type="text" 
                                        placeholder="Descripción del producto..." 
                                        value={item.description}
                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none', backgroundColor: '#f8fafc' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <input 
                                        type="number" 
                                        min="0.01" 
                                        step="0.01"
                                        placeholder="Cant." 
                                        value={item.quantity}
                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                        style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                                    />
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => handleRemoveItem(index)}
                                    style={{ padding: '8px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}

                        <button 
                            type="button"
                            onClick={handleAddItem}
                            style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#4f46e5', border: '1px dashed #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', marginTop: '10px' }}
                        >
                            ➕ Añadir Producto
                        </button>
                    </div>



                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '30px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500' }}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            style={{ padding: '10px 20px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: '500' }}
                        >
                            {isSaving ? 'Guardando...' : 'Guardar Cotización'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
