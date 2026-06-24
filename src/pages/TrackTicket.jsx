import { useState } from 'react';
import { trackTicket } from '../services/apiClient';
import './TrackTicket.css';

export default function TrackTicket() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please specify a valid Ticket ID, Intake ID, or Reference Code.');
      setTrackingData(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTrackingData(null);

    try {
      const response = await trackTicket(searchQuery.trim());
      if (response && response.success) {
        const tickets = response.data?.tickets || [];
        if (tickets.length > 0) {
          setTrackingData(response.data);
        } else {
          setError('No active records found matching the query.');
        }
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

  const getStatusBadgeClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('open') || s === 'received') return 'pill-open';
    if (s.includes('progress') || s.includes('assigned') || s.includes('pending') || s.includes('route')) return 'pill-pending';
    if (s.includes('close') || s === 'promoted' || s === 'resolved' || s === 'ready to close') return 'pill-resolved';
    return 'pill-default';
  };

  return (
    <div className="hub-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '100vh', padding: '40px 20px' }}>
      
      {/* Inline styles for details grid & layout */}
      <style>{`
        .tracking-card {
          background: white; 
          border-radius: var(--radius-lg); 
          border: 1px solid var(--slate-border); 
          box-shadow: 0 15px 40px rgba(0,0,0,0.06); 
          overflow: hidden;
          margin-bottom: 30px;
          animation: cardSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes cardSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .task-row {
          background-color: var(--slate-light);
          border: 1px solid var(--slate-border);
          border-radius: var(--radius-md);
          padding: 12px 18px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
          gap: 20px;
          margin-top: 10px;
        }
        .details-section {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: var(--radius-md);
          padding: 20px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-align: left;
        }
        .details-section:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          border-color: var(--primary-light);
        }
        .section-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--slate-dark);
          margin-bottom: 12px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          font-size: 0.85rem;
          border-bottom: 1px dashed #f1f5f9;
        }
        .info-row:last-child {
          border-bottom: none;
        }
        .info-label {
          color: var(--slate-gray);
          font-weight: 500;
        }
        .info-value {
          color: var(--slate-dark);
          font-weight: 600;
          text-align: right;
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '800px' }}>
        
        {/* Hero Header */}
        <header style={{ textAlign: 'center', marginBottom: '35px' }}>
          <h1 style={{ fontSize: '2.6rem', fontWeight: '800', color: 'var(--slate-dark)', marginBottom: '12px', letterSpacing: '-0.5px' }}>
            Live Service Tracking
          </h1>
          <p style={{ color: 'var(--slate-gray)', fontSize: '1.1rem', margin: 0, lineHeight: 1.5 }}>
            Enter your support ticket identifier, intake reference ID, or your company reference code to view real-time SLA metrics, location details, and active status.
          </p>
        </header>

        {/* Search Input Card */}
        <div className="md3-surface" style={{ background: 'white', padding: '24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--slate-border)', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', marginBottom: '30px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                className="md3-input"
                placeholder="Enter Ticket ID (e.g., TCK-1234), Intake ID, or Ref Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                boxShadow: '0 4px 12px rgba(26, 115, 232, 0.2)',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-action)'}
            >
              {isLoading ? 'Tracking...' : 'Track Status'}
            </button>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="error-banner" style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: '#fdf2f2', border: '1px solid #f8b4b4', color: '#9b1c1c', padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: '30px', textAlign: 'left' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <p style={{ margin: 0, fontWeight: '500' }}>{error}</p>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="loading-state" style={{ padding: '50px 0' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #f3f3f3', borderTop: '3px solid var(--primary-action)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 15px auto' }} />
            <p style={{ color: 'var(--slate-gray)', fontWeight: '600' }}>Fetching real-time incident status...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Details Status Cards */}
        {trackingData && trackingData.tickets && trackingData.tickets.map((t, idx) => {
          // Filter tasks related to this specific ticket
          const ticketTasks = (trackingData.tasks || []).filter(task => 
            String(task.Ticket_ID_Ref || '').trim() === String(t.Ticket_ID).trim()
          );

          return (
            <div key={idx} className="tracking-card">
              
              {/* Card Header */}
              <div style={{ background: 'var(--slate-light)', padding: '24px 30px', borderBottom: '1px solid var(--slate-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', textAlign: 'left' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--slate-gray)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Incident Reference</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="font-mono" style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--primary-action)' }}>{t.Ticket_ID}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--slate-gray)', fontWeight: '600' }}>
                      (Ref: {t.Ref_Code || t.refCode || 'N/A'})
                    </span>
                  </div>
                </div>
                <div>
                  <span className={`status-badge ${getStatusBadgeClass(t.Status)}`} style={{ padding: '6px 16px', fontSize: '0.9rem' }}>
                    {t.Status || 'Received'}
                  </span>
                </div>
              </div>

              {/* Grid Information Details */}
              <div style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '25px', textAlign: 'left' }}>
                
                <div className="details-grid">
                  
                  {/* Location Details */}
                  <div className="details-section">
                    <div className="section-title">📍 Location Details</div>
                    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--slate-dark)', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
                      Site: {t.Location || t.location} &gt; {t.Sub_Location || t.subLocation} &gt; Floor: {t.Floor || t.floor} &gt; Room: {t.Room_Name || t.roomName}
                    </div>
                    <div className="info-row">
                      <span className="info-label">Site / Location</span>
                      <span className="info-value">{t.Location || t.location || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Sub-Location</span>
                      <span className="info-value">{t.Sub_Location || t.subLocation || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Floor</span>
                      <span className="info-value">{t.Floor || t.floor || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Room / Area</span>
                      <span className="info-value">{t.Room_Name || t.roomName || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Hardware Details */}
                  <div className="details-section">
                    <div className="section-title">💻 Hardware Details</div>
                    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--slate-dark)', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
                      Device: {t.ProductMake || t.productMake} {t.ProductModel || t.productModel}, S/N: {t.ProductSerial || t.productSerial}, Asset ID: {t.Unique_Product_Id || t.uniqueId}
                    </div>
                    <div className="info-row">
                      <span className="info-label">Device Maker</span>
                      <span className="info-value">{t.ProductMake || t.productMake || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Model</span>
                      <span className="info-value">{t.ProductModel || t.productModel || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Serial Number</span>
                      <span className="info-value font-mono">{t.ProductSerial || t.productSerial || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Unique Asset ID</span>
                      <span className="info-value font-mono">{t.Unique_Product_Id || t.uniqueId || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Service & Warranty */}
                  <div className="details-section">
                    <div className="section-title">⚙️ Service & Warranty</div>
                    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--slate-dark)', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
                      Category: {t.Category || t.category}, Service Type: {t.Service_Type || t.serviceType}, Asset Status: {t.Asset_Status || t.assetStatus}
                    </div>
                    <div className="info-row">
                      <span className="info-label">Category</span>
                      <span className="info-value">{t.Category || t.category || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Service Type</span>
                      <span className="info-value">{t.Service_Type || t.serviceType || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Asset Status</span>
                      <span className="info-value">{t.Asset_Status || t.assetStatus || 'N/A'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Organization</span>
                      <span className="info-value">{t.Company_Name || t.company || 'N/A'}</span>
                    </div>
                    <div className="field" style={{ marginBottom: '8px', marginTop: '8px' }}>
                      <span className="field-label" style={{ fontWeight: 'bold', color: '#475569', width: '140px', display: 'inline-block' }}>Service Request ID:</span>
                      <span className="field-value" style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--primary-action)' }}>
                        {t.Intake_ID_Ref || t.intakeIdRef || 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Timelines */}
                  <div className="details-section">
                    <div className="section-title">📅 SLA & Timelines</div>
                    <div style={{ padding: '8px 12px', background: '#f1f5f9', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--slate-dark)', fontWeight: '600', marginBottom: '12px', lineHeight: '1.4' }}>
                      Opened: {t.Open_Date || t.openDate ? new Date(t.Open_Date || t.openDate).toLocaleDateString() : 'N/A'}, Closed: {t.Close_Date ? new Date(t.Close_Date).toLocaleDateString() : 'Pending'}, Resolution Time: {t.Resolved_Days ? t.Resolved_Days + ' Days' : 'N/A'}
                    </div>
                    <div className="info-row">
                      <span className="info-label">Opened On</span>
                      <span className="info-value">
                        {t.Open_Date || t.openDate ? new Date(t.Open_Date || t.openDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Closed On</span>
                      <span className="info-value">
                        {t.Close_Date ? new Date(t.Close_Date).toLocaleDateString() : 'Pending'}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="info-label">Resolution Time</span>
                      <span className="info-value">
                        {t.Resolved_Days ? `${t.Resolved_Days} Days` : 'N/A'}
                      </span>
                    </div>
                  </div>

                </div>

                {/* Subtask Section */}
                {ticketTasks.length > 0 && (
                  <div style={{ borderTop: '1px solid #f1f3f4', paddingTop: '20px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--slate-dark)', margin: '0 0 15px 0' }}>
                      🛠️ Sub-Task Allocations
                    </h3>
                    <div>
                      {ticketTasks.map((task, tIdx) => (
                        <div key={tIdx} className="task-row">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--slate-dark)' }}>
                              {task.Engineer_Name || 'Field Technician'}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--slate-gray)' }}>
                              Scope: {task.Admin_Instructions || 'SLA Field Dispatch'}
                            </span>
                          </div>
                          <span className={`status-badge ${getStatusBadgeClass(task.Status)}`} style={{ fontSize: '0.8rem', padding: '4px 12px' }}>
                            {task.Status || 'Assigned'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>
          );
        })}

      </div>
    </div>
  );
}