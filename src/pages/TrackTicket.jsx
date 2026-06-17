import { useState } from 'react';
import { gasApi } from '../services/api';
import './TrackTicket.css';

const TrackTicket = () => {
  const [trackingId, setTrackingId] = useState('');
  const [tickets, setTickets] = useState([]); // Array state
  const [status, setStatus] = useState({ loading: false, error: null });
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setStatus({ loading: true, error: null });
    setTickets([]); // Clear previous
    setHasSearched(true);

    try {
      const response = await gasApi('trackTicket', { trackingId });
      if (response?.success) {
        setTickets(response?.data?.tickets || []); // Set array safely
        setStatus({ loading: false, error: null });
      } else {
        setStatus({ loading: false, error: response?.message || "Incident details not found." });
      }
    } catch {
      setStatus({ loading: false, error: "Network error." });
    }
  };

  const getBadgeClass = (statusStr) => {
    const s = (statusStr || '').toLowerCase();
    if (s.includes('open')) return 'status-opened';
    if (s.includes('progress') || s.includes('assigned') || s.includes('waiting')) return 'status-inprogress';
    if (s.includes('ready')) return 'status-ready';
    if (s.includes('close')) return 'status-closed';
    return 'status-opened';
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const ticketsArray = Array.isArray(tickets) ? tickets : [];

  return (
    <div className="track-container">
      <div className="track-header">
        <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="track-logo-img" />
        <p>ProSupport Ticket Tracking</p>
      </div>

      <div className="track-search-card">
        <form onSubmit={handleSearch} className="search-form">
          <label htmlFor="trackingId">Enter Reference ID or Ticket ID</label>
          <div className="search-input-group">
            <input
              id="trackingId"
              type="text"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="e.g., AVD/PT/00-00/0000 or SR-20260000-0000"
              disabled={status.loading}
              style={{ width: '100%' }}
            />
            <button type="submit" className="btn btn-primary" disabled={status.loading || !trackingId.trim()}>
              {status.loading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </form>
        {status.error && <div className="error-banner mt-3">{status.error}</div>}
      </div>

      {/* Map through all returned tickets */}
      {ticketsArray.length > 0 && (
        <div style={{ width: '100%', maxWidth: '600px' }}>
          {ticketsArray.length > 1 && (
            <h4 style={{ color: 'var(--slate-gray)', marginBottom: '15px' }}>Found {ticketsArray.length} tickets for this Reference ID</h4>
          )}

          {ticketsArray.map((ticket, index) => {
            if (!ticket) return null;
            return (
              <div className="ticket-result-card" key={index} style={{ marginBottom: '20px' }}>
                <div className="result-header">
                  <div>
                    <h3 style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontWeight: '700', color: 'var(--primary-action)' }}>{ticket.parentId || 'N/A'}</h3>
                    <span className="text-muted">Ref: <span style={{ fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace', fontWeight: '700', color: 'var(--slate-dark)' }}>{ticket.serviceRequestId || 'N/A'}</span></span>
                  </div>
                  <div className={`badge ${getBadgeClass(ticket.status)} text-lg`}>
                    {ticket.status || 'Opened'}
                  </div>
                </div>

                <div className="result-body">
                  <div className="detail-group">
                    <span className="label">Client / Location</span>
                    <span className="value">{ticket.company || 'N/A'} - {ticket.location || 'N/A'}</span>
                  </div>
                  <div className="detail-group">
                    <span className="label">Issue Category</span>
                    <span className="value">{ticket.category || 'N/A'} ({ticket.issueType || 'N/A'})</span>
                  </div>
                  <div className="detail-group">
                    <span className="label">Hardware</span>
                    <span className="value">{ticket.productMake || 'N/A'} {ticket.productModel || 'N/A'} (S/N: {ticket.productSerial || 'N/A'})</span>
                  </div>
                  <div className="detail-group">
                    <span className="label">Opened On</span>
                    <span className="value">{formatDate(ticket.openDate)}</span>
                  </div>
                  {ticket.status === 'Closed' && (
                    <div className="detail-group">
                      <span className="label">Closed On</span>
                      <span className="value">{formatDate(ticket.closeDate)}</span>
                    </div>
                  )}
                  <div className="detail-group full-width mt-2">
                    <span className="label">Incident Description</span>
                    <span className="value box-value">{ticket.description || 'No description provided.'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {hasSearched && ticketsArray.length === 0 && !status.loading && !status.error && (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <h3>No Tickets Found</h3>
          <p>We couldn't find any tickets matching that Reference ID.</p>
        </div>
      )}
    </div>
  );
};

export default TrackTicket;