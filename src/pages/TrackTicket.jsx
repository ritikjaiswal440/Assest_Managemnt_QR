import { useState } from 'react';
import { searchTicket } from '../services/apiClient';
import './TrackTicket.css';

export default function TrackTicket() {
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) {
      setError('Please specify a valid Ticket ID, Phone Number, or Client Email.');
      setTicket(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTicket(null);

    try {
      const response = await searchTicket(searchInput.trim());
      if (response && response.success && response.ticket) {
        setTicket(response.ticket);
      } else {
        setError(response?.message || 'No active support records located matching the search query.');
      }
    } catch (err) {
      console.error(err);
      setError('Operational search timed out. Verify your connection and try again.');
    } finally {
      setIsLoading(false);
    }
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

  return (
    <div className="hub-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ width: '100%', maxWidth: '650px' }}>
        
        {/* Hero Header */}
        <header style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800', color: 'var(--slate-dark)', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Track Ticket Status
          </h1>
          <p style={{ color: 'var(--slate-gray)', fontSize: '1.1rem', margin: 0 }}>
            Enter your support ticket identifier, contact phone, or registered email to view real-time operations logs.
          </p>
        </header>

        {/* Search Input Card */}
        <div className="md3-surface" style={{ background: 'white', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', marginBottom: '30px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                className="md3-input"
                placeholder="Enter Ticket ID, Phone Number, or Client Email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                disabled={isLoading}
                style={{ borderRadius: '24px', padding: '14px 20px', fontSize: '16px' }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                backgroundColor: 'var(--primary-action)',
                color: 'white',
                border: 'none',
                padding: '14px 30px',
                borderRadius: '24px',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(26, 115, 232, 0.25)',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-action)'}
            >
              {isLoading ? 'Searching...' : 'Track Status'}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-banner md3-surface" style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: '30px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <p style={{ margin: 0, fontWeight: '500' }}>{error}</p>
          </div>
        )}

        {/* Details Status Card */}
        {ticket && (
          <div className="md3-surface" style={{ background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-border)', boxShadow: '0 15px 40px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            
            {/* Ticket Header */}
            <div style={{ background: 'var(--slate-light)', padding: '24px 30px', borderBottom: '1px solid var(--slate-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--slate-gray)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Ticket Identifier</span>
                <span className="font-mono" style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--primary-action)' }}>{ticket.Ticket_ID}</span>
              </div>
              <div>
                <span className={`status-badge ${getStatusBadge(ticket.Status)}`} style={{ padding: '6px 16px', fontSize: '0.9rem' }}>
                  {ticket.Status || 'Received'}
                </span>
              </div>
            </div>

            {/* Ticket Details Grid */}
            <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div>
                  <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Client / Company</span>
                  <span className="data-value" style={{ fontSize: '1.05rem', fontWeight: '600' }}>{ticket.Company_Name || 'N/A'}</span>
                </div>
                <div>
                  <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Date Registered</span>
                  <span className="data-value">{formatDate(ticket.Open_Date)}</span>
                </div>
                <div>
                  <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Assigned Engineer</span>
                  <span className="data-value" style={{ fontWeight: '600' }}>{ticket.Assigned_Engineer || 'Unassigned'}</span>
                </div>
                {ticket.Service_Type && (
                  <div>
                    <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Service Type</span>
                    <span className="tier-badge" style={{ display: 'inline-block', marginTop: '2px' }}>{ticket.Service_Type}</span>
                  </div>
                )}
              </div>

              {/* Contact Details (For enriched search) */}
              {(ticket.Requester_Name || ticket.Client_Email) && (
                <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  {ticket.Requester_Name && (
                    <div>
                      <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Contact Person</span>
                      <span className="data-value">{ticket.Requester_Name}</span>
                    </div>
                  )}
                  {ticket.Client_Email && (
                    <div>
                      <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Registered Email</span>
                      <span className="data-value">{ticket.Client_Email}</span>
                    </div>
                  )}
                  {ticket.PhoneNumber && (
                    <div>
                      <span className="data-label" style={{ display: 'block', marginBottom: '4px' }}>Phone Number</span>
                      <span className="data-value font-mono">{ticket.PhoneNumber}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Issue Description */}
              {ticket.Issue_Description && (
                <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: '20px' }}>
                  <span className="data-label" style={{ display: 'block', marginBottom: '6px' }}>Issue Description</span>
                  <div className="description-box" style={{ background: '#f8f9fa' }}>{ticket.Issue_Description}</div>
                </div>
              )}

              {/* Operational Remarks */}
              <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: '20px' }}>
                <span className="data-label" style={{ display: 'block', marginBottom: '6px' }}>Status Remarks</span>
                <div className="description-box" style={{ background: '#f8f9fa', fontFamily: 'monospace', minHeight: '60px' }}>
                  {ticket.Admin_Remarks || 'No remark logs recorded yet. Support team is reviewing.'}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}