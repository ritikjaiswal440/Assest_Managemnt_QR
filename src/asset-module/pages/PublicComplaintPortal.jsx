import { useState, useEffect } from 'react';
import { getPublicAssetDetails, submitToIntakeQueue } from '../../services/apiClient';
import './PublicComplaintPortal.css';

export default function PublicComplaintPortal() {
  const hashString = window.location.hash || ''; // e.g., #/asset/AVD%2FPD%2F000001.abc123xyz
  
  // Try to parse query parameters first
  const urlParams = new URLSearchParams(window.location.search);
  const queryAssetId = urlParams.get('assetId') || '';
  const querySignature = urlParams.get('signature') || '';

  // If not found in query params, fall back to hash-based routing
  const assetId = queryAssetId || (hashString ? decodeURIComponent(hashString.replace('#/asset/', '')).split('.')[0] : '');
  const signature = querySignature || (hashString && hashString.replace('#/asset/', '').split('.').length > 1 ? hashString.replace('#/asset/', '').split('.')[1] : '');
  
  console.log("🔍 TRACE - Resolved assetId:", assetId, "signature:", signature);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [asset, setAsset] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    requestedBy: '',
    clientEmail: '',
    phoneNumber: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState(null);
  const [formError, setFormError] = useState(null);

  // File Upload State
  const [attachment, setAttachment] = useState(null);
  const [fileName, setFileName] = useState('Attach Invoice, Image, or Document');

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

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName('Attach Invoice, Image, or Document');
      setAttachment(null);
      return;
    }

    // Validate File Size (5MB limit)
    if (file.size > 5242880) {
      alert('File size exceeds the 5MB limit. Please select a smaller file.');
      e.target.value = '';
      setFileName('Attach Invoice, Image, or Document');
      setAttachment(null);
      return;
    }

    // Validate MIME Type
    const validMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validMimeTypes.includes(file.type)) {
      alert('Invalid file format. Please upload a PDF, JPG, or PNG.');
      e.target.value = '';
      setFileName('Attach Invoice, Image, or Document');
      setAttachment(null);
      return;
    }

    setFileName(`Attached: ${file.name}`);
    setAttachment(file);
  };

  // Base64 Helper
  const toBase64 = file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = error => reject(error);
  });

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.requestedBy || !formData.clientEmail || !formData.description) {
      setFormError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      let base64String = "";
      if (attachment) {
        base64String = await toBase64(attachment);
      }

      // Map form state to the exact Intake_Queue schema before sending
      const payload = {
        Source: "QR",
        Unique_Product_Id: asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.assetId || "",
        Sales_Order: asset.Sales_Order || asset.SALES_ORDER || asset.salesOrder || "",
        Invoice_No: asset.Invoice_No || asset.INVOICE_NO || asset.invoiceNo || "",
        Ref_Code: asset.Ref_Code || asset.REF_CODE || signature || "",
        Company_Name: asset.Company_Name || asset.COMPANY_NAME || asset.companyName || "",
        Location: asset.Location || asset.LOCATION || asset.location || "",
        Sub_Location: asset.Sub_Location || asset.SUB_LOCATION || asset.subLocation || "",
        Room_Type: asset.Room_Type || asset.ROOM_TYPE || asset.roomType || "",
        Floor: asset.Floor || asset.FLOOR || asset.floor || "",
        Room_Name: asset.Room_Name || asset.ROOM_NAME || asset.roomName || "",
        ProductMake: asset.ProductMake || asset.PRODUCTMAKE || asset.productMake || "",
        ProductModel: asset.ProductModel || asset.PRODUCTMODEL || asset.productModel || "",
        ProductSerial: asset.ProductSerial || asset.PRODUCTSERIAL || asset.productSerial || "",
        MAC_ID: asset.MAC_ID || asset.MAC_Id || asset.macId || "",
        IP_Address: asset.IP_Address || asset.IP_ADDRESS || asset.ipAddress || "",
        Warranty_Start_Date: asset.Warranty_Start_Date || asset.WARRANTY_START_DATE || asset.warrantyStartDate || "",
        DLP_Period: asset.DLP_Period || asset.DLP_PERIOD || asset.dlpPeriod || "",
        Warranty_End_Date: asset.Warranty_End_Date || asset.WARRANTY_END_DATE || asset.warrantyEndDate || "",
        Warranty_Days_Left: asset.Warranty_Days_Left || asset.WARRANTY_DAYS_LEFT || asset.warrantyDaysLeft || "",
        Asset_Status: asset.Asset_Status || asset.ASSET_STATUS || asset.assetStatus || "Active",
        
        Requester_Name: formData.requestedBy || "",
        Client_Email: formData.clientEmail || "",
        PhoneNumber: formData.phoneNumber || "",
        Category: 'Hardware', // Default category for QR complaint
        Issue_Description: formData.description || "",
        
        Attachment_Base64: base64String,
        Attachment_Name: attachment ? attachment.name : "",
        Attachment_MimeType: attachment ? attachment.type : "",

        // The "Deep Sync" Payload: Pack EVERYTHING so the Master_Tickets triage can extract it later
        payloadObj: {
          Unique_Product_Id: asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.assetId || "",
          Ref_Code: asset.Ref_Code || asset.REF_CODE || signature || "",
          Company_Name: asset.Company_Name || asset.COMPANY_NAME || asset.companyName || "",
          Location: asset.Location || asset.LOCATION || asset.location || "",
          Sub_Location: asset.Sub_Location || asset.SUB_LOCATION || asset.subLocation || "",
          Floor: asset.Floor || asset.FLOOR || asset.floor || "",
          Room_Type: asset.Room_Type || asset.ROOM_TYPE || asset.roomType || "",
          Room_Name: asset.Room_Name || asset.ROOM_NAME || asset.roomName || "",
          ProductMake: asset.ProductMake || asset.PRODUCTMAKE || asset.productMake || "",
          ProductModel: asset.ProductModel || asset.PRODUCTMODEL || asset.productModel || "",
          ProductSerial: asset.ProductSerial || asset.PRODUCTSERIAL || asset.productSerial || "",
          MAC_ID: asset.MAC_ID || asset.MAC_Id || asset.macId || "",
          IP_Address: asset.IP_Address || asset.IP_ADDRESS || asset.ipAddress || "",
          Sales_Order: asset.Sales_Order || asset.SALES_ORDER || asset.salesOrder || "",
          Warranty_Start_Date: asset.Warranty_Start_Date || asset.WARRANTY_START_DATE || asset.warrantyStartDate || "",
          Warranty_End_Date: asset.Warranty_End_Date || asset.WARRANTY_END_DATE || asset.warrantyEndDate || "",
          DLP_Period: asset.DLP_Period || asset.DLP_PERIOD || asset.dlpPeriod || "",
          Warranty_Days_Left: asset.Warranty_Days_Left || asset.WARRANTY_DAYS_LEFT || asset.warrantyDaysLeft || "",
          Asset_Status: asset.Asset_Status || asset.ASSET_STATUS || asset.assetStatus || "",
          Issue_Type: "Hardware"
        }
      };

      const response = await submitToIntakeQueue(payload);

      if (response && response.success) {
        setSuccessReference(response.data?.Intake_ID || response.data?.complaintId || response.message || 'CMP-SUCCESS');
      } else {
        setFormError(response?.message || 'Failed to log complaint. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setFormError('A network error occurred. Please try again.');
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

              {/* --- NEW: NETWORK & IDENTITY SECTION --- */}
              <div style={{ marginTop: '20px', marginBottom: '20px' }}>
                <h4 style={{ color: '#3b82f6', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px', fontSize: '1rem' }}>
                  Network & Identity
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Asset ID</div>
                    <div style={{ fontWeight: '600', color: '#0f172a' }}>{asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.assetId || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Ref Code / SO</div>
                    <div style={{ color: '#334155' }}>{asset.Ref_Code || asset.REF_CODE || asset.Sales_Order || asset.salesOrder || 'N/A'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>IP Address</div>
                    <div style={{ color: '#334155' }}>{asset.IP_Address || asset.IP_ADDRESS || asset.ipAddress || 'DHCP'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>MAC ID</div>
                    <div style={{ color: '#334155' }}>{asset.MAC_ID || asset.MAC_Id || asset.macId || 'N/A'}</div>
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
                        {asset.assetStatus || 'Active'}
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

          {/* Form UI */}
          {successReference ? (
            <div className="success-state md3-surface">
              <div className="success-icon">✓</div>
              <h2>Complaint Logged Successfully.</h2>
              <p>Your support request has been registered.</p>
              <div className="reference-box">
                Reference: <strong>{successReference}</strong>
              </div>
            </div>
          ) : (
            <div className="complaint-form-container md3-surface">
              <h2>Report a Hardware Issue</h2>
              <p className="form-subtitle">Scan-verified routing. Your request will be directly dispatched to the support team.</p>

              {formError && <div className="error-banner">{formError}</div>}

              <form onSubmit={handleFormSubmit} className="md3-form">
                <div className="form-group">
                  <label>Requested By *</label>
                  <input
                    type="text"
                    name="requestedBy"
                    value={formData.requestedBy}
                    onChange={handleFormChange}
                    className="md3-input"
                    placeholder="Your Full Name"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    name="clientEmail"
                    value={formData.clientEmail}
                    onChange={handleFormChange}
                    className="md3-input"
                    placeholder="name@company.com"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleFormChange}
                    className="md3-input"
                    placeholder="+1 234 567 8900"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Description of Issue *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    className="md3-input"
                    rows="4"
                    placeholder="Please detail the hardware issue..."
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="form-group">
                  <label>Attachment (Image or PDF)</label>
                  <div className="upload-box">
                    <label htmlFor="reqInvoice" className="upload-label" style={{ cursor: 'pointer', display: 'block', padding: '15px', border: '1px dashed var(--border-color, #ccc)', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: attachment ? 'var(--brand-accent, #1a73e8)' : 'var(--text-muted, #5f6368)', fontWeight: attachment ? 'bold' : 'normal' }}>{fileName}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted, #5f6368)' }}>(PDF, JPG, PNG - Max limit: 5MB)</span>
                      </div>
                    </label>
                    <input 
                      type="file" 
                      id="reqInvoice" 
                      style={{ display: 'none' }} 
                      accept="image/*,.pdf" 
                      onChange={handleFileChange} 
                      disabled={isSubmitting} 
                    />
                  </div>
                </div>

                <button type="submit" className="btn-filled submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
                </button>
              </form>
            </div>
          )}
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
