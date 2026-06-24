/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { resolveTicket, resolveTask } from '../services/apiClient';

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

    try {
      let response;
      if (taskConfig?.Task_ID || taskConfig?.childId) {
        // Engineer Task / Legacy Child Workflow
        const payload = {
          Task_ID: taskConfig.Task_ID || taskConfig.childId,
          Ticket_ID_Ref: taskConfig.Ticket_ID || taskConfig.Ticket_ID_Ref || taskConfig.parentId || '',
          Status: statusVal,
          Engineer_Email: currentUser?.email || '',
          Remarks: remark
        };
        response = await resolveTask(payload);
      } else if (taskConfig?.Ticket_ID) {
        // Master Ticket Workflow
        const payload = {
          Ticket_ID: taskConfig.Ticket_ID,
          Status: statusVal,
          Remarks: remark,
          actorEmail: currentUser?.email || ''
        };
        response = await resolveTicket(payload);
      } else {
        throw new Error("Invalid Task Configuration: Missing ID reference.");
      }

      if (response?.success) {
        onSuccess(
          statusVal, 
          remark, 
          taskConfig?.Task_ID || taskConfig?.childId, 
          taskConfig?.Ticket_ID || taskConfig?.Ticket_ID_Ref || taskConfig?.parentId
        );
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
              <option value="Pending Parts">Pending Parts</option>
              <option value="Resolved">Resolved</option>
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