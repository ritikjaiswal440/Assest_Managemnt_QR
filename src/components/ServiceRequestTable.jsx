import React, { useState, useMemo } from 'react';

const ServiceRequestTable = ({ requests, masterTickets, onConvertToMaster, onArchiveRequest, onUnarchiveRequest }) => {
  const [expandedRows, setExpandedRows] = useState({});
  const requestsArray = Array.isArray(requests) ? requests : [];

  // 1. Group Flat/Nested Rows by Intake_ID & Sort by Timestamp descending
  const groupedRequests = useMemo(() => {
    const map = {};
    requestsArray.forEach(r => {
      const id = r.Intake_ID || r.requestId;
      if (!id) return;
      
      if (!map[id]) {
        // Initialize the group with the general data from the first row
        map[id] = { ...r, items: [] };
      }
      
      // If the backend already grouped the items inside 'products'
      if (Array.isArray(r.products) && r.products.length > 0) {
        r.products.forEach(p => {
          map[id].items.push({
            ...p,
            Intake_ID: id,
            requestId: id,
            Company_Name: r.Company_Name || r.companyName || '',
            companyName: r.Company_Name || r.companyName || '',
            Requester_Name: r.Requester_Name || r.requesterName || '',
            requesterName: r.Requester_Name || r.requesterName || '',
            Client_Email: r.Client_Email || r.email || '',
            email: r.Client_Email || r.email || '',
            PhoneNumber: r.PhoneNumber || r.phoneNumber || r.phone || '',
            phoneNumber: r.PhoneNumber || r.phoneNumber || r.phone || '',
            Ref_Code: r.Ref_Code || r.refCode || '',
            refCode: r.Ref_Code || r.refCode || ''
          });
        });
      } else {
        // Otherwise, treat it as a flat row
        map[id].items.push(r);
      }
    });
    
    // Sort so the newest batches appear at the top
    return Object.values(map).sort((a, b) => {
      const dateA = new Date(a.Timestamp || a.timestamp || 0);
      const dateB = new Date(b.Timestamp || b.timestamp || 0);
      return dateB - dateA;
    });
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

  // 2. Calculate Batch-Level Status
  const getRequestStats = (req) => {
    const reqId = req?.Intake_ID || req?.requestId;
    if (!reqId) return { createdCount: 0, totalCount: 1, isFullyProcessed: false };

    const totalCount = req.items && req.items.length > 0 ? req.items.length : 1;
    
    // Count how many specific items/devices in the batch already have a Master Ticket
    const createdCount = req.items && req.items.length > 0
      ? req.items.filter(item => {
          const itemUniqueId = item.Unique_Product_Id || item.uniqueProductId || item.uniqueId;
          const itemSerial = item.ProductSerial || item.productSerial || item.serial;
          return (masterTickets || []).some(ticket => {
            const ticketIntakeRef = ticket.Intake_ID_Ref || ticket.Service_Request_ID || ticket.serviceRequestId;
            const isMatchIntake = String(ticketIntakeRef || '').trim() === String(reqId).trim();
            const isMatchUnique = itemUniqueId && ticket.Unique_Product_Id && String(ticket.Unique_Product_Id).trim() === String(itemUniqueId).trim();
            const isMatchSerial = itemSerial && ticket.ProductSerial && String(ticket.ProductSerial).trim() === String(itemSerial).trim();
            return isMatchIntake && (isMatchUnique || isMatchSerial);
          });
        }).length
      : 0;

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
                      <b>{companyName}</b><br />
                      <small>{requesterName} | {clientEmail} | {phoneNumber}</small>
                    </td>
                    <td>
                      <b>{category}</b><br />
                      <small><b>Loc:</b> {location} - {roomName}</small>
                      {req.items && req.items.length > 0 && (
                        <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--slate-gray)' }}>
                          <b>Hardware:</b> {req.items.map((p) => `${p.ProductMake || p.productMake || p.brand || 'N/A'} ${p.ProductModel || p.productModel || p.model || 'N/A'}`).join(', ')}
                        </div>
                      )}
                      <p className="detail-text mt-1" style={{ maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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

                  {/* 2. Update the Expanded Details View (Batch Render) */}
                  {isExpanded && (
                    <tr style={{ background: '#f8fafc' }}>
                      <td colSpan="5" style={{ padding: '15px 20px' }}>
                        {/* Shared General/Contact info rendered once at the top */}
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

                        {/* Iterate over the items array for the specific product rows */}
                        <div style={{ marginTop: '15px' }}>
                          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#475569', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Items in this Request ({req.items.length})</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {req.items.map((item, itemIdx) => {
                              // 3. Apply Strict V2 Fallback Mappings
                              const uniqueId = item.Unique_Product_Id || item.uniqueProductId || item.uniqueId || 'N/A';
                              const make = item.ProductMake || item.productMake || item.brand || 'N/A';
                              const model = item.ProductModel || item.productModel || item.model || 'N/A';
                              const serial = item.ProductSerial || item.productSerial || item.serial || 'N/A';
                              const floor = item.Floor || item.floor || 'N/A';
                              const roomType = item.Room_Type || item.roomType || 'N/A';
                              const ipAddress = item.IP_Address || item.ipAddress || 'N/A';
                              const macId = item.MAC_ID || item.macId || 'N/A';
                              const salesOrder = item.Sales_Order || item.salesOrder || 'N/A';
                              const invoiceNo = item.Invoice_No || item.invoiceNo || 'N/A';
                              const warrantyStart = item.Warranty_Start_Date || item.warrantyStart || 'N/A';
                              const warrantyEnd = item.Warranty_End_Date || item.warrantyEnd || 'N/A';
                              const dlpPeriod = item.DLP_Period || item.dlpPeriod || 'N/A';
                              const warrantyDays = item.Warranty_Days_Left || item.warrantyDays || 'N/A';
                              const assetStatus = item.Asset_Status || item.assetStatus || 'N/A';

                              // 4. Implement Item-Specific "Create Ticket" Action
                              const isItemPromoted = (masterTickets || []).some(ticket => {
                                const ticketIntakeRef = ticket.Intake_ID_Ref || ticket.Service_Request_ID || ticket.serviceRequestId;
                                const isMatchIntake = String(ticketIntakeRef || '').trim() === String(intakeId).trim();
                                
                                const ticketUnique = String(ticket.Unique_Product_Id || '').trim();
                                const itemUnique = String(uniqueId).trim();
                                const ticketSerial = String(ticket.ProductSerial || '').trim();
                                const itemSerial = String(serial).trim();

                                const isMatchUnique = itemUnique !== 'N/A' && ticketUnique !== '' && ticketUnique === itemUnique;
                                const isMatchSerial = itemSerial !== 'N/A' && ticketSerial !== '' && ticketSerial === itemSerial;

                                return isMatchIntake && (isMatchUnique || isMatchSerial);
                              });

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
                                  Timestamp: item.Timestamp || item.timestamp || req.Timestamp || req.timestamp || '',
                                  timestamp: item.Timestamp || item.timestamp || req.Timestamp || req.timestamp || '',
                                  Status: item.Status || item.status || req.Status || req.status || 'Open',
                                  status: item.Status || item.status || req.Status || req.status || 'Open',
                                  location: item.Location || item.location || req.Location || req.location || 'N/A',
                                  room: item.Room_Name || item.roomName || item.room || req.Room_Name || req.roomName || req.room || 'N/A',
                                  Unique_Product_Id: uniqueId !== 'N/A' ? uniqueId : '',
                                  ProductMake: make !== 'N/A' ? make : '',
                                  ProductModel: model !== 'N/A' ? model : '',
                                  ProductSerial: serial !== 'N/A' ? serial : '',
                                  Floor: floor !== 'N/A' ? floor : '',
                                  Room_Type: roomType !== 'N/A' ? roomType : '',
                                  IP_Address: ipAddress !== 'N/A' ? ipAddress : '',
                                  MAC_ID: macId !== 'N/A' ? macId : '',
                                  Sales_Order: salesOrder !== 'N/A' ? salesOrder : '',
                                  Invoice_No: invoiceNo !== 'N/A' ? invoiceNo : '',
                                  Warranty_Start_Date: warrantyStart !== 'N/A' ? warrantyStart : '',
                                  Warranty_End_Date: warrantyEnd !== 'N/A' ? warrantyEnd : '',
                                  DLP_Period: dlpPeriod !== 'N/A' ? dlpPeriod : '',
                                  Warranty_Days_Left: warrantyDays !== 'N/A' ? warrantyDays : '',
                                  Asset_Status: assetStatus !== 'N/A' ? assetStatus : '',
                                  Attachment_URL: item.Attachment_URL || item.attachmentUrl || req.Attachment_URL || req.attachmentUrl || '',
                                  attachmentUrl: item.Attachment_URL || item.attachmentUrl || req.Attachment_URL || req.attachmentUrl || '',
                                  invoiceUrl: item.invoiceUrl || req.invoiceUrl || ''
                                };
                                onConvertToMaster(enriched); // Passing specific item payload
                              };

                              return (
                                <div key={itemIdx} style={{ padding: '15px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <div>
                                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Hardware Info</span>
                                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                        <b>Make & Model:</b> {make} {model}<br />
                                        <b>Serial:</b> {serial}<br />
                                        <b>Unique ID:</b> {uniqueId}<br />
                                        <b>Sales Order:</b> {salesOrder}<br />
                                        <b>Invoice No:</b> {invoiceNo}
                                      </p>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Location & Network</span>
                                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                        <b>Floor:</b> {floor}<br />
                                        <b>Room Type:</b> {roomType}<br />
                                        <b>IP:</b> {ipAddress}<br />
                                        <b>MAC:</b> {macId}
                                      </p>
                                    </div>
                                    <div>
                                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Warranty & Status</span>
                                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                        <b>Warranty Start:</b> {warrantyStart}<br />
                                        <b>Warranty End:</b> {warrantyEnd}<br />
                                        <b>DLP Period:</b> {dlpPeriod}<br />
                                        <b>Warranty Days:</b> {warrantyDays}<br />
                                        <b>Status:</b> {assetStatus}
                                      </p>
                                    </div>
                                  </div>

                                  <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px', display: 'flex', justifyContent: 'flex-start' }}>
                                    {!isItemPromoted && !isArchived ? (
                                      <button
                                        onClick={handlePromoteItem}
                                        className="btn btn-primary btn-sm mt-2"
                                      >
                                        Create Ticket for {make !== 'N/A' ? make : 'this'} Device
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