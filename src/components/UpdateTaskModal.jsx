/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { gasApi } from '../services/api';

const UpdateTaskModal = ({ isOpen, onClose, taskConfig, currentUser, onSuccess }) => {
  const [statusVal, setStatusVal] = useState('');
  const [remark, setRemark] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });

  // Pre-fill the dropdown with the current status when the modal opens
  useEffect(() => {
    if (taskConfig?.currentStatus) {
      setStatusVal(taskConfig.currentStatus);
    }
    setRemark(''); // Clear previous remarks on new open
    setStatus({ loading: false, error: null });
  }, [taskConfig, isOpen]);

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
    setStatus({ loading: true, error: null });

    const payload = {
      childId: taskConfig?.childId || '',
      parentId: taskConfig?.parentId || '',
      status: statusVal,
      remark: remark,
      actorEmail: currentUser?.email || '',
      userRole: currentUser?.role || ''
    };

    try {
      const response = await gasApi('updateChildTicket', payload);
      
      if (response?.success) {
        onSuccess(); // Triggers Dashboard to pull fresh data
        onClose();   // Hides the modal
      } else {
        setStatus({ loading: false, error: response?.message || 'Error occurred.' });
      }
    } catch {
      setStatus({ loading: false, error: "Network communication failure." });
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Update Task Workflow</h2>
          <button className="close-btn" aria-label="Close modal" onClick={onClose} disabled={status.loading}>&times;</button>
        </div>

        {status.error && <div className="error-banner" style={{ margin: '20px 20px 0 20px' }}>{status.error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Task Status</label>
            <select 
              value={statusVal} 
              onChange={(e) => setStatusVal(e.target.value)} 
              required
              disabled={status.loading}
            >
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting for Parts">Waiting for Parts</option>
              <option value="Closed">Closed</option>
            </select>
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label>Work Log / Remarks</label>
            <textarea 
              rows="4" 
              value={remark} 
              onChange={(e) => setRemark(e.target.value)} 
              placeholder="Log your updates, repairs, or part requests here..."
              disabled={status.loading}
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={status.loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={status.loading}>
              {status.loading ? 'Synchronizing...' : 'Save Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateTaskModal;