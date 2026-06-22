import { useState, useEffect } from 'react';
import { getComplaints, pushToIntakeQueue } from '../services/assetApi';
import './ReportingDashboard.css'; // Inherit base table styles
import './ComplaintLogsDashboard.css'; // Modal and specific styles

export default function ComplaintLogsDashboard() {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getComplaints();
        if (isMounted) {
          if (response && response.success && Array.isArray(response.data)) {
            setComplaints(response.data);
          } else {
            setComplaints(Array.isArray(response.data) ? response.data : (Array.isArray(response) ? response : []));
          }
        }
      } catch (err) {
        console.error("Failed to fetch complaint logs:", err);
        if (isMounted) {
          setError(err.message || "Failed to load complaint logs. Please check your connection.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handlers for Master-Detail
  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
  };

  const handlePushToQueue = async () => {
    if (!selectedTicket) return;
    const confirmPush = window.confirm(`Are you sure you want to push Complaint ${selectedTicket.Complaint_ID} to the Intake Queue?`);
    if (!confirmPush) return;

    try {
      setIsPushing(true);
      setError(null);
      const res = await pushToIntakeQueue(selectedTicket);
      if (res && res.success) {
        // Update local state dynamically so Admin sees it immediately
        setComplaints(prev => prev.map(c => 
          c.Complaint_ID === selectedTicket.Complaint_ID 
            ? { ...c, Status: 'Transferred to Intake' }
            : c
        ));
        closeModal();
      } else {
        throw new Error(res.message || 'Push failed');
      }
    } catch(err) {
      console.error(err);
      setError(err.message || "Failed to push ticket to intake queue.");
    } finally {
      setIsPushing(false);
    }
  };


  // Search Filter Math
  const filteredComplaints = complaints.filter(c => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    
    const matchId = (c.Complaint_ID || '').toLowerCase().includes(lowerQuery);
    const matchAssetId = (c.Unique_Product_Id || '').toLowerCase().includes(lowerQuery);
    const matchCompany = (c.Company_Name || '').toLowerCase().includes(lowerQuery);
    const matchSerial = (c.SerialNumber || '').toLowerCase().includes(lowerQuery);
    const matchRequestedBy = (c.Requested_By || '').toLowerCase().includes(lowerQuery);
    
    return matchId || matchAssetId || matchCompany || matchSerial || matchRequestedBy;
  });

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'open') return 'pill-open';
    if (s === 'resolved' || s === 'closed') return 'pill-resolved';
    if (s === 'in progress' || s === 'pending') return 'pill-pending';
    return 'pill-default';
  };

  return (
    <section className="complaint-dashboard-wrapper table-card">
      <div className="table-actions-info">
        <div className="info-bar">
          <span>🔄 <strong>Live System Sync:</strong> Displaying real-time ticket logs directly from the backend database.</span>
        </div>
      </div>
      
      <div className="filter-controls md3-surface" style={{ marginBottom: '20px' }}>
        <div className="filter-group" style={{ width: '100%', maxWidth: '400px' }}>
          <label>Search Tickets</label>
          <input 
            type="text" 
            className="md3-input" 
            placeholder="Search by Complaint ID, Asset ID, Company, Serial, or Requester..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-responsive">
        <table className="material-table">
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Company</th>
              <th>Asset Ref</th>
              <th>Status</th>
              <th>Raised By</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                  Loading live ticket data...
                </td>
              </tr>
            ) : filteredComplaints.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '24px' }}>
                  No complaints found.
                </td>
              </tr>
            ) : (
              filteredComplaints.map((complaint, index) => (
                <tr key={complaint.Complaint_ID || index}>
                  <td className="bold-cell">{complaint.Complaint_ID}</td>
                  <td>{complaint.Company_Name}</td>
                  <td>{complaint.Unique_Product_Id}</td>
                  <td>
                    <span className={getStatusBadgeClass(complaint.Status)}>
                      {complaint.Status || 'Open'}
                    </span>
                  </td>
                  <td>{complaint.Requested_By}</td>
                  <td>
                    {complaint.Created_At 
                      ? new Date(complaint.Created_At).toLocaleDateString() 
                      : 'N/A'}
                  </td>
                  <td>
                    <button 
                      className="btn-view-details" 
                      onClick={() => handleViewTicket(complaint)}
                      title="View full 28-column profile"
                    >
                      👁️ View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* DETAIL MODAL */}
      {isModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🎟️ Ticket: {selectedTicket.Complaint_ID}</h2>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {selectedTicket.Status !== 'Transferred to Intake' && selectedTicket.Status !== 'Promoted' && (
                  <button 
                    onClick={handlePushToQueue} 
                    disabled={isPushing}
                    style={{ background: '#1a73e8', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    {isPushing ? 'Pushing...' : '📥 Push to Intake Queue'}
                  </button>
                )}
                <button className="close-btn" onClick={closeModal}>&times;</button>
              </div>
            </div>
            
            <div className="modal-body">
              
              <div className="detail-grid-section">
                <h3>System & Meta</h3>
                <div className="grid-content col-4">
                  <div className="data-pair">
                    <span className="data-label">Ticket Status</span>
                    <span className="data-value">
                      <span className={getStatusBadgeClass(selectedTicket.Status)}>
                        {selectedTicket.Status || 'Open'}
                      </span>
                    </span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Sync Status</span>
                    <span className="data-value">{selectedTicket.Sync_Status || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Created At</span>
                    <span className="data-value">
                      {selectedTicket.Created_At 
                        ? new Date(selectedTicket.Created_At).toLocaleString() 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Assigned Engineer</span>
                    <span className="data-value">{selectedTicket.Assigned_Engineer || 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid-section">
                <h3>Client Identity</h3>
                <div className="grid-content">
                  <div className="data-pair">
                    <span className="data-label">Company Name</span>
                    <span className="data-value">{selectedTicket.Company_Name} ({selectedTicket.Ref_Code})</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Requested By</span>
                    <span className="data-value">{selectedTicket.Requested_By}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Client Email</span>
                    <span className="data-value">{selectedTicket.Client_Email || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Phone Number</span>
                    <span className="data-value">{selectedTicket.PhoneNumber || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid-section">
                <h3>Precise Location</h3>
                <div className="grid-content col-4">
                  <div className="data-pair">
                    <span className="data-label">Location</span>
                    <span className="data-value">{selectedTicket.Location || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Sub-Location</span>
                    <span className="data-value">{selectedTicket.Sub_Location || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Floor</span>
                    <span className="data-value">{selectedTicket.Floor || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Room</span>
                    <span className="data-value">{selectedTicket.Room_Type} / {selectedTicket.Room_Name}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid-section">
                <h3>Hardware Profile</h3>
                <div className="grid-content">
                  <div className="data-pair">
                    <span className="data-label">Asset ID</span>
                    <span className="data-value">{selectedTicket.Unique_Product_Id}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Make & Model</span>
                    <span className="data-value">{selectedTicket.ProductMake} {selectedTicket.ProductModel}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Serial Number</span>
                    <span className="data-value">{selectedTicket.SerialNumber || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Asset Status</span>
                    <span className="data-value">{selectedTicket.Asset_Status || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid-section">
                <h3>Contract & Coverage</h3>
                <div className="grid-content col-4">
                  <div className="data-pair">
                    <span className="data-label">Support Tier</span>
                    <span className="data-value">{selectedTicket.Support_Type || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Warranty Range</span>
                    <span className="data-value">
                      {selectedTicket.Warranty_Start_Date || 'N/A'} to {selectedTicket.Warranty_End_Date || 'N/A'}
                    </span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">Warranty Days Left</span>
                    <span className="data-value">{selectedTicket.Warranty_Days_Left || 'N/A'}</span>
                  </div>
                  <div className="data-pair">
                    <span className="data-label">DLP Period</span>
                    <span className="data-value">{selectedTicket.DLP_Period || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="detail-grid-section">
                <h3>Issue Summary</h3>
                <div className="grid-content">
                  <div className="data-pair full-width">
                    <span className="data-label">Client Description</span>
                    <div className="data-value description-box">
                      {selectedTicket.Description || 'No description provided.'}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
}
