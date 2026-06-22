import { useState, useEffect } from 'react';
import { getPublicAssetDetails } from '../../services/apiClient';
import PublicComplaintForm from '../components/PublicComplaintForm';
import './PublicComplaintPortal.css';

export default function PublicComplaintPortal() {
  const hashString = window.location.hash; // e.g., #/asset/AVD%2FPD%2F000001.abc123xyz
  const decodedPath = decodeURIComponent(hashString.replace('#/asset/', ''));
  const parts = decodedPath.split('.');
  const assetId = parts.length > 0 ? parts[0] : decodedPath;
  const signature = parts.length > 1 ? parts[1] : '';
  
  console.log("🔍 TRACE - Extracted Signature on Mount:", signature);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asset, setAsset] = useState(null);

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
        const response = await getPublicAssetDetails({ assetId, signature });

        if (!active) return;

        if (response && response.success && response.data) {
          setAsset(response.data);
        } else {
          setError(response?.message || 'Access Denied: Invalid security signature or asset not found.');
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

  if (isLoading) {
    return (
      <div className="portal-container loading-container">
        <div className="skeleton-pulse skeleton-header"></div>
        <div className="skeleton-pulse skeleton-card"></div>
        <div className="skeleton-pulse skeleton-form"></div>
      </div>
    );
  }

  const getTierClass = (tier) => {
    if (!tier) return '';
    const lTier = tier.toLowerCase();
    if (lTier.includes('warranty') || lTier.includes('comprehensive')) return 'tier-active';
    if (lTier.includes('out')) return 'tier-expired';
    return 'tier-standard';
  };

  return (
    <div className="portal-container">
      <header className="portal-header">
        <h1 className="portal-title">AV Dynamic Support</h1>
        <p className="portal-subtitle">Smart Asset QR Assistance System</p>
      </header>

      {error && (
        <div className="error-banner md3-surface" role="alert">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      {asset ? (
        <main className="portal-main">
          <section className="portal-card asset-card md3-surface">
            <div className="card-header">
              <span className={`badge-support-tier ${getTierClass(asset.supportType)}`}>
                {asset.supportType || 'Standard Support'}
              </span>
              <h2>Hardware Verification</h2>
            </div>
            
            <div className="asset-details-sections">
              <div className="asset-section">
                <h3 className="section-title">Location</h3>
                <div className="asset-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Location</span>
                    <span className="detail-value">{asset.location || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Sub Location</span>
                    <span className="detail-value">{asset.subLocation || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Floor</span>
                    <span className="detail-value">{asset.floor || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Room Type</span>
                    <span className="detail-value">{asset.roomType || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Room Name</span>
                    <span className="detail-value">{asset.roomName || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <hr className="section-divider" />

              <div className="asset-section">
                <h3 className="section-title">Hardware</h3>
                <div className="asset-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Client / Organization</span>
                    <span className="detail-value">{asset.companyName || 'Unknown'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Hardware Maker</span>
                    <span className="detail-value">{asset.productMake || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Model Name</span>
                    <span className="detail-value">{asset.productModel || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Serial Number</span>
                    <span className="detail-value">{asset.productSerial || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <hr className="section-divider" />

              <div className="asset-section">
                <h3 className="section-title">Status & Warranty</h3>
                <div className="asset-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Asset Status</span>
                    <span className="detail-value">
                      <span className={`badge-support-tier ${asset.assetStatus?.toLowerCase() === 'active' ? 'tier-active' : 'tier-expired'}`} style={{display: 'inline-block', marginTop: '4px'}}>
                        {asset.assetStatus || 'N/A'}
                      </span>
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Warranty Start</span>
                    <span className="detail-value">{asset.warrantyStartDate ? new Date(asset.warrantyStartDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Warranty End</span>
                    <span className="detail-value">{asset.warrantyEndDate ? new Date(asset.warrantyEndDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">DLP Period</span>
                    <span className="detail-value">{asset.dlpPeriod ? `${asset.dlpPeriod} Months` : 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Days Left</span>
                    <span className="detail-value">
                       <span className={`badge-support-tier ${asset.warrantyDaysLeft > 0 ? 'tier-active' : 'tier-expired'}`} style={{display: 'inline-block', marginTop: '4px'}}>
                         {asset.warrantyDaysLeft > 0 ? `${asset.warrantyDaysLeft} Days` : 'Expired'}
                       </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {asset.supportType?.toLowerCase().includes('out') && (
              <div className="support-warning-box">
                <strong>Attention:</strong> This hardware is currently <strong>Out of Support</strong>. New service requests may require quote approvals before engineer dispatch.
              </div>
            )}
          </section>

          <PublicComplaintForm asset={asset} signature={signature} />
        </main>
      ) : (
        !isLoading && !error && (
          <div className="portal-card empty-state md3-surface">
            <div className="empty-icon">📱</div>
            <h3>Asset Unavailable</h3>
            <p>No verified hardware asset loaded. Please scan a valid QR code on the physical unit.</p>
          </div>
        )
      )}
    </div>
  );
}
