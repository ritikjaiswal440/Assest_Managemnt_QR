import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { assetApi } from '../services/assetApi';
import './PublicComplaintPortal.css';

function PublicComplaintPortal() {
  const { assetIdAndSignature } = useParams();
  const [assetId, signature] = (assetIdAndSignature || '').split('.');

  // States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asset, setAsset] = useState(null);
  
  // Complaint Form States
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);

  // Fetch asset details on mount or param changes
  useEffect(() => {
    let active = true;
    const abortController = new AbortController();

    const fetchAssetDetails = async () => {
      if (!assetId || !signature) {
        setError('Invalid QR code format. Missing identifier or security signature.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await assetApi(
          'getPublicAssetDetails', 
          { assetId, signature }, 
          { signal: abortController.signal }
        );

        if (!active) return;

        if (response.success && response.data) {
          setAsset(response.data);
        } else {
          setError(response.message || 'Access Denied: Invalid security signature or asset not found.');
        }
      } catch (err) {
        if (!active) return;
        setError('Failed to establish connection with the Asset registry.');
        console.error(err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchAssetDetails();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [assetId, signature]);

  // Handle Form Submission
  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim() || !description.trim()) {
      alert('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitSuccess(null);

    try {
      const response = await assetApi('submitComplaint', {
        assetId,
        signature,
        clientName,
        clientEmail,
        description
      });

      if (response.success) {
        setSubmitSuccess(response.message || 'Complaint registered successfully! An engineer dispatch query has been created.');
        setDescription('');
      } else {
        setError(response.message || 'Failed to submit complaint.');
      }
    } catch (err) {
      setError('An error occurred during submission. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="portal-container loading-container">
        <div className="skeleton-pulse skeleton-header"></div>
        <div className="skeleton-pulse skeleton-card"></div>
        <div className="skeleton-pulse skeleton-form"></div>
      </div>
    );
  }

  return (
    <div className="portal-container">
      {/* Brand Header */}
      <header className="portal-header">
        <h1 className="portal-title">AV Dynamic Support Portal</h1>
        <p className="portal-subtitle">Smart Asset QR Assistance System</p>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {/* Success Banner */}
      {submitSuccess && (
        <div className="success-banner" role="status">
          {submitSuccess}
        </div>
      )}

      {asset ? (
        <main className="portal-main">
          {/* Sanitized Asset Details Card */}
          <section className="portal-card asset-card">
            <div className="card-header">
              <span className="badge-support-tier">{asset.supportTier || 'Standard Support'}</span>
              <h2>Asset Verification</h2>
            </div>
            
            <div className="asset-details-grid">
              <div className="detail-item">
                <span className="detail-label">Asset ID</span>
                <span className="detail-value">{asset.assetId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Hardware Maker</span>
                <span className="detail-value">{asset.make || 'AV Dynamic'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Model SKU</span>
                <span className="detail-value">{asset.model || 'Unknown'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Serial Number</span>
                <span className="detail-value">{asset.serialNumber || 'N/A'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location / Site</span>
                <span className="detail-value">{asset.location || 'Client Location'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">AMC / Support Expiry</span>
                <span className={`detail-value ${asset.isExpired ? 'expired-text' : 'active-text'}`}>
                  {asset.supportExpiryDate || 'Expired / Out of Support'}
                </span>
              </div>
            </div>

            {asset.isExpired && (
              <div className="support-warning-box">
                <strong>Attention:</strong> This hardware is currently <strong>Out of Support</strong>. AMC coverage has expired. New service requests will require quote approvals before engineer dispatch.
              </div>
            )}
          </section>

          {/* QR Complaint Form Card */}
          <section className="portal-card form-card">
            <h2>Report a Hardware Issue</h2>
            <p className="form-description">
              Scan-verified complaint routing. Submitting this form auto-registers the ticket with support triage.
            </p>

            <form onSubmit={handleSubmitComplaint} className="complaint-form">
              <div className="form-group">
                <label htmlFor="client-name">Your Name</label>
                <input
                  id="client-name"
                  type="text"
                  placeholder="Enter your full name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-email">Email Address</label>
                <input
                  id="client-email"
                  type="email"
                  placeholder="name@company.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="issue-description">Describe the Issue</label>
                <textarea
                  id="issue-description"
                  rows="4"
                  placeholder="Please describe what is wrong with the device (e.g., projector screen not rolling down, no audio out)..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <button 
                type="submit" 
                className="submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Logging Ticket...' : 'Submit Support Request'}
              </button>
            </form>
          </section>
        </main>
      ) : (
        !isLoading && !error && (
          <div className="portal-card empty-state">
            <div className="empty-icon">⚠️</div>
            <h3>Asset Unavailable</h3>
            <p>No verified hardware asset loaded. Please scan a valid QR code on the physical unit.</p>
          </div>
        )
      )}
    </div>
  );
}

export default PublicComplaintPortal;
