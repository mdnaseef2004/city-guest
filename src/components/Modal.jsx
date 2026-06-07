import React from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, onConfirm, confirmText = 'Confirm', confirmVariant = 'primary', loading = false }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {onConfirm && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button className={`btn btn-${confirmVariant}`} onClick={onConfirm} disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : confirmText}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
