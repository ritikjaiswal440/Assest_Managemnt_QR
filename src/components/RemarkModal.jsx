/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { gasApi } from '../services/apiClient';

const RemarkModal = ({ isOpen, onClose, parentId, currentUser, onSuccess }) => {
  const [remark, setRemark] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });

  useEffect(() => {
    if (isOpen) {
      setRemark('');
      setStatus({ loading: false, error: null });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remark.trim()) {
      setStatus({ loading: false, error: "Remark content cannot be empty." });
      return;
    }
    setStatus({ loading: true, error: null });

    const userCompany = currentUser?.companyName || currentUser?.company || "";
    const isInternal = userCompany.toLowerCase().includes('av dynamic');
    
    let roleDisplay = currentUser?.role || 'User';
    if (currentUser?.role === 'Admin') {
      roleDisplay = isInternal ? 'Internal Admin' : 'Client Admin';
    } else if (currentUser?.role === 'Client') {
      roleDisplay = 'Client User';
    } else {
      roleDisplay = isInternal ? `Internal ${currentUser?.role}` : `Client ${currentUser?.role}`;
    }

    const payload = {
      parentId: parentId || '',
      remark: remark.trim(),
      role: roleDisplay,
      name: currentUser?.name || '',
      userRole: currentUser?.role || '',
      actorEmail: currentUser?.email || ''
    };

    try {
      const response = await gasApi('addParentRemark', payload);
      if (response?.success) {
        onSuccess();
      } else {
        setStatus({ loading: false, error: response?.message || 'Failed to save remark.' });
      }
    } catch {
      setStatus({ loading: false, error: "Network communication failure." });
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Add Administrative Remark</h2>
          <button className="close-btn" aria-label="Close modal" onClick={onClose} disabled={status.loading}>&times;</button>
        </div>

        {status.error && <div className="error-banner" style={{ margin: '20px' }}>{status.error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--slate-gray)', marginBottom: '15px' }}>
              Appending administrative remark to ticket: <strong style={{ color: 'var(--primary-action)' }}>{parentId}</strong>
            </p>
            <label htmlFor="remarkText">Administrative Remark</label>
            <textarea
              id="remarkText"
              rows="5"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Type administrative remark to append to this ticket's log history..."
              required
              disabled={status.loading}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={status.loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={status.loading}>
              {status.loading ? 'Saving...' : 'Save Remark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RemarkModal;
