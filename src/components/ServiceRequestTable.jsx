import React, { useState } from 'react';

const ServiceRequestTable = ({ requests, masterTickets, onConvertToMaster, onArchiveRequest, onUnarchiveRequest }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const requestsArray = Array.isArray(requests) ? requests : [];
  
  const groupedRequests = React.useMemo(() => {
    const map = {};
    requestsArray.forEach(r => {
      const id = r.Intake_ID || r.requestId;
      if (!id) return;
      if (!map[id]) {
        // Initialize the group with the general data from the first row
        map[id] = { ...r, items: [] }; 
      }
      // Push the specific product row into the items array
      map[id].items.push(r);
    });
    return Object.values(map);
  }, [requestsArray]);

  const toggleRow = (id) => {
    if (!id) return;
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (groupedRequests.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#94a3b8' }}>
            <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
            <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
          </svg>
        </div>
        <h3>Queue Empty</h3>
        <p>No incoming service requests found in the queue.</p>
      </div>
    );
  }

  // Helper to calculate stats for a request
  const getRequestStats = (req) => {
    const reqId = req?.Intake_ID || req?.requestId;
    if (!reqId) return { createdCount: 0, totalCount: 1, isFullyProcessed: false };

    const totalCount = req.items && req.items.length > 0 ? req.items.length : 1;
    const createdCount = (masterTickets || []).filter(ticket => 
      String(ticket.Intake_ID_Ref || ticket.Service_Request_ID || ticket.serviceRequestId || '').trim() === String(reqId).trim()
    ).length;

    const statusStr = String(req.Status || req.status || '').toLowerCase();
    const isFullyProcessed = statusStr === 'promoted' || req.archived === true || req.archived === 'TRUE' || req.archived === 'true' || (createdCount >= totalCount);

    return { createdCount, totalCount, isFullyProcessed };
  };

  const renderBadge = (createdCount, totalCount) => {
    if (totalCount > 1) {
      if (createdCount === 0) {
        return (
          <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#f1f5f9', color: '#64748b', marginTop: '6px' }}>
            0 of {totalCount} Tickets Created
          </div>
        );
      } else if (createdCount < totalCount) {
        return (
          <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#fffbeb', color: '#d97706', marginTop: '6px', border: '1px solid #fde68a' }}>
            {createdCount} of {totalCount} Tickets Created
          </div>
        );
      } else {
        return (
          <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#f0fdf4', color: '#166534', marginTop: '6px', border: '1px solid #bbf7d0' }}>
            Processed ({createdCount} of {totalCount})
          </div>
        );
      }
    } else {
      if (createdCount >= 1) {
        return (
          <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#f0fdf4', color: '#166534', marginTop: '6px', border: '1px solid #bbf7d0' }}>
            Processed
          </div>
        );
      }
    }
    return null;
  };

  const formatDate = (iso) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="table-container">
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Client Info</th>
              <th>Issue Details</th>
              <th>Received On</th>
              <th>Triage Action</th>
            </tr>
          </thead>
          <tbody>
            {groupedRequests.map((req, idx) => {
              if (!req) return null;
              const { createdCount, totalCount, isFullyProcessed } = getRequestStats(req);
              const isArchived = req.archived === true || req.archived === 'TRUE' || req.archived === 'true' || String(req.Status || req.status || '').toLowerCase() === 'archived';

              const intakeId = req.Intake_ID || req.requestId || 'N/A';
              const isExpanded = !!expandedRows[intakeId];
              
              const companyName = req.Company_Name || req.companyName || 'N/A';
              const requesterName = req.Requester_Name || req.requesterName || 'Unknown';
              const clientEmail = req.Client_Email || req.email || 'N/A';
              const phoneNumber = req.PhoneNumber || req.phoneNumber || req.phone || 'N/A';
              const location = req.Location || req.location || 'N/A';
              const roomName = req.Room_Name || req.roomName || req.room || 'N/A';
              const category = req.Category || req.category || 'N/A';
              const description = req.Issue_Description || req.description || '';
              const timestamp = req.Timestamp || req.timestamp || '';
              
              const fileUrl = req.Attachment_URL || req.Attachment_Url || req.attachmentUrl || req.Attachment || req.invoiceUrl || '';

              return (
                <React.Fragment key={intakeId}>
                  <tr style={{ opacity: isFullyProcessed ? 0.6 : 1, cursor: 'pointer' }} onClick={() => toggleRow(intakeId)}>
                    <td style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.9rem' }}>
                      <span style={{ marginRight: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <b style={{ fontWeight: '700', color: 'var(--primary-action)' }}>{intakeId}</b>
                      <br />
                      {renderBadge(createdCount, totalCount)}
                    </td>
                    <td>
                      <b>{companyName}</b><br/>
                      <small>{requesterName} | {clientEmail} | {phoneNumber}</small>
                    </td>
                    <td>
                      <b>{category}</b><br/>
                      <small><b>Loc:</b> {location} - {roomName}</small>
                      {req.items && req.items.length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--slate-gray)' }}>
                          <b>Hardware:</b> {req.items.map((p) => `${p.ProductMake || p.productMake || p.brand || 'N/A'} ${p.ProductModel || p.productModel || p.model || 'N/A'}`).join(', ')}
                        </div>
                      )}
                      <p className="detail-text mt-1" style={{maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                        {description}
                      </p>
                    </td>
                    <td>{formatDate(timestamp)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch', maxWidth: '145px' }}>
                        {createdCount >= totalCount && !isArchived && (
                          <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', textAlign: 'center', padding: '4px 0' }}>
                            Linked to Master
                          </span>
                        )}

                        {isArchived ? (
                          <button 
                            className="btn btn-sm btn-success"
                            style={{ 
                              borderRadius: '8px', 
                              padding: '6px 12px', 
                              fontSize: '0.85rem', 
                              border: '1px solid #bbf7d0', 
                              background: '#e6f4ea', 
                              color: '#137333',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              textAlign: 'center'
                            }}
                            onClick={() => onUnarchiveRequest(intakeId)}
                          >
                            Unarchive
                          </button>
                        ) : (
                          <button 
                            className="btn btn-sm btn-secondary"
                            style={{ 
                              borderRadius: '8px', 
                              padding: '6px 12px', 
                              fontSize: '0.85rem', 
                              border: '1px solid #cbd5e1', 
                              background: '#ffffff', 
                              color: '#334155',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              textAlign: 'center'
                            }}
                            onClick={() => onArchiveRequest(intakeId)}
                          >
                            Archive Request
                          </button>
                        )}

                        {fileUrl && (
                          <a 
                            href={fileUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="btn btn-sm btn-outline" 
                            style={{ display: 'block', textAlign: 'center', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem', textDecoration: 'none' }}
                          >
                            View Attachment
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="5" style={{ padding: '15px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '15px' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Site Location Details</span>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                              <b>Location:</b> {location}<br />
                              <b>Room Name:</b> {roomName}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Contact Info</span>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                              <b>Requester Name:</b> {requesterName}<br />
                              <b>Email:</b> {clientEmail}<br />
                              <b>Phone:</b> {phoneNumber}
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Issue & Files</span>
                            <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                              <b>Description:</b> {description}
                            </p>
                            {fileUrl && (
                              <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="btn btn-sm btn-outline"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', fontWeight: 'bold', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                📎 View Attachment
                              </a>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Items in this Request ({req.items.length})</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {req.items.map((item, itemIdx) => {
                              const isItemPromoted = (masterTickets || []).some(ticket => 
                                String(ticket.Unique_Product_Id || '').trim() === String(item.Unique_Product_Id || item.uniqueId || '').trim() &&
                                String(ticket.Intake_ID_Ref || ticket.serviceRequestId || '').trim() === String(intakeId).trim()
                              );

                              const handlePromoteItem = () => {
                                const enriched = {
                                  ...item,
                                  Intake_ID: item.Intake_ID || item.requestId || req.Intake_ID || req.requestId || '',
                                  requestId: item.Intake_ID || item.requestId || req.Intake_ID || req.requestId || '',
                                  Ref_Code: item.Ref_Code || item.refCode || req.Ref_Code || req.refCode || '',
                                  refCode: item.Ref_Code || item.refCode || req.Ref_Code || req.refCode || '',
                                  Company_Name: item.Company_Name || item.companyName || req.Company_Name || req.companyName || '',
                                  companyName: item.Company_Name || item.companyName || req.Company_Name || req.companyName || '',
                                  Requester_Name: item.Requester_Name || item.requesterName || req.Requester_Name || req.requesterName || '',
                                  requesterName: item.Requester_Name || item.requesterName || req.Requester_Name || req.requesterName || '',
                                  Client_Email: item.Client_Email || item.email || req.Client_Email || req.email || '',
                                  email: item.Client_Email || item.email || req.Client_Email || req.email || '',
                                  PhoneNumber: item.PhoneNumber || item.phoneNumber || req.PhoneNumber || req.phoneNumber || '',
                                  phoneNumber: item.PhoneNumber || item.phoneNumber || req.PhoneNumber || req.phoneNumber || '',
                                  Issue_Description: item.Issue_Description || item.description || req.Issue_Description || req.description || '',
                                  description: item.Issue_Description || item.description || req.Issue_Description || req.description || '',
                                  Unique_Product_Id: item.Unique_Product_Id || item.uniqueId || '',
                                  Timestamp: item.Timestamp || item.timestamp || req.Timestamp || req.timestamp || '',
                                  timestamp: item.Timestamp || item.timestamp || req.Timestamp || req.timestamp || '',
                                  Status: item.Status || item.status || req.Status || req.status || 'Open',
                                  status: item.Status || item.status || req.Status || req.status || 'Open',
                                  location: item.Location || item.location || req.Location || req.location || 'N/A',
                                  room: item.Room_Name || item.roomName || item.room || req.Room_Name || req.roomName || req.room || 'N/A'
                                };
                                onConvertToMaster(enriched);
                              };

                              return (
                                <div key={itemIdx} style={{ padding: '15px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <div>
                                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Hardware Info</span>
                                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                        <b>Make & Model:</b> {item.ProductMake || item.productMake || ''} {item.ProductModel || item.productModel || ''}<br />
                                        <b>Serial:</b> {item.ProductSerial || item.productSerial || 'N/A'}<br />
                                        <b>Unique ID:</b> {item.Unique_Product_Id || item.uniqueId || 'N/A'}<br />
                                        <b>Sales Order:</b> {item.Sales_Order || item.salesOrder || 'N/A'}<br />
                                        <b>Invoice No:</b> {item.Invoice_No || item.invoiceNo || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Location & Network</span>
                                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                        <b>Floor:</b> {item.Floor || item.floor || 'N/A'}<br />
                                        <b>Room Type:</b> {item.Room_Type || item.roomType || 'N/A'}<br />
                                        <b>IP:</b> {item.IP_Address || item.ipAddress || 'N/A'}<br />
                                        <b>MAC:</b> {item.MAC_ID || item.macId || 'N/A'}
                                      </p>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Warranty & Status</span>
                                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                        <b>Warranty Start:</b> {item.Warranty_Start_Date || item.warrantyStart || 'N/A'}<br />
                                        <b>Warranty End:</b> {item.Warranty_End_Date || item.warrantyEnd || 'N/A'}<br />
                                        <b>DLP Period:</b> {item.DLP_Period || item.dlpPeriod || 'N/A'}<br />
                                        <b>Warranty Days:</b> {item.Warranty_Days_Left || item.warrantyDays || 'N/A'}<br />
                                        <b>Status:</b> {item.Asset_Status || item.assetStatus || 'N/A'}
                                      </p>
                                    </div>
                                  </div>

                                  <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                    {!isItemPromoted && !isArchived ? (
                                      <button 
                                        onClick={handlePromoteItem} 
                                        className="btn btn-primary btn-sm mt-2"
                                      >
                                        Create Ticket for {item.ProductMake || 'this'} Device
                                      </button>
                                    ) : (
                                      <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
                                        ✓ Linked to Master Ticket
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
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

export default ServiceRequestTable;