import React, { useState } from 'react';
import { generateServiceReport } from '../services/apiClient';

const TicketTable = ({ parents, children, logs = [], userRole, isAdmin, currentUserEmail, onOpenUpdate, onOpenAssign, onCloseParent, onAddRemark, onPingEngineer }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [pingingTasks, setPingingTasks] = useState({});
  const [generatingPDFs, setGeneratingPDFs] = useState({});

  const handlePing = async (childTicket, parentTicket) => {
    const childId = childTicket.Task_ID;
    setPingingTasks(prev => ({ ...prev, [childId]: true }));
    try {
      await onPingEngineer({
        childId: childTicket.Task_ID,
        parentId: parentTicket.Ticket_ID,
        engineerName: childTicket.Engineer_Name,
        engineerEmail: childTicket.Engineer_Email || '',
        clientCompany: parentTicket.Company_Name || '',
        location: parentTicket.Location || '',
        roomName: parentTicket.Room_Name || '',
        issue: parentTicket.Service_Type || parentTicket.Category || 'AV Support Issue',
        phoneNumber: parentTicket.PhoneNumber || 'N/A'
      });
    } catch (error) {
      console.error("Failed to ping engineer:", error);
    } finally {
      setPingingTasks(prev => ({ ...prev, [childId]: false }));
    }
  };

  const handleDownloadPDF = async (ticketId) => {
    if (!ticketId) return;
    setGeneratingPDFs(prev => ({ ...prev, [ticketId]: true }));
    try {
      const response = await generateServiceReport(ticketId);
      if (response && response.success && response.data && response.data.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
      } else {
        alert(response?.message || "Failed to generate Service Report PDF.");
      }
    } catch (error) {
      console.error("Failed to generate Service Report:", error);
      alert("An error occurred while generating the Service Report.");
    } finally {
      setGeneratingPDFs(prev => ({ ...prev, [ticketId]: false }));
    }
  };

  const toggleRow = (parentId) => {
    if (!parentId) return;
    setExpandedRows(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  const getBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('open')) return 'status-opened';
    if (s.includes('assign')) return 'status-assigned';
    if (s.includes('progress') || s.includes('waiting')) return 'status-inprogress';
    if (s.includes('ready')) return 'status-ready';
    if (s.includes('close')) return 'status-closed';
    return 'status-opened';
  };



  const parentsArray = Array.isArray(parents) ? parents : [];
  const childrenArray = Array.isArray(children) ? children : [];

  if (parentsArray.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}>
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <h3>No Tickets Found</h3>
        <p>No tickets match your current filters. Try adjusting your search criteria.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Ticket Ref</th>
              <th>Client / Location</th>
              <th>Issue Category</th>
              <th>Status</th>
              {isAdmin && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {parentsArray.map((p) => {
              if (!p) return null;
              const pId = p.Ticket_ID;
              const isExpanded = !!expandedRows[pId];
              const associatedChildren = childrenArray.filter(c => c && String(c.Ticket_ID_Ref) === String(pId));

              const pStatus = p.Status || 'Opened';
              const pResolvedDays = p.Resolved_Days;

              const allTasksClosed = associatedChildren.length > 0 && associatedChildren.every(task => 
                task.Status === 'Closed' || task.Status === 'Resolved'
              );
              const canCloseMaster = isAdmin && allTasksClosed && pStatus !== 'Closed';

              const ticketLogs = (Array.isArray(logs) ? logs : []).filter(l => 
                String(l.Target_ID || l.targetId) === String(pId)
              );

              return (
                <React.Fragment key={pId}>
                  {/* --- PARENT ROW --- */}
                  <tr className="parent-row" onClick={() => toggleRow(pId)}>
                    <td style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '700', color: 'var(--primary-action)' }}>{p.Ticket_ID}</span><br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-gray)', fontWeight: '600' }}>Sub-ref: {p.Intake_ID_Ref || 'N/A'}</span>
                    </td>
                    <td>
                      <b>{p.Company_Name || 'N/A'}</b><br />
                      <small><b>Loc:</b> {p.Location || 'N/A'} | <b>Room:</b> {p.Room_Name || 'N/A'}</small>
                    </td>
                    <td>
                      <b>{p.Service_Type || 'N/A'}</b><br />
                      <small>{p.Category || 'N/A'}</small>
                    </td>
                    <td>
                      <span className={`badge ${getBadgeClass(pStatus)}`}>{pStatus}</span>
                      {pStatus === 'Closed' && (pResolvedDays || pResolvedDays === 0 || pResolvedDays === '0') && (
                        <div className="badge-grey mt-1">Resolved in {pResolvedDays} Days</div>
                      )}
                    </td>

                    {isAdmin && (
                      <td onClick={(e) => e.stopPropagation()}>
                        {pStatus !== 'Closed' && (
                          <div className="table-actions-container">
                            <button
                              className="btn-remark"
                              onClick={() => onAddRemark(pId)}
                            >
                              + Remark
                            </button>
                            <button
                              className="btn-assign"
                              onClick={() => onOpenAssign(pId)}
                            >
                              Assign Eng
                            </button>
                            {isAdmin && pStatus === 'Ready to Close' && (
                              <button
                                onClick={() => onCloseParent(p.Ticket_ID)}
                                className="btn-close-ticket btn btn-success"
                              >
                                Verify & Close Ticket
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>

                  {/* --- EXPANDED CHILD CONTAINER --- */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={isAdmin ? 5 : 4} className="p-0">
                        <div className="child-container">
                          <div className="child-header-grid">
                            <div>
                              <p className="detail-text" style={{ marginBottom: '5px' }}><b>Requested By:</b> {p.Requester_Name || 'N/A'}</p>
                              {userRole !== 'Client' && (
                                <>
                                  <p className="detail-text" style={{ marginBottom: '5px' }}><b>Email:</b> {p.Client_Email || 'N/A'}</p>
                                  <p className="detail-text" style={{ marginBottom: '5px' }}><b>Phone:</b> {p.PhoneNumber || 'N/A'}</p>
                                </>
                              )}
                              <p className="detail-text" style={{ marginBottom: '5px' }}><b>Sales Order:</b> {p.Sales_Order || 'N/A'}</p>
                              
                              <div style={{
                                marginTop: '12px',
                                marginBottom: '12px',
                                padding: '12px',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--primary-deep)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                  🛡️ Hardware & Network Details
                                </h4>
                                <p className="detail-text" style={{ marginBottom: '4px' }}>
                                  <b>Hardware Product:</b> {p.ProductMake || 'Unknown'} {p.ProductModel || ''} (S/N: {p.ProductSerial || 'N/A'} | Unique ID: {p.Unique_Product_Id || 'N/A'})
                                </p>
                                <p className="detail-text" style={{ marginBottom: '4px' }}>
                                  <b>Network:</b> IP: {p.IP_Address || 'N/A'} | MAC: {p.MAC_ID || 'N/A'}
                                </p>
                                <p className="detail-text" style={{ marginBottom: '4px' }}>
                                  <b>Warranty:</b> {p.Asset_Status || 'N/A'} | Start: {p.Warranty_Start_Date || 'N/A'} | DLP: {p.DLP_Period || 'N/A'} | Days Left: {p.Warranty_Days_Left || 'N/A'}
                                </p>
                                <p className="detail-text" style={{ marginBottom: '4px' }}>
                                  <b>Location:</b> {p.Location} &gt; {p.Sub_Location} &gt; Floor: {p.Floor || 'N/A'} &gt; {p.Room_Type || 'Room'}: {p.Room_Name}
                                </p>
                                {p.Attachment_URL && (
                                  <div style={{ marginTop: '8px' }}>
                                    <a
                                      href={p.Attachment_URL}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-sm btn-outline"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                      📎 View Client Attachment
                                    </a>
                                  </div>
                                )}
                                {(pStatus === "Resolved" || pStatus === "Closed") && (
                                  <div style={{ marginTop: '8px' }}>
                                    <button
                                      onClick={() => handleDownloadPDF(pId)}
                                      disabled={generatingPDFs[pId]}
                                      className="btn btn-sm btn-primary"
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 'bold' }}
                                    >
                                      {generatingPDFs[pId] ? "⏳ Generating Service Report..." : "📄 Download Service Report"}
                                    </button>
                                  </div>
                                )}
                              </div>
                              <p className="detail-text"><b>Client Description:</b><br />{p.Admin_Remarks || 'No remarks provided.'}</p>
                            </div>
                            <div className="detail-border-left">
                              <p className="detail-text"><b>Admin Remarks:</b><br />
                                {p.Admin_Remarks ? String(p.Admin_Remarks).split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>) : 'No remarks provided.'}
                              </p>
                            </div>
                          </div>

                          {/* --- CHAT & TIMELINE REAL IMPLEMENTATION --- */}
                          <div className="communication-engine-scaffold" style={{
                            marginTop: '20px',
                            marginBottom: '20px',
                            padding: '15px',
                            backgroundColor: 'var(--slate-light)',
                            border: '1px dashed var(--slate-border)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--primary-deep)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>💬</span> Communication Logs & Remarks Timeline
                              </h4>
                              <span className="badge-grey" style={{ fontSize: '0.7rem' }}>
                                Active Role: {userRole || 'Guest'}
                              </span>
                            </div>

                            <div className="timeline-container-flex" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div className="timeline-item" style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '8px', borderLeft: '4px solid var(--primary-action)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                                <span style={{ fontWeight: '600', color: 'var(--primary-action)' }}>[System]</span>
                                <span style={{ color: 'var(--slate-gray)' }}>Ticket initialized. Operational triage dispatcher allocated.</span>
                              </div>

                              {ticketLogs.map((log, i) => (
                                <div key={i} className="timeline-item" style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '8px', borderLeft: '4px solid var(--purple)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                                  <span style={{ fontWeight: '600', color: 'var(--purple)' }}>[{log.Actor_Email || log.Actor || 'System'}]</span>
                                  <span style={{ color: 'var(--slate-gray)' }}>
                                    <small style={{ marginRight: '8px', color: '#94a3b8' }}>
                                      {new Date(log.Timestamp).toLocaleString()}
                                    </small> 
                                    <strong>{log.Action_Type || log.Action}:</strong> {log.Remarks}
                                  </span>
                                </div>
                              ))}
                              {ticketLogs.length === 0 && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No system logs recorded yet.</div>
                              )}

                              {userRole !== 'Admin' && (
                                <div className="timeline-item" style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '8px', borderLeft: '4px solid var(--slate-gray)', border: '1px solid rgba(255, 255, 255, 0.6)', opacity: 0.7 }}>
                                  <span style={{ fontWeight: '500', color: 'var(--slate-gray)' }}>System Note:</span>
                                  <span style={{ color: 'var(--slate-gray)', fontStyle: 'italic' }}>Internal admin logs are securely filtered from this view.</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="table-responsive">
                            <table className="child-table">
                              <thead>
                                <tr>
                                  <th>Task ID</th>
                                  <th>Assigned To</th>
                                  <th>Status</th>
                                  <th>Work Logs</th>
                                  {userRole !== 'Client' && <th>Action</th>}
                                </tr>
                              </thead>
                              <tbody>
                                {associatedChildren.length === 0 ? (
                                  <tr><td colSpan={userRole === 'Client' ? 4 : 5} style={{ textAlign: 'center' }}>No engineers assigned yet.</td></tr>
                                ) : (
                                  associatedChildren.map(c => {
                                    if (!c) return null;
                                    const taskId = c.Task_ID;
                                    const instructions = c.Admin_Instructions || c.adminInstructions || c.Instructions || c.instructions || 'None';
                                    const engLogs = c.Engineer_Remarks || c.engineerRemarks || c.engineer_remarks || c.Admin_Eng_Remarks || c.admin_eng_remarks || c.Remarks || c.remarks || 'No logs yet.';
                                    return (
                                      <tr key={taskId}>
                                        <td style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.85rem' }}><b style={{ fontWeight: '700' }}>{taskId}</b></td>
                                        <td>
                                          {c.Engineer_Name}
                                          <br />
                                          <small>{c.Engineer_Role}</small>
                                          <div style={{ marginTop: '8px' }}>
                                            {c.Acknowledged_At || c.Assigned_Date ? (
                                              <span style={{ backgroundColor: '#e6f4ea', color: '#137333', fontSize: '11px', borderRadius: '12px', padding: '4px 8px', display: 'inline-block', fontWeight: '500' }}>
                                                ✅ Acknowledged
                                              </span>
                                            ) : (
                                              <span style={{ backgroundColor: '#f1f3f4', color: '#5f6368', fontSize: '11px', borderRadius: '12px', padding: '4px 8px', display: 'inline-block', fontWeight: '500' }}>
                                                ⏳ Pending Ack
                                              </span>
                                            )}
                                          </div>
                                          {isAdmin && c.Engineer_Name && (
                                            <div style={{ marginTop: '6px' }} onClick={(e) => e.stopPropagation()}>
                                              <button
                                                onClick={() => handlePing(c, p)}
                                                disabled={pingingTasks[taskId]}
                                                className="btn-ping-engineer"
                                                style={{
                                                  height: '32px',
                                                  borderRadius: '50px',
                                                  fontSize: '12px',
                                                  padding: '0 12px',
                                                  backgroundColor: '#e8f0fe',
                                                  color: '#1a73e8',
                                                  border: 'none',
                                                  cursor: pingingTasks[taskId] ? 'wait' : 'pointer',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontWeight: '500',
                                                  transition: 'all 0.2s'
                                                }}
                                              >
                                                {pingingTasks[taskId] ? 'Sending...' : '📧Email for Update'}
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                        <td><span className={`badge ${getBadgeClass(c.Status)}`}>{c.Status}</span></td>
                                        <td className="detail-text">
                                          <div style={{ fontSize: '0.85rem' }}>
                                            <span style={{ fontWeight: '600', color: 'var(--slate-gray)' }}>Instructions:</span> {instructions}
                                          </div>
                                          <div style={{ fontSize: '0.85rem', marginTop: '4px' }} className="pt-1 border-top-dashed">
                                            <span style={{ fontWeight: '600', color: 'var(--slate-gray)' }}>Logs:</span><br />
                                            <span style={{ color: 'var(--text-muted)' }}>
                                              {engLogs !== 'No logs yet.' ? String(engLogs).split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>) : 'No logs yet.'}
                                            </span>
                                          </div>
                                        </td>
                                        {userRole !== 'Client' && (
                                          <td>
                                            {(isAdmin || c.Engineer_Email === currentUserEmail) ? (
                                              <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => onOpenUpdate({
                                                  childId: taskId,
                                                  parentId: c.Ticket_ID_Ref,
                                                  currentStatus: c.Status
                                                })}
                                              >
                                                Update Task
                                              </button>
                                            ) : '-'}
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TicketTable;