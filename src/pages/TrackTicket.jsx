import { useState, useEffect } from 'react';
import { fetchIntakeQueue, fetchMasterTickets, promoteTicket, fetchSystemLogs } from '../services/apiClient';
import UpdateTaskModal from '../components/UpdateTaskModal';
import './TrackTicket.css';

const TrackTicket = () => {
  const [activeTab, setActiveTab] = useState('intake'); // 'intake' or 'operations'
  const [intakeData, setIntakeData] = useState([]);
  const [operationsData, setOperationsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal & Detail state
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [engineerName, setEngineerName] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  
  // Execution Modal state
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [updateTaskConfig, setUpdateTaskConfig] = useState(null);

  // Fetch both queues on component mount
  const fetchAllQueues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [intakeRes, operationsRes] = await Promise.all([
        fetchIntakeQueue(),
        fetchMasterTickets()
      ]);

      if (intakeRes?.success && Array.isArray(intakeRes.data)) {
        // Filter out already promoted ones from display just in case, but keep non-promoted
        setIntakeData(intakeRes.data.filter(item => (item.Status || '').toLowerCase() !== 'promoted'));
      } else {
        setIntakeData(Array.isArray(intakeRes?.data) ? intakeRes.data : []);
      }

      if (operationsRes?.success && Array.isArray(operationsRes.data)) {
        setOperationsData(operationsRes.data);
      } else {
        setOperationsData(Array.isArray(operationsRes?.data) ? operationsRes.data : []);
      }

    } catch (err) {
      console.error("Error loading operational hub data:", err);
      setError("Failed to load dashboard data. Verify backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllQueues();
  }, []);

  // Helper to safely extract full ticket/intake details (handles JSON parsing of Payload field)
  const getMergedTicketDetails = (ticket) => {
    if (!ticket) return {};
    
    // Check if it is a Master Operations Ticket
    if (ticket.Ticket_ID && ticket.Intake_ID_Ref) {
      const matchingIntake = intakeData.find(i => i.Intake_ID === ticket.Intake_ID_Ref);
      let intakeDetails = {};
      if (matchingIntake && matchingIntake.Payload) {
        try {
          intakeDetails = JSON.parse(matchingIntake.Payload);
        } catch (e) {
          console.error("Failed to parse matching intake payload:", e);
        }
      }
      return {
        ...intakeDetails, // serialNumber, productMake, roomName, description, requestedBy, etc.
        ...ticket,        // Ticket_ID, Status, Assigned_Engineer, Open_Date, Close_Date, Resolved_Days, Admin_Remarks
        Intake_ID: ticket.Intake_ID_Ref,
        Created_At: ticket.Open_Date || matchingIntake?.Timestamp
      };
    }
    
    // Otherwise it's a Client Intake Queue ticket
    let details = { ...ticket };
    if (ticket.Payload) {
      try {
        const parsed = JSON.parse(ticket.Payload);
        details = { ...details, ...parsed };
      } catch (e) {
        console.error("Failed to parse intake payload:", e);
      }
    }
    details.Created_At = ticket.Timestamp;
    return details;
  };

  // Promotion Handler
  const handlePromote = async (details) => {
    if (!engineerName.trim()) {
      alert("Please specify an Assigned Engineer before promoting.");
      return;
    }
    
    setIsPushing(true);
    try {
      const res = await promoteTicket({
        Intake_ID: details.Intake_ID,
        Assigned_Engineer: engineerName
      });

      if (res && res.success) {
        // Close modal and reset fields
        setIsModalOpen(false);
        setSelectedTicket(null);
        setEngineerName('');

        // Optimistic State Update:
        // 1. Remove from intakeData state array
        setIntakeData(prev => prev.filter(i => i.Intake_ID !== details.Intake_ID));

        // 2. Add to operationsData state array
        const newMasterTicket = {
          Ticket_ID: res.data.Ticket_ID,
          Intake_ID_Ref: details.Intake_ID,
          Ref_Code: details.Ref_Code || details.refCode || "",
          Company_Name: details.Company_Name || details.companyName || "",
          Location: details.Location || details.location || "",
          Service_Type: details.Support_Type || details.supportType || "Standard",
          Status: res.data.Status || "In Progress",
          Assigned_Engineer: engineerName,
          Open_Date: new Date().toISOString(),
          Close_Date: "",
          Resolved_Days: "",
          Admin_Remarks: ""
        };
        setOperationsData(prev => [newMasterTicket, ...prev]);

        alert(`Success: Ticket successfully promoted to Master Operations Board. Reference: ${res.data.Ticket_ID}`);
      } else {
        alert("Promotion failed: " + (res?.message || "Verify column schemas matching Master_Tickets."));
      }
    } catch (err) {
      console.error(err);
      alert("Promotion exception occurred: " + err.message);
    } finally {
      setIsPushing(false);
    }
  };

  const [systemLogs, setSystemLogs] = useState([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  const handleOpenModal = async (ticket) => {
    const details = getMergedTicketDetails(ticket);
    setSelectedTicket(ticket);
    setEngineerName(details.Assigned_Engineer || details.Assigned_To || '');
    setIsModalOpen(true);
    
    // Fetch Activity Logs if it's a Master Ticket
    if (details.Ticket_ID) {
      setIsLogsLoading(true);
      try {
        const logsRes = await fetchSystemLogs(details.Ticket_ID);
        if (logsRes?.success && Array.isArray(logsRes.data)) {
          setSystemLogs(logsRes.data);
        } else {
          setSystemLogs([]);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
        setSystemLogs([]);
      } finally {
        setIsLogsLoading(false);
      }
    } else {
      setSystemLogs([]);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTicket(null);
    setEngineerName('');
  };

  const handleUpdateSuccess = (newStatus, newRemark) => {
    // Optimistically update operationsData
    setOperationsData(prev => prev.map(item => {
      if (item.Ticket_ID === updateTaskConfig?.Ticket_ID) {
        const isClosing = newStatus.toLowerCase() === 'resolved' || newStatus.toLowerCase() === 'closed';
        const currentDate = new Date();
        const openDate = new Date(item.Open_Date || currentDate);
        const resolvedDays = isClosing && !isNaN(openDate.getTime()) 
          ? Math.ceil((currentDate - openDate) / (1000 * 60 * 60 * 24)) 
          : item.Resolved_Days;

        const updatedRemarks = item.Admin_Remarks 
          ? `${item.Admin_Remarks}\n[${currentDate.toISOString().split('T')[0]}] ${newStatus}: ${newRemark}`
          : `[${currentDate.toISOString().split('T')[0]}] ${newStatus}: ${newRemark}`;

        return {
          ...item,
          Status: newStatus,
          Admin_Remarks: newRemark ? updatedRemarks : item.Admin_Remarks,
          Close_Date: isClosing ? currentDate.toISOString() : item.Close_Date,
          Resolved_Days: resolvedDays
        };
      }
      return item;
    }));
    
    // Update the selectedTicket if it's the one currently open in the detail modal
    if (selectedTicket && selectedTicket.Ticket_ID === updateTaskConfig?.Ticket_ID) {
      setSelectedTicket(prev => {
        const isClosing = newStatus.toLowerCase() === 'resolved' || newStatus.toLowerCase() === 'closed';
        const currentDate = new Date();
        const updatedRemarks = prev.Admin_Remarks 
          ? `${prev.Admin_Remarks}\n[${currentDate.toISOString().split('T')[0]}] ${newStatus}: ${newRemark}`
          : `[${currentDate.toISOString().split('T')[0]}] ${newStatus}: ${newRemark}`;

        return {
          ...prev,
          Status: newStatus,
          Admin_Remarks: newRemark ? updatedRemarks : prev.Admin_Remarks,
          Close_Date: isClosing ? currentDate.toISOString() : prev.Close_Date
        };
      });
    }
  };

  // Filter Active Dataset based on searchQuery
  const getFilteredData = () => {
    const currentArray = activeTab === 'intake' ? intakeData : operationsData;
    return currentArray.filter(item => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase().trim();
      const details = getMergedTicketDetails(item);

      const matchId = String(details.Ticket_ID || details.Intake_ID || details.Intake_ID_Ref || details.Complaint_ID || '').toLowerCase().includes(query);
      const matchCompany = String(details.Company_Name || details.companyName || '').toLowerCase().includes(query);
      const matchRequester = String(details.Requested_By || details.requestedBy || '').toLowerCase().includes(query);

      return matchId || matchCompany || matchRequester;
    });
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('open') || s === 'received') return 'pill-open';
    if (s.includes('progress') || s.includes('assigned') || s.includes('pending')) return 'pill-pending';
    if (s.includes('close') || s === 'promoted' || s === 'resolved') return 'pill-resolved';
    return 'pill-default';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const filteredItems = getFilteredData();
  const selectedDetails = getMergedTicketDetails(selectedTicket);

  return (
    <div className="hub-container">
      {/* KPI Stats Header */}
      <header className="hub-header">
        <div className="hub-title-section">
          <h2>Unified Support Operations Hub</h2>
          <p>Real-time intake tracking, ticket escalation, and engineer dispatches</p>
        </div>
        <button className="btn-refresh" onClick={fetchAllQueues} disabled={isLoading}>
          {isLoading ? 'Syncing...' : '🔄 Refresh Data'}
        </button>
      </header>

      {/* KPI Cards Row */}
      <section className="kpi-grid">
        <div className="kpi-card pending">
          <span className="kpi-title">Client Intake Queue</span>
          <span className="kpi-value">{intakeData.length}</span>
          <span className="kpi-desc">Awaiting Master Service Ticket</span>
        </div>
        <div className="kpi-card active">
          <span className="kpi-title">Active Service Requests</span>
          <span className="kpi-value">
            {operationsData.filter(t => (t.Status || '').toLowerCase() !== 'closed').length}
          </span>
          <span className="kpi-desc">In Progress / Assigned Tasks</span>
        </div>
        <div className="kpi-card closed">
          <span className="kpi-title">Closed Tickets</span>
          <span className="kpi-value">
            {operationsData.filter(t => (t.Status || '').toLowerCase() === 'closed').length}
          </span>
          <span className="kpi-desc">Successfully Resolved</span>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="hub-tabs-row">
        <div className="tabs-pill-group">
          <button 
            className={`tab-pill-btn ${activeTab === 'intake' ? 'active' : ''}`}
            onClick={() => { setActiveTab('intake'); setSearchQuery(''); }}
          >
            📥 Client Intake Queue ({intakeData.length})
          </button>
          <button 
            className={`tab-pill-btn ${activeTab === 'operations' ? 'active' : ''}`}
            onClick={() => { setActiveTab('operations'); setSearchQuery(''); }}
          >
            📋 Master Operations Board ({operationsData.length})
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="hub-search-box">
          <input 
            type="text"
            className="md3-input"
            placeholder="Search by Ref ID, Client, or Requester..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* Data Table */}
      <div className="table-responsive md3-surface">
        {isLoading ? (
          <div className="loading-state">
            <p>Fetching database streams...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔍</span>
            <h3>No Records Located</h3>
            <p>Modify search criteria or refresh to fetch live queue syncs.</p>
          </div>
        ) : (
          <table className="material-table">
            <thead>
              {activeTab === 'intake' ? (
                <tr>
                  <th>Intake ID</th>
                  <th>Client / Company</th>
                  <th>Asset Reference</th>
                  <th>Intake Status</th>
                  <th>Requester</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              ) : (
                <tr>
                  <th>Ticket Ref</th>
                  <th>Intake Reference</th>
                  <th>Client & Location</th>
                  <th>Support Type</th>
                  <th>Assigned Engineer</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              )}
            </thead>
            <tbody>
              {filteredItems.map((item, idx) => {
                const details = getMergedTicketDetails(item);
                if (activeTab === 'intake') {
                  return (
                    <tr key={details.Intake_ID || idx}>
                      <td className="bold-cell font-mono">{details.Intake_ID}</td>
                      <td><b>{details.Company_Name || details.companyName || 'N/A'}</b></td>
                      <td className="font-mono">{details.Unique_Product_Id || 'N/A'}</td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(details.Status)}`}>
                          {details.Status || 'Received'}
                        </span>
                      </td>
                      <td>{details.Requested_By || 'N/A'}</td>
                      <td>{formatDate(details.Created_At)}</td>
                      <td>
                        <button className="row-action-btn" onClick={() => handleOpenModal(item)}>
                          👁️ View Details & Escalate
                        </button>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={details.Ticket_ID || idx}>
                      <td className="bold-cell font-mono color-primary">{details.Ticket_ID}</td>
                      <td className="font-mono">{details.Intake_ID_Ref || 'Manual'}</td>
                      <td>
                        <b>{details.Company_Name || 'N/A'}</b>
                        <br />
                        <small>{details.Location || 'N/A'}</small>
                      </td>
                      <td><span className="tier-badge">{details.Service_Type || 'AMC'}</span></td>
                      <td><b>{details.Assigned_Engineer || 'Unassigned'}</b></td>
                      <td>
                        <span className={`status-badge ${getStatusBadge(details.Status)}`}>
                          {details.Status}
                        </span>
                      </td>
                      <td>
                        <button className="row-action-btn" onClick={() => handleOpenModal(item)}>
                          👁️ View Details
                        </button>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAILED 28-COLUMN MASTER-DETAIL MODAL */}
      {isModalOpen && selectedTicket && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content-wrapper" onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header">
              <h2>
                <span>🎟️</span> 
                {selectedDetails.Ticket_ID ? `Master Ticket: ${selectedDetails.Ticket_ID}` : `Intake Incident: ${selectedDetails.Intake_ID}`}
              </h2>
              <button className="close-btn" onClick={handleCloseModal}>&times;</button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">

              {/* Action Area: Promote to Service Request (Active only for non-promoted intake tickets) */}
              {activeTab === 'intake' && (selectedDetails.Status || '').toLowerCase() !== 'promoted' && (
                <div className="promotion-action-bar">
                  <div className="promotion-inputs">
                    <label htmlFor="engineerSelect">Assign Field Engineer *</label>
                    <input 
                      id="engineerSelect"
                      type="text"
                      className="md3-input"
                      value={engineerName}
                      onChange={(e) => setEngineerName(e.target.value)}
                      placeholder="Type name of engineer to dispatch..."
                      disabled={isPushing}
                    />
                  </div>
                  <button 
                    className="btn-promote-escalate" 
                    onClick={() => handlePromote(selectedDetails)} 
                    disabled={isPushing}
                  >
                    {isPushing ? 'Promoting Reference...' : '🚀 Promote to Service Request (AVD/PT)'}
                  </button>
                </div>
              )}

              {/* Action Area: Update Master Ticket (Active only for operations tab) */}
              {activeTab === 'operations' && selectedDetails.Ticket_ID && (
                <div className="promotion-action-bar">
                  <button 
                    className="btn-promote-escalate" 
                    onClick={() => {
                      setUpdateTaskConfig({
                        Ticket_ID: selectedDetails.Ticket_ID,
                        currentStatus: selectedDetails.Status
                      });
                      setIsUpdateModalOpen(true);
                    }} 
                    style={{ backgroundColor: '#28a745' }}
                  >
                    🔧 Update Ticket Status & Log Remarks
                  </button>
                </div>
              )}

              {/* 28-Column Detailed Grid Sections */}
              <div className="modal-details-container">
                
                {/* Section 1: System & Metadata */}
                <div className="detail-grid-section">
                  <h3>System & Meta</h3>
                  <div className="grid-content col-4">
                    <div className="data-pair">
                      <span className="data-label">Intake ID Ref</span>
                      <span className="data-value font-mono">{selectedDetails.Intake_ID || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Ticket ID</span>
                      <span className="data-value font-mono color-primary">{selectedDetails.Ticket_ID || 'Pending Promotion'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Intake Channel</span>
                      <span className="data-value">{selectedDetails.Source || 'Web Portal'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Current Status</span>
                      <span className="data-value">
                        <span className={`status-badge ${getStatusBadge(selectedDetails.Status)}`}>
                          {selectedDetails.Status}
                        </span>
                      </span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Sync Log Timestamp</span>
                      <span className="data-value">{formatDate(selectedDetails.Created_At)}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Assigned Resource</span>
                      <span className="data-value"><b>{selectedDetails.Assigned_Engineer || selectedDetails.Assigned_To || 'Unassigned'}</b></span>
                    </div>
                  </div>
                </div>

                {/* Section 2: Client Identity */}
                <div className="detail-grid-section">
                  <h3>Client Identity</h3>
                  <div className="grid-content col-4">
                    <div className="data-pair">
                      <span className="data-label">Company Name</span>
                      <span className="data-value"><b>{selectedDetails.Company_Name || selectedDetails.companyName || 'N/A'}</b></span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Client Code</span>
                      <span className="data-value font-mono">{selectedDetails.Ref_Code || selectedDetails.refCode || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Requested By</span>
                      <span className="data-value">{selectedDetails.Requested_By || selectedDetails.requestedBy || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Client Email</span>
                      <span className="data-value">{selectedDetails.Client_Email || selectedDetails.clientEmail || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Phone Number</span>
                      <span className="data-value">{selectedDetails.PhoneNumber || selectedDetails.phoneNumber || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Precise Location */}
                <div className="detail-grid-section">
                  <h3>Precise Location</h3>
                  <div className="grid-content col-4">
                    <div className="data-pair">
                      <span className="data-label">Primary Location</span>
                      <span className="data-value">{selectedDetails.Location || selectedDetails.location || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Sub Location</span>
                      <span className="data-value">{selectedDetails.Sub_Location || selectedDetails.subLocation || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Floor</span>
                      <span className="data-value">{selectedDetails.Floor || selectedDetails.floor || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Room Details</span>
                      <span className="data-value">
                        {selectedDetails.Room_Type || selectedDetails.roomType || 'N/A'} - {selectedDetails.Room_Name || selectedDetails.roomName || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Section 4: Hardware Profile */}
                <div className="detail-grid-section">
                  <h3>Hardware Profile</h3>
                  <div className="grid-content col-4">
                    <div className="data-pair">
                      <span className="data-label">Asset ID</span>
                      <span className="data-value font-mono">{selectedDetails.Unique_Product_Id || selectedDetails.Unique_Product_ID || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Hardware Make</span>
                      <span className="data-value">{selectedDetails.ProductMake || selectedDetails.productMake || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Hardware Model</span>
                      <span className="data-value">{selectedDetails.ProductModel || selectedDetails.productModel || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Serial Number</span>
                      <span className="data-value font-mono">{selectedDetails.SerialNumber || selectedDetails.serialNumber || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Device Health Status</span>
                      <span className="data-value">{selectedDetails.Asset_Status || selectedDetails.assetStatus || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 5: Contract & Coverage */}
                <div className="detail-grid-section">
                  <h3>Contract & Coverage</h3>
                  <div className="grid-content col-4">
                    <div className="data-pair">
                      <span className="data-label">Support Tier</span>
                      <span className="data-value">{selectedDetails.Support_Type || selectedDetails.supportType || 'Standard'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Coverage Range</span>
                      <span className="data-value">
                        {selectedDetails.Warranty_Start_Date || selectedDetails.warrantyStartDate || 'N/A'} to {selectedDetails.Warranty_End_Date || selectedDetails.warrantyEndDate || 'N/A'}
                      </span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">Warranty Days Left</span>
                      <span className="data-value">{selectedDetails.Warranty_Days_Left || selectedDetails.warrantyDaysLeft || 'N/A'}</span>
                    </div>
                    <div className="data-pair">
                      <span className="data-label">DLP Period</span>
                      <span className="data-value">{selectedDetails.DLP_Period || selectedDetails.dlpPeriod || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 6: Issue Summary */}
                <div className="detail-grid-section">
                  <h3>Issue Description</h3>
                  <div className="data-pair full-width">
                    <span className="data-label">Client Reported Issue</span>
                    <div className="description-box">
                      {selectedDetails.Description || selectedDetails.description || 'No detailed log provided.'}
                    </div>
                  </div>
                </div>

                {/* Section 7: Admin Remarks (If present for Operations Board) */}
                {selectedDetails.Admin_Remarks && (
                  <div className="detail-grid-section">
                    <h3>Operational Updates / Remarks</h3>
                    <div className="data-pair full-width">
                      <div className="description-box font-mono" style={{ background: '#f8f9fa' }}>
                        {selectedDetails.Admin_Remarks}
                      </div>
                    </div>
                  </div>
                )}

                {/* Section 8: Activity Logs / Audit Trail */}
                {selectedDetails.Ticket_ID && (
                  <div className="detail-grid-section" style={{ gridColumn: '1 / -1' }}>
                    <h3>History / System Logs</h3>
                    <div className="data-pair full-width">
                      {isLogsLoading ? (
                        <p>Loading activity trail...</p>
                      ) : systemLogs.length === 0 ? (
                        <p className="description-box" style={{ background: '#f8f9fa', fontStyle: 'italic', color: '#6c757d' }}>No activity logs recorded yet.</p>
                      ) : (
                        <div className="logs-timeline" style={{ background: '#fff', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                          {systemLogs.map((log, idx) => (
                            <div key={idx} className="log-entry" style={{ padding: '12px', borderBottom: idx !== systemLogs.length - 1 ? '1px solid #eee' : 'none', fontSize: '13px' }}>
                              <span style={{ color: '#0056b3', fontWeight: 'bold' }}>{formatDate(log.Timestamp)}</span> 
                              {' - '} 
                              <span style={{ color: '#495057' }}><b>{log.Actor}</b> performed <b>{log.Action}</b></span>
                              {log.Remarks && (
                                <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#6c757d', paddingLeft: '10px', borderLeft: '3px solid #dee2e6' }}>
                                  {log.Remarks}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* Engineer Execution Modal */}
      <UpdateTaskModal 
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        taskConfig={updateTaskConfig}
        currentUser={null} // Falls back to SYSTEM
        onSuccess={handleUpdateSuccess}
      />

    </div>
  );
};

export default TrackTicket;