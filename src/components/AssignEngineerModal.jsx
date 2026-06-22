/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { gasApi } from '../services/apiClient';

const AssignEngineerModal = ({ isOpen, onClose, assignConfig, bundle, currentUser, onSuccess }) => {
  const [engineerData, setEngineerData] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });

  // Reset form fields whenever the modal is opened
  useEffect(() => {
    setEngineerData('');
    setInstructions('');
    setStatus({ loading: false, error: null });
  }, [isOpen]);

  // Escape key closure & basic focus trap support
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
    
    if (!engineerData) {
      setStatus({ loading: false, error: "Please select an engineer to assign." });
      return;
    }

    setStatus({ loading: true, error: null });

    // Parse the compound dropdown value
    const parts = engineerData.split('|');
    const engEmail = parts[0] || '';
    const engName = parts[1] || '';
    const engRole = parts[2] || '';

    const payload = {
      parentId: assignConfig?.parentId || '',
      engEmail,
      engName,
      engRole,
      actorEmail: currentUser?.email || '',
      instructions
    };

    try {
      const response = await gasApi('assignTicket', payload);
      
      if (response?.success) {
        onSuccess(); // Pull fresh dashboard data
        onClose();   // Close the modal
      } else {
        setStatus({ loading: false, error: response?.message || 'Error occurred.' });
      }
    } catch {
      setStatus({ loading: false, error: "Network communication failure." });
    }
  };

  const engineersArray = Array.isArray(bundle?.engineers) ? bundle.engineers : [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>Assign Field Engineer</h2>
          <button className="close-btn" aria-label="Close modal" onClick={onClose} disabled={status.loading}>&times;</button>
        </div>

        {status.error && <div className="error-banner" style={{ margin: '20px 20px 0 20px' }}>{status.error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Target Ticket Reference</label>
            <input 
              type="text" 
              value={assignConfig?.parentId || ''} 
              disabled 
              style={{ background: 'rgba(255, 255, 255, 0.4)', color: 'var(--slate-gray)', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label>Select Technical Resource *</label>
            <select 
              value={engineerData} 
              onChange={(e) => setEngineerData(e.target.value)} 
              required
              disabled={status.loading}
            >
              <option value="">Choose Engineer...</option>
              {engineersArray.map((eng, idx) => {
                if (!eng) return null;
                const engEmail = eng.Email || eng.email || '';
                const engName = eng.Name || eng.name || '';
                const engRole = eng.Role || eng.role || '';
                return (
                  <option key={idx} value={`${engEmail}|${engName}|${engRole}`}>
                    {engName} ({engRole})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label>Deployment Instructions</label>
            <textarea 
              rows="3" 
              value={instructions} 
              onChange={(e) => setInstructions(e.target.value)} 
              placeholder="Provide specific notes or tasks for this dispatch..."
              disabled={status.loading}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={status.loading}>Cancel</button>
            <button type="submit" className="btn btn-assign" disabled={status.loading}>
              {status.loading ? 'Deploying...' : 'Assign Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignEngineerModal;