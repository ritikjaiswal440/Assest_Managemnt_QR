/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { gasApi, fetchIntakeQueue, fetchMasterTickets, getDashboard } from '../services/apiClient';
import KpiCards from '../components/KpiCards';
import FilterBar from '../components/FilterBar';
import TicketTable from '../components/TicketTable';
import CreateTicketModal from '../components/CreateTicketModal';
import UpdateTaskModal from '../components/UpdateTaskModal';
import './Dashboard.css';
import AssignEngineerModal from '../components/AssignEngineerModal';
import ServiceRequestTable from '../components/ServiceRequestTable';
import RemarkModal from '../components/RemarkModal';

// Helper: Gracefully parse timestamps/dates from GAS backend
const parseDateSafely = (dateVal) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isNaN(dateVal.getTime()) ? null : dateVal;
  }
  
  const str = String(dateVal).trim();
  if (!str) return null;

  // Try parsing directly (e.g. ISO strings)
  let parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;

  // Handle GAS string format with " at " e.g. "June 02, 2026 at 08:35 PM"
  const cleaned = str.replace(/\s+at\s+/i, ' ');
  parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) return parsed;

  return null;
};

// Helper: Format date for CSV columns (e.g., YYYY-MM-DD HH:mm)
const formatCsvDate = (dateVal) => {
  const parsed = parseDateSafely(dateVal);
  if (!parsed) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  const hh = String(parsed.getHours()).padStart(2, '0');
  const mm = String(parsed.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}`;
};

// Helper: Escape CSV fields to prevent formatting issues
const escapeCsvField = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
};

const Dashboard = () => {
  const { user } = useAuth();
  const [filteredParents, setFilteredParents] = useState([]);
  const [kpiParents, setKpiParents] = useState([]);
  const [assignConfig, setAssignConfig] = useState({ isOpen: false, parentId: null });
  
  const [intakeData, setIntakeData] = useState([]);
  const [masterData, setMasterData] = useState([]);
  const [kpiMetrics, setKpiMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [updateTaskConfig, setUpdateTaskConfig] = useState({ isOpen: false, childId: null, parentId: null, currentStatus: '' });

  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' or 'requests'
  const [remarkModalConfig, setRemarkModalConfig] = useState({ isOpen: false, parentId: null });
  const [viewArchived, setViewArchived] = useState(false);

  // Update modal state to support pre-filling data
  const [createModalConfig, setCreateModalConfig] = useState({ isOpen: false, prefillData: null });
  const [activeFilters, setActiveFilters] = useState({
    searchTerm: '',
    company: 'All',
    location: 'All',
    status: 'All',
    startDate: '',
    endDate: '',
    quarter: 'Custom',
    sortBy: 'date_desc'
  });
  
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [kpiRes, intakeRes, masterRes] = await Promise.all([
        getDashboard(),
        fetchIntakeQueue(),
        fetchMasterTickets()
      ]);

      if (kpiRes?.success && kpiRes.data) {
        setKpiMetrics(kpiRes.data);
      } else {
        setError(kpiRes?.message || "Failed to retrieve operational metrics.");
      }

      if (intakeRes?.success && Array.isArray(intakeRes.data)) {
        setIntakeData(intakeRes.data);
      } else if (kpiRes?.success && kpiRes.data?.serviceRequests) {
        setIntakeData(kpiRes.data.serviceRequests);
      }

      if (masterRes?.success && Array.isArray(masterRes.data)) {
        setMasterData(masterRes.data);
      } else if (kpiRes?.success && kpiRes.data?.parents) {
        setMasterData(kpiRes.data.parents);
      }
      
    } catch (err) {
      console.error(err);
      setError("Failed to connect to the operational database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Re-apply filters automatically whenever the states or active filters change
  useEffect(() => {
    if (!masterData || masterData.length === 0) {
      setFilteredParents([]);
      setKpiParents([]);
      return;
    }

    const { searchTerm = '', company = 'All', location = 'All', status = 'All', startDate = '', endDate = '', sortBy = 'date_desc' } = activeFilters;
    const searchLower = searchTerm.toLowerCase();

    // Filter by role-based logic for Engineers and Clients
    const parentsSource = (masterData || []).filter(p => {
      if (!p) return false;
      if (user?.role && user.role.toLowerCase().includes('engineer')) {
        const assignedEng = String(p.Assigned_Engineer || p['Assigned Engineer'] || p.assigned_engineer || '').trim().toLowerCase();
        const matchesParentEng = assignedEng && (
          assignedEng === String(user.name || '').trim().toLowerCase() ||
          assignedEng === String(user.username || '').trim().toLowerCase() ||
          assignedEng === String(user.email || '').trim().toLowerCase()
        );
        const pId = p.Parent_ID || p['Parent ID'] || p.parentId;
        const associatedChildren = (kpiMetrics?.children || []).filter(c => c && String(c.Parent_ID || c['Parent ID'] || c.parentId) === String(pId));
        const hasAssignedChild = associatedChildren.some(c => {
          const engName = String(c.Engineer_Name || '').trim().toLowerCase();
          const engEmail = String(c.Engineer_Email || c.engineerEmail || '').trim().toLowerCase();
          return (
            engName === String(user.name || '').trim().toLowerCase() ||
            engName === String(user.username || '').trim().toLowerCase() ||
            engEmail === String(user.email || '').trim().toLowerCase()
          );
        });
        return matchesParentEng || hasAssignedChild;
      }
      if (user?.role === 'Client') {
        return String(p.Company_Name || p['Company Name'] || p.companyName || '').trim().toLowerCase() === String(user.company || '').trim().toLowerCase();
      }
      return true;
    });

    // 1. Filter for KPI cards (ignoring the Status dropdown to prevent metrics blanking)
    const forKpi = parentsSource.filter(p => {
      if (!p) return false;
      if (company !== 'All' && p?.Company_Name !== company) return false;
      if (location !== 'All' && p?.Location !== location) return false;
      
      // Date Range Filtering (inclusive of boundary days)
      const ticketDate = parseDateSafely(p?.Open_Date || p?.openDate || p?.['Open Date']);
      if (startDate) {
        if (!ticketDate) return false;
        const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
        const startLimit = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
        if (ticketDate.getTime() < startLimit.getTime()) return false;
      }
      if (endDate) {
        if (!ticketDate) return false;
        const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
        const endLimit = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
        if (ticketDate.getTime() > endLimit.getTime()) return false;
      }

      if (searchLower) {
        const searchableStr = `${p?.Parent_ID || ''} ${p?.Service_Request_ID || ''} ${p?.Company_Name || ''} ${p?.Location || ''} ${p?.Room_Name || ''} ${p?.Description || ''}`.toLowerCase();
        if (!searchableStr.includes(searchLower)) return false;
      }
      return true;
    });

    // 2. Filter for the main Table (applying the Status dropdown using robust substring matches)
    const forTable = forKpi.filter(p => {
      if (status !== 'All') {
        const s = (p?.Status || '').toLowerCase();
        const f = status.toLowerCase();
        if (f === 'opened' && !s.includes('open')) return false;
        if (f === 'closed' && !s.includes('close')) return false;
        if (f === 'ready to close' && !s.includes('ready')) return false;
        if (f === 'in progress' && !(s.includes('progress') || s.includes('waiting') || s.includes('assign'))) return false;
      }
      return true;
    });

    // 3. Apply sorting based on sortBy state
    const sortedTable = [...forTable].sort((a, b) => {
      if (sortBy === 'date_desc' || sortBy === 'date_asc') {
        const dateA = parseDateSafely(a?.Open_Date || a?.openDate || a?.['Open Date']);
        const dateB = parseDateSafely(b?.Open_Date || b?.openDate || b?.['Open Date']);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return sortBy === 'date_desc' ? 1 : -1;
        if (!dateB) return sortBy === 'date_desc' ? -1 : 1;
        
        return sortBy === 'date_desc' 
          ? dateB.getTime() - dateA.getTime() 
          : dateA.getTime() - dateB.getTime();
      }
      
      if (sortBy === 'client_asc') {
        const clientA = String(a?.Company_Name || a?.companyName || '').trim();
        const clientB = String(b?.Company_Name || b?.companyName || '').trim();
        return clientA.localeCompare(clientB);
      }
      
      if (sortBy === 'status_sort') {
        const getStatusWeight = (statusStr) => {
          const s = String(statusStr || '').toLowerCase();
          if (s.includes('open')) return 1;
          if (s.includes('progress') || s.includes('assign') || s.includes('waiting')) return 2;
          if (s.includes('ready')) return 3;
          if (s.includes('close')) return 4;
          return 5;
        };
        
        return getStatusWeight(a?.Status || a?.status) - getStatusWeight(b?.Status || b?.status);
      }
      
      return 0;
    });

    setKpiParents(forKpi);
    setFilteredParents(sortedTable);
  }, [masterData, kpiMetrics, activeFilters, user]);

  const handleFilterChange = (filters) => {
    setActiveFilters(filters);
  };

  const handleDownloadReport = () => {
    const { startDate, endDate } = activeFilters;
    
    let filename = 'AVD_Support_Report';
    const startStr = startDate ? startDate.replace(/-/g, '') : '';
    const endStr = endDate ? endDate.replace(/-/g, '') : '';
    
    if (startStr && endStr) {
      filename += `_${startStr}_to_${endStr}`;
    } else if (startStr) {
      filename += `_${startStr}_to_Onward`;
    } else if (endStr) {
      filename += `_UpTo_${endStr}`;
    } else {
      filename += '_All';
    }
    filename += '.csv';

    const headers = [
      'Ticket ID',
      'SR Ref',
      'Requester Name',
      'Company Name',
      'Location',
      'Issue Category',
      'Issue Type',
      'Status',
      'Open Date',
      'Closed Date',
      'Total Resolution Time (Days)'
    ];

    const csvRows = [headers.map(escapeCsvField).join(',')];

    filteredParents?.forEach(p => {
      if (!p) return;
      
      const ticketId = p?.Parent_ID || p?.['Parent ID'] || p?.parentId || '';
      const srRef = p?.Service_Request_ID || p?.['Service Request ID'] || p?.serviceRequestId || '';
      const requesterName = p?.Requested_By || p?.['Requested By'] || p?.requestedBy || '';
      const companyName = p?.Company_Name || p?.['Company Name'] || p?.companyName || '';
      const location = p?.Location || p?.location || '';
      const category = p?.Category || p?.category || '';
      const issueType = p?.Issue_Type || p?.['Issue Type'] || p?.issueType || '';
      const status = p?.Status || p?.status || 'Opened';
      const openDate = formatCsvDate(p?.Open_Date || p?.openDate || p?.['Open Date']);
      const closedDate = formatCsvDate(p?.Close_Date || p?.closeDate || p?.['Close Date']);
      const resTime = p?.Resolved_Days || p?.['Resolved Days'] || p?.resolvedDays || '';

      const row = [
        ticketId,
        srRef,
        requesterName,
        companyName,
        location,
        category,
        issueType,
        status,
        openDate,
        closedDate,
        resTime
      ];
      csvRows.push(row.map(escapeCsvField).join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCloseParent = async (parentId) => {
    if (window.confirm("Are you sure you want to officially close this Parent Ticket? This cannot be undone.")) {
      try {
        const response = await gasApi('closeParentTicket', { parentId });
        if (response?.success) {
          alert("Ticket closed successfully.");
          fetchDashboardData(); // Refresh the board
        } else {
          alert("Error: " + response?.message);
        }
      } catch {
        alert("Network error.");
      }
    }
  };

  const handleTaskUpdateSuccess = useCallback((updatedStatus, newRemark, taskId, ticketId) => {
    // 1. Refresh background data
    fetchDashboardData();

    // 2. Perform optimistic local UI state update
    const timestamp = new Date().toLocaleString('en-GB', { 
      timeZone: 'Asia/Kolkata', 
      day: '2-digit', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
    
    if (taskId) {
      if (newRemark && newRemark.trim() !== '') {
        const newLogEntry = `[${timestamp}] ${newRemark.trim()}`;
        setKpiMetrics(prev => {
          if (!prev) return prev;
          const updatedChildren = (prev.children || []).map(child => {
            if (String(child.Task_ID) === String(taskId)) {
              const existingRemarks = child.Engineer_Remarks || child.engineerRemarks || child.Remarks || "";
              const combinedRemarks = existingRemarks ? `${existingRemarks}\n${newLogEntry}` : newLogEntry;
              return {
                ...child,
                Status: updatedStatus || child.Status,
                Engineer_Remarks: combinedRemarks,
                engineerRemarks: combinedRemarks,
                Remarks: combinedRemarks,
                Admin_Eng_Remarks: combinedRemarks,
                admin_eng_remarks: combinedRemarks
              };
            }
            return child;
          });
          return { ...prev, children: updatedChildren };
        });
      } else if (updatedStatus) {
        setKpiMetrics(prev => {
          if (!prev) return prev;
          const updatedChildren = (prev.children || []).map(child => {
            if (String(child.Task_ID) === String(taskId)) {
              return { ...child, Status: updatedStatus };
            }
            return child;
          });
          return { ...prev, children: updatedChildren };
        });
      }
    } else if (ticketId) {
      if (newRemark && newRemark.trim() !== '') {
        const dateStr = new Date().toISOString().split('T')[0];
        const newRemarkEntry = `[${dateStr}] ${updatedStatus}: ${newRemark.trim()}`;
        setMasterData(prev => prev.map(t => {
          if (String(t.Ticket_ID || t.parentId || t.Parent_ID) === String(ticketId)) {
            const existingRemarks = t.Admin_Remarks || "";
            const combinedRemarks = existingRemarks ? `${existingRemarks}\n${newRemarkEntry}` : newRemarkEntry;
            return {
              ...t,
              Status: updatedStatus || t.Status,
              Admin_Remarks: combinedRemarks,
              admin_remarks: combinedRemarks,
              adminRemarks: combinedRemarks
            };
          }
          return t;
        }));
      } else if (updatedStatus) {
        setMasterData(prev => prev.map(t => {
          if (String(t.Ticket_ID || t.parentId || t.Parent_ID) === String(ticketId)) {
            return { ...t, Status: updatedStatus };
          }
          return t;
        }));
      }
    }
  }, [fetchDashboardData]);

  const handleArchiveRequest = async (requestId) => {
    if (window.confirm(`Are you sure you want to archive Service Request ${requestId}? This will remove it from the active queue.`)) {
      setIsLoading(true);
      try {
        const response = await gasApi('archiveRequest', { requestId });
        if (response?.success) {
          alert("Service Request archived successfully.");
          fetchDashboardData();
        } else {
          alert("Error: " + (response?.message || "Failed to archive request."));
        }
      } catch {
        alert("Network communication failed.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAddParentRemark = (parentId) => {
    setRemarkModalConfig({ isOpen: true, parentId });
  };

  const handleUnarchiveRequest = async (requestId) => {
    if (window.confirm(`Are you sure you want to unarchive Service Request ${requestId}? This will return it to the active queue.`)) {
      setIsLoading(true);
      try {
        const response = await gasApi('unarchiveRequest', { requestId });
        if (response?.success) {
          alert("Service Request unarchived successfully.");
          fetchDashboardData();
        } else {
          alert("Error: " + (response?.message || "Failed to unarchive request."));
        }
      } catch {
        alert("Network communication failed.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePingEngineer = async (pingData) => {
    try {
      const response = await gasApi('pingEngineer', {
        childId: pingData.childId,
        parentId: pingData.parentId,
        engineerName: pingData.engineerName,
        engineerEmail: pingData.engineerEmail,
        clientCompany: pingData.clientCompany,
        location: pingData.location,
        roomName: pingData.roomName,
        issue: pingData.issue,
        phoneNumber: pingData.phoneNumber,
        actorEmail: user?.email || ''
      });

      if (response?.success) {
        alert(`Status update request email dispatched to ${pingData.engineerName} successfully.`);
      } else {
        alert("Error: " + (response?.message || "Failed to request status update."));
      }
    } catch {
      alert("Network communication failed.");
    }
  };
  
  return (
    <div className="dashboard-layout">
      {/* Main Content Area */}
      <main className="container">
        <div className="dashboard-header">
          <h2>{user?.role === 'Client' ? 'Client Portal' : 'Ticket Dashboard'}</h2>
          <div className="header-actions">
            <button className="btn btn-primary" onClick={fetchDashboardData} disabled={isLoading}>
              {isLoading ? 'Syncing...' : 'Refresh Data'}
            </button>
            {user?.role === 'Admin' && (
              <button 
                className="btn btn-success" 
                onClick={() => setCreateModalConfig({ isOpen: true, prefillData: null })} // Pass null for a blank form
              >
                + Manual Ticket
              </button>
            )}
          </div>
        </div>

        {/* Error State */}
        {error && <div className="error-banner">{error}</div>}

        {/* Loading State Overlay */}
        {isLoading && !kpiMetrics ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Cards Skeleton */}
            <div className="kpi-row">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="kpi-card skeleton-pulse" style={{ height: '110px' }}>
                  <div className="skeleton-text" style={{ width: '60%' }}></div>
                  <div className="skeleton-title" style={{ width: '40%', height: '32px' }}></div>
                </div>
              ))}
            </div>
            {/* Table Skeleton */}
            <div className="table-container" style={{ padding: '16px 24px' }}>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div className="skeleton-pulse" style={{ height: '40px', width: '200px', borderRadius: '16px' }}></div>
                <div className="skeleton-pulse" style={{ height: '40px', width: '150px', borderRadius: '16px' }}></div>
                <div className="skeleton-pulse" style={{ height: '40px', width: '100px', borderRadius: '16px' }}></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton-pulse" style={{ height: '60px', width: '100%', borderRadius: '12px' }}></div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Metrics */}
            <KpiCards tickets={kpiParents} />
            
            {/* Dual-Tab UI Toggles */}
            {(user?.role === 'Admin' || user?.role === 'Operations' || user?.role?.toLowerCase().includes('engineer')) && (
              <div style={{ display: 'flex', gap: '20px', marginBottom: '25px', borderBottom: '2px solid rgba(0, 0, 0, 0.05)', paddingBottom: '16px' }}>
                <button 
                  onClick={() => setActiveTab('tickets')}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'tickets' ? 'var(--primary-action)' : 'var(--slate-light)',
                    color: activeTab === 'tickets' ? '#ffffff' : 'var(--slate-dark)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  Master Operations Board
                </button>
                <button 
                  onClick={() => setActiveTab('requests')}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '24px',
                    border: 'none',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    backgroundColor: activeTab === 'requests' ? 'var(--primary-action)' : 'var(--slate-light)',
                    color: activeTab === 'requests' ? '#ffffff' : 'var(--slate-dark)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  Client Intake Queue SR
                  {intakeData && (
                    <span style={{
                      background: activeTab === 'requests' ? '#ffffff' : 'var(--danger)', 
                      color: activeTab === 'requests' ? 'var(--primary-action)' : 'white', 
                      borderRadius: '12px', 
                      padding: '2px 8px', 
                      fontSize: '0.75rem', 
                      marginLeft: '8px',
                      fontWeight: 'bold'
                    }}>
                      {(intakeData || []).filter(r => {
                        const isArchived = r.archived === true || r.archived === 'TRUE' || r.archived === 'true';
                        if (isArchived) return false;

                        const totalCount = r.products && r.products.length > 0 ? r.products.length : 1;
                        const createdCount = (masterData || []).filter(p => 
                          String(p.Service_Request_ID || p.serviceRequestId || '').trim() === String(r.requestId).trim()
                        ).length;

                        return createdCount < totalCount;
                      }).length}
                    </span>
                  )}
                </button>
              </div>
            )}
            
            <div className="table-placeholder-content">
              {activeTab === 'tickets' || user?.role === 'Client' ? (
                <>
                  <FilterBar 
                    bundle={{ clients: kpiMetrics?.clients || [], parents: masterData }} 
                    onFilterChange={handleFilterChange} 
                    userRole={user?.role} 
                    onDownloadReport={handleDownloadReport} 
                  />
                  <TicketTable 
                    parents={filteredParents || []} 
                    children={kpiMetrics?.children || []} 
                    logs={kpiMetrics?.logs || []}
                    userRole={user?.role}
                    isAdmin={user?.role === 'Admin'}
                    currentUserEmail={user?.email}
                    onOpenUpdate={(config) => setUpdateTaskConfig({ ...config, isOpen: true })}
                    onOpenAssign={(parentId) => setAssignConfig({ isOpen: true, parentId })}
                    onCloseParent={handleCloseParent}
                    onAddRemark={handleAddParentRemark}
                    onPingEngineer={handlePingEngineer}
                  />
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => setViewArchived(!viewArchived)}
                      style={{
                        padding: '8px 20px',
                        fontSize: '0.9rem',
                        borderRadius: '20px',
                        border: '2px solid var(--primary-action)',
                        backgroundColor: viewArchived ? 'var(--primary-light)' : 'transparent',
                        color: 'var(--primary-action)',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {viewArchived ? '📋 Show Active Requests' : '🗄️ View Archived Requests'}
                    </button>
                  </div>
                  <ServiceRequestTable 
                    requests={(intakeData || []).filter(r => {
                      const isArch = r.archived === true || r.archived === 'TRUE' || r.archived === 'true';
                      return viewArchived ? isArch : !isArch;
                    })}
                    masterTickets={masterData || []}
                    onConvertToMaster={(reqData) => setCreateModalConfig({ isOpen: true, prefillData: reqData })}
                    onArchiveRequest={handleArchiveRequest}
                    onUnarchiveRequest={handleUnarchiveRequest}
                  />
                </>
              )}
            </div>
          </>
        )}
      </main>
      
      <CreateTicketModal 
        isOpen={createModalConfig.isOpen}
        onClose={() => setCreateModalConfig({ isOpen: false, prefillData: null })}
        clients={kpiMetrics?.clients || []}
        engineers={kpiMetrics?.engineers || []}
        currentUser={user}
        onSuccess={fetchDashboardData} 
        initialData={createModalConfig.prefillData}
      />
      <UpdateTaskModal 
        isOpen={updateTaskConfig.isOpen}
        onClose={() => setUpdateTaskConfig({ isOpen: false, childId: null, parentId: null, currentStatus: '' })}
        taskConfig={updateTaskConfig}
        currentUser={user}
        onSuccess={handleTaskUpdateSuccess}
      />
      <AssignEngineerModal 
        isOpen={assignConfig.isOpen}
        onClose={() => setAssignConfig({ isOpen: false, parentId: null })}
        assignConfig={assignConfig}
        bundle={{ engineers: kpiMetrics?.engineers || [] }}
        currentUser={user}
        onSuccess={fetchDashboardData}
        tickets={masterData}
      />
      <RemarkModal
        isOpen={remarkModalConfig.isOpen}
        onClose={() => setRemarkModalConfig({ isOpen: false, parentId: null })}
        parentId={remarkModalConfig.parentId}
        currentUser={user}
        onSuccess={() => {
          fetchDashboardData();
          setRemarkModalConfig({ isOpen: false, parentId: null });
        }}
      />
    </div>
  );
};

export default Dashboard;