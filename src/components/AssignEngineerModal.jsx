/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assignTicket, promoteTicket, fetchEngineers } from '../services/apiClient';

const AssignEngineerModal = ({ isOpen, onClose, assignConfig, bundle, currentUser, onSuccess, tickets = [], systemUsers = [] }) => {
  const [engineerData, setEngineerData] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });
  const [engineersList, setEngineersList] = useState([]);

  useEffect(() => {
    const loadEngineers = async () => {
      try {
        const response = await fetchEngineers();
        if (response?.success && Array.isArray(response.data)) {
          setEngineersList(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch engineers list:", err);
      }
    };
    loadEngineers();
  }, []);

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

    // Support both promoteTicket payload and standard assignTicket depending on context
    if (assignConfig?.isPromotion) {
      try {
        const response = await promoteTicket({
          Intake_ID: assignConfig.Intake_ID || assignConfig.parentId,
          Assigned_Engineer: engName,
          Service_Type: assignConfig.Service_Type || "Standard"
        });

        if (response?.success) {
          onSuccess();
          onClose();
        } else {
          setStatus({ loading: false, error: response?.message || 'Error occurred.' });
        }
      } catch {
        setStatus({ loading: false, error: "Network communication failure during promotion." });
      }
    } else {
      const selectedTicketId = assignConfig?.parentId || '';
      const selectedEngineerName = engName;
      const engineers = bundle?.engineers || engineersList || [];

      // 1. Cross-reference the selected ticket for hardware/issue details
      const assignedTicket = tickets.find(t => t.Ticket_ID === selectedTicketId);

      // 2. Look up the engineer in the systemUsers state array (with fallback to engineers/engineersList)
      const lookupList = (systemUsers && systemUsers.length) ? systemUsers : engineers;
      const matchedUser = lookupList?.find(u => 
        u.Name?.trim().toLowerCase() === selectedEngineerName?.trim().toLowerCase() ||
        u.Username?.trim().toLowerCase() === selectedEngineerName?.trim().toLowerCase() ||
        u.name?.trim().toLowerCase() === selectedEngineerName?.trim().toLowerCase() ||
        u.email?.trim().toLowerCase() === engEmail?.trim().toLowerCase() ||
        u.Email?.trim().toLowerCase() === engEmail?.trim().toLowerCase()
      );

      const userRole = matchedUser?.Role || matchedUser?.role || (selectedEngineerName.toLowerCase().includes('resident') ? 'Resident' : 'Field');

      // 3. Construct the enriched payload for the backend
      const assignmentPayload = {
        ticketId: selectedTicketId,
        assignedTo: selectedEngineerName,
        assignedBy: currentUser?.name || 'SYSTEM', 
        dateAssigned: new Date().toISOString(),
        // --- NEW AUTO-FILLED DATA ---
        category: assignedTicket?.Category || 'Uncategorized',
        issue: assignedTicket?.Issue_Type || 'Unknown',
        engineerRole: userRole
      };

      const payload = {
        ...assignmentPayload,
        parentId: selectedTicketId,
        engEmail,
        engName: selectedEngineerName,
        engRole: userRole,
        actorEmail: currentUser?.email || '',
        instructions
      };

      try {
        const response = await assignTicket(payload);

        if (response?.success) {
          onSuccess(); // Pull fresh dashboard data
          onClose();   // Close the modal
        } else {
          setStatus({ loading: false, error: response?.message || 'Error occurred.' });
        }
      } catch {
        setStatus({ loading: false, error: "Network communication failure." });
      }
    }
  };

  const engineersArray = Array.isArray(engineersList) ? engineersList : [];

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

          {!assignConfig?.isPromotion && (
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
          )}

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