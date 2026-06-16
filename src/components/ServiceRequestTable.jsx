const ServiceRequestTable = ({ requests, masterTickets, onConvertToMaster, onArchiveRequest, onUnarchiveRequest }) => {
  const requestsArray = Array.isArray(requests) ? requests : [];
  
  if (requestsArray.length === 0) {
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
    const reqId = req?.requestId;
    if (!reqId) return { createdCount: 0, totalCount: 1, isFullyProcessed: false };

    const totalCount = req.products && req.products.length > 0 ? req.products.length : 1;
    const createdCount = (masterTickets || []).filter(ticket => 
      String(ticket.Service_Request_ID || ticket.serviceRequestId || '').trim() === String(reqId).trim()
    ).length;

    const isFullyProcessed = req.archived === true || req.archived === 'TRUE' || req.archived === 'true' || (createdCount >= totalCount);

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
            {requestsArray.map((req, idx) => {
              if (!req) return null;
              const { createdCount, totalCount, isFullyProcessed } = getRequestStats(req);
              const isArchived = req.archived === true || req.archived === 'TRUE' || req.archived === 'true';

              return (
                <tr key={idx} style={{ opacity: isFullyProcessed ? 0.6 : 1 }}>
                  <td style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontSize: '0.9rem' }}>
                    <b style={{ fontWeight: '700', color: 'var(--primary-action)' }}>{req.requestId || 'N/A'}</b>
                    <br />
                    {renderBadge(createdCount, totalCount)}
                  </td>
                  <td>
                    <b>{req.companyName || 'N/A'}</b><br/>
                    <small>{req.requesterName || 'Unknown'} | {req.email || 'N/A'}</small>
                  </td>
                  <td>
                    <b>{req.category || 'N/A'}</b><br/>
                    <small><b>Loc:</b> {req.location || 'N/A'} - {req.roomName || 'N/A'}</small>
                    {req.products && req.products.length > 0 && (
                      <div style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--slate-gray)' }}>
                        <b>Hardware:</b> {req.products.map((p) => `${p.productMake || p.brand || 'N/A'} ${p.productModel || p.model || 'N/A'}`).join(', ')}
                      </div>
                    )}
                    <p className="detail-text mt-1" style={{maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                      {req.description || ''}
                    </p>
                  </td>
                  <td>{formatDate(req.timestamp)}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch', maxWidth: '145px' }}>
                      {createdCount < totalCount && !isArchived ? (
                        <button 
                          className="btn btn-sm btn-success"
                          style={{ borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                          onClick={() => onConvertToMaster(req)}
                        >
                          Create Ticket
                        </button>
                      ) : (
                        !isArchived && (
                          <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: '500', display: 'block', textAlign: 'center', padding: '4px 0' }}>
                            Linked to Master
                          </span>
                        )
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
                          onClick={() => onUnarchiveRequest(req.requestId)}
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
                          onClick={() => onArchiveRequest(req.requestId)}
                        >
                          Archive Request
                        </button>
                      )}

                      {req.invoiceUrl && (
                        <a 
                          href={req.invoiceUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="btn btn-sm btn-outline" 
                          style={{ display: 'block', textAlign: 'center', borderRadius: '8px', padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                          View File
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ServiceRequestTable;