import React, { useState } from 'react';

const TicketTable = ({ parents, children, userRole, isAdmin, currentUserEmail, onOpenUpdate, onOpenAssign, onCloseParent, onAddRemark, onPingEngineer }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const [pingingTasks, setPingingTasks] = useState({});

  const handlePing = async (childTicket, parentTicket) => {
    const childId = childTicket.Child_ID;
    setPingingTasks(prev => ({ ...prev, [childId]: true }));
    try {
      await onPingEngineer({
        childId: childTicket.Child_ID,
        parentId: parentTicket.Parent_ID || parentTicket['Parent ID'] || parentTicket.parentId,
        engineerName: childTicket.Engineer_Name,
        engineerEmail: childTicket.Engineer_Email || childTicket.engineerEmail || '',
        clientCompany: parentTicket.Company_Name || parentTicket['Company Name'] || parentTicket.companyName || '',
        location: parentTicket.Location || parentTicket.location || '',
        roomName: parentTicket.Room_Name || parentTicket['Room Name'] || parentTicket.roomName || '',
        issue: parentTicket.Issue_Type || parentTicket['Issue Type'] || parentTicket.issueType || parentTicket.Category || 'AV Support Issue',
        phoneNumber: parentTicket.PhoneNumber || parentTicket.phoneNumber || parentTicket['Phone Number'] || 'N/A'
      });
    } catch (error) {
      console.error("Failed to ping engineer:", error);
    } finally {
      setPingingTasks(prev => ({ ...prev, [childId]: false }));
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

  const renderTimelineLogs = (remarksStr, roleViewing) => {
    if (!remarksStr) return null;
    const lines = String(remarksStr).split('\n').filter(l => l.trim() !== '');
    return lines.map((line, i) => {
      const match = line.match(/^\[(.*?) - (.*?)\]\s*(.*)$/);
      if (match) {
        const [, timestamp, role, text] = match;
        if (role.toLowerCase() === 'admin' && roleViewing !== 'Admin') return null;
        const color = role.toLowerCase() === 'admin' ? 'var(--purple)' : 'var(--primary-action)';
        return (
          <div key={i} className="timeline-item" style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '8px', borderLeft: `4px solid ${color}`, border: '1px solid rgba(255, 255, 255, 0.6)' }}>
            <span style={{ fontWeight: '600', color }}>[{role}]</span>
            <span style={{ color: 'var(--slate-gray)' }}><small style={{ marginRight: '8px' }}>{timestamp}</small> {text}</span>
          </div>
        );
      }
      if (roleViewing !== 'Admin') return null;
      return (
        <div key={i} className="timeline-item" style={{ display: 'flex', gap: '10px', fontSize: '0.8rem', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(8px)', borderRadius: '8px', borderLeft: '4px solid var(--slate-gray)', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
          <span style={{ color: 'var(--slate-gray)' }}>{line}</span>
        </div>
      );
    });
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
              console.log("DEBUG - Ticket row object:", p);
              const pId = p.Parent_ID || p['Parent ID'] || p.parentId;
              const isExpanded = !!expandedRows[pId];
              const associatedChildren = childrenArray.filter(c => c && String(c.Parent_ID || c['Parent ID'] || c.parentId) === String(pId));

              const pStatus = p.Status || p.status || 'Opened';
              const pResolvedDays = p.Resolved_Days || p['Resolved Days'] || p.resolvedDays;

              return (
                <React.Fragment key={pId}>
                  {/* --- PARENT ROW --- */}
                  <tr className="parent-row" onClick={() => toggleRow(pId)}>
                    <td style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: '700', color: 'var(--primary-action)' }}>{pId}</span><br />
                      <span style={{ fontSize: '0.75rem', color: 'var(--slate-gray)', fontWeight: '600' }}>SR Ref: {p.Service_Request_ID || p['Service Request ID'] || p.serviceRequestId || 'N/A'}</span>
                    </td>
                    <td>
                      <b>{p.Company_Name || p['Company Name'] || p.companyName || 'N/A'}</b><br />
                      <small><b>Loc:</b> {p.Location || p.location || 'N/A'} | <b>Room:</b> {p.Room_Name || p['Room Name'] || p.roomName || 'N/A'}</small>
                    </td>
                    <td>
                      <b>{p.Category || p.category || 'N/A'}</b><br />
                      <small>{p.Issue_Type || p['Issue Type'] || p.issueType || 'N/A'}</small>
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
                            {pStatus === 'Ready to Close' && (
                              <button
                                className="btn-close-ticket"
                                onClick={() => onCloseParent(pId)}
                              >
                                Close Ticket
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
                              <p className="detail-text" style={{ marginBottom: '5px' }}><b>Requested By:</b> {p.Requested_By || p['Requested By'] || p.requestedBy || 'N/A'}</p>
                              {userRole !== 'Client' && (
                                <>
                                  <p className="detail-text" style={{ marginBottom: '5px' }}><b>Email:</b> {p.Client_Email || p.clientEmail || p['Client Email'] || 'N/A'}</p>
                                  <p className="detail-text" style={{ marginBottom: '5px' }}><b>Phone:</b> {p.PhoneNumber || p.phoneNumber || p['Phone Number'] || 'N/A'}</p>
                                </>
                              )}
                              <p className="detail-text" style={{ marginBottom: '5px' }}><b>Sales Order:</b> {p.Sales_Order || p['Sales Order'] || p.salesOrder || 'N/A'}</p>
                              <p className="detail-text" style={{ marginBottom: '10px' }}>
                                <b>Hardware:</b> {p.ProductMake || p.Brand || 'N/A'} - {p.ProductModel || p.Model || 'N/A'} (S/N: {p.ProductSerial || p.Serial || 'N/A'})
                              </p>
                              <p className="detail-text"><b>Client Description:</b><br />{p.Description || p.description || ''}</p>
                            </div>
                            <div className="detail-border-left">
                              <p className="detail-text"><b>Admin Remarks:</b><br />
                                {p.Admin_Remarks || p.admin_remarks ? String(p.Admin_Remarks || p.admin_remarks).split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>) : 'No admin remarks yet.'}
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

                              {renderTimelineLogs(p.Admin_Remarks || p.admin_remarks, userRole)}

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
                                    return (
                                      <tr key={c.Child_ID}>
                                        <td style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.85rem' }}><b style={{ fontWeight: '700' }}>{c.Child_ID}</b></td>
                                        <td>
                                          {c.Engineer_Name}
                                          <br />
                                          <small>{c.Engineer_Role}</small>
                                          <div style={{ marginTop: '8px' }}>
                                            {c.Acknowledged_At ? (
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
                                                disabled={pingingTasks[c.Child_ID]}
                                                className="btn-ping-engineer"
                                                style={{
                                                  height: '32px',
                                                  borderRadius: '50px',
                                                  fontSize: '12px',
                                                  padding: '0 12px',
                                                  backgroundColor: '#e8f0fe',
                                                  color: '#1a73e8',
                                                  border: 'none',
                                                  cursor: pingingTasks[c.Child_ID] ? 'wait' : 'pointer',
                                                  display: 'inline-flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  fontWeight: '500',
                                                  transition: 'all 0.2s'
                                                }}
                                              >
                                                {pingingTasks[c.Child_ID] ? 'Sending...' : '📧Email for Update'}
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                        <td><span className={`badge ${getBadgeClass(c.Status)}`}>{c.Status}</span></td>
                                        <td className="detail-text">
                                          <div style={{ marginBottom: '8px' }}><b>Instructions:</b> {c.Instructions || 'None'}</div>
                                          <div className="mt-1 pt-1 border-top-dashed"><b>Logs:</b><br />
                                            {c.Admin_Eng_Remarks || c.admin_eng_remarks ? String(c.Admin_Eng_Remarks || c.admin_eng_remarks).split('\n').map((line, i) => <React.Fragment key={i}>{line}<br /></React.Fragment>) : 'No logs yet.'}
                                          </div>
                                        </td>
                                        {userRole !== 'Client' && (
                                          <td>
                                            {(isAdmin || c.Engineer_Email === currentUserEmail) ? (
                                              <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => onOpenUpdate({
                                                  childId: c.Child_ID,
                                                  parentId: c.Parent_ID,
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