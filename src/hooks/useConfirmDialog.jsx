import React, { useState } from 'react';

export const useConfirmDialog = () => {
    const [dialogConfig, setDialogConfig] = useState({
        isOpen: false,
        message: '',
        onConfirm: null
    });

    const confirm = (message) => {
        return new Promise((resolve) => {
            setDialogConfig({
                isOpen: true,
                message,
                onConfirm: (result) => {
                    setDialogConfig(prev => ({ ...prev, isOpen: false }));
                    resolve(result);
                }
            });
        });
    };

    const ConfirmModal = () => {
        if (!dialogConfig.isOpen) return null;

        return (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                    <h3 style={{ marginTop: 0, color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
                        ⚠️ Confirmación
                    </h3>
                    <p style={{ color: '#475569', fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                        {dialogConfig.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button 
                            onClick={() => dialogConfig.onConfirm(false)}
                            style={{ padding: '8px 16px', backgroundColor: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={() => dialogConfig.onConfirm(true)}
                            style={{ padding: '8px 16px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '500', transition: 'background 0.2s' }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#4338ca'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#4f46e5'}
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return { confirm, ConfirmModal };
};
