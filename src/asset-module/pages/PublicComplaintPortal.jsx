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
          {/* --- ENTERPRISE ASSET VERIFICATION CARD --- */}
          <div style={{ 
            background: '#ffffff', 
            borderRadius: '12px', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', 
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '24px'
          }}>
            <div style={{ padding: '16px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: '600' }}>Hardware Verification</h3>
              <span style={{ 
                background: asset.supportType?.toLowerCase().includes('out') ? '#fee2e2' : '#e0f2fe', 
                color: asset.supportType?.toLowerCase().includes('out') ? '#b91c1c' : '#0369a1', 
                padding: '4px 10px', 
                borderRadius: '20px', 
                fontSize: '0.75rem', 
                fontWeight: 'bold' 
              }}>
                {asset.supportType || 'Standard SLA'}
              </span>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Identity & Commercials */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Identity & Commercials</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Asset ID</div><div style={{ fontWeight: '600', color: '#0f172a' }}>{asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.assetId || 'N/A'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Ref Code</div><div style={{ fontWeight: '500', color: '#334155' }}>{asset.Ref_Code || asset.REF_CODE || asset.refCode || 'N/A'}</div></div>
                  {/* NEW SALES ORDER FIELD */}
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Sales Order (SO)</div><div style={{ fontWeight: '500', color: '#334155' }}>{asset.Sales_Order || asset.SALES_ORDER || asset.salesOrder || 'N/A'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Organization</div><div style={{ fontWeight: '500', color: '#334155' }}>{asset.Company_Name || asset.COMPANY_NAME || asset.companyName || 'N/A'}</div></div>
                </div>
              </div>

              {/* Network & Specs */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Hardware & Network</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Device</div><div style={{ fontWeight: '600', color: '#0f172a' }}>{asset.ProductMake || asset.productMake || ''} {asset.ProductModel || asset.productModel || ''}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Serial Number</div><div style={{ fontWeight: '500', color: '#334155', fontFamily: 'monospace' }}>{asset.ProductSerial || asset.productSerial || 'N/A'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>IP Address</div><div style={{ fontWeight: '500', color: '#334155', fontFamily: 'monospace' }}>{asset.IP_Address || asset.IP_ADDRESS || asset.ipAddress || 'DHCP'}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>MAC ID</div><div style={{ fontWeight: '500', color: '#334155', fontFamily: 'monospace' }}>{asset.MAC_ID || asset.MAC_Id || asset.macId || 'N/A'}</div></div>
                </div>
              </div>

              {/* Location */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Deployment Location</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Site</div><div style={{ fontWeight: '500', color: '#334155' }}>{(asset.Location || asset.location || 'N/A')} &gt; {(asset.Sub_Location || asset.subLocation || 'N/A')}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Room</div><div style={{ fontWeight: '500', color: '#334155' }}>Flr {(asset.Floor || asset.floor || '-')} | {(asset.Room_Type || asset.roomType || 'N/A')}</div></div>
                  <div><div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Designation</div><div style={{ fontWeight: '500', color: '#334155' }}>{asset.Room_Name || asset.roomName || '-'}</div></div>
                </div>
              </div>

              {/* Status & Warranty */}
              <div>
                <h4 style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>Status & Warranty</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Asset Status</div>
                    <div>
                      <span style={{ 
                        background: (asset.Asset_Status || asset.assetStatus)?.toLowerCase() === 'active' ? '#dcfce7' : '#fee2e2', 
                        color: (asset.Asset_Status || asset.assetStatus)?.toLowerCase() === 'active' ? '#15803d' : '#b91c1c', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600' 
                      }}>
                        {asset.Asset_Status || asset.assetStatus || 'Active'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Warranty Start</div>
                    <div style={{ fontWeight: '500', color: '#334155' }}>
                      {(() => {
                        const start = asset.Warranty_Start_Date || asset.warrantyStartDate;
                        return start ? new Date(start).toLocaleDateString() : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Warranty End</div>
                    <div style={{ fontWeight: '500', color: '#334155' }}>
                      {(() => {
                        const end = asset.Warranty_End_Date || asset.warrantyEndDate;
                        return end ? new Date(end).toLocaleDateString() : 'N/A';
                      })()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>DLP Period</div>
                    <div style={{ fontWeight: '500', color: '#334155' }}>
                      {(() => {
                        const val = asset.DLP_Period || asset.dlpPeriod;
                        if (!val) return 'N/A';
                        if (typeof val === 'string' && (val.includes('-') || val.includes('T'))) {
                          try {
                            const d = new Date(val);
                            if (!isNaN(d.getTime())) {
                              return d.toLocaleDateString();
                            }
                          } catch(e) {}
                        }
                        return `${val} Months`;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>Days Left</div>
                    <div>
                      {(() => {
                        const days = asset.Warranty_Days_Left || asset.warrantyDaysLeft;
                        const isExpired = !(days > 0);
                        return (
                          <span style={{ 
                            background: !isExpired ? '#dcfce7' : '#fee2e2', 
                            color: !isExpired ? '#15803d' : '#b91c1c', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            fontSize: '0.75rem', 
                            fontWeight: '600' 
                          }}>
                            {!isExpired ? `${days} Days` : 'Expired'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {asset.supportType?.toLowerCase().includes('out') && (
              <div style={{ padding: '12px 24px', background: '#fffbeb', borderTop: '1px solid #fef3c7', color: '#b45309', fontSize: '0.85rem' }}>
                <strong>Attention:</strong> This hardware is currently <strong>Out of Support</strong>. New service requests may require quote approvals before engineer dispatch.
              </div>
            )}
          </div>

          {/* Form UI */}
          {successReference ? (
            /* --- ENTERPRISE SUCCESS CONFIRMATION --- */
            <div style={{ 
              marginTop: '32px',
              padding: '40px 24px', 
              background: '#ffffff', 
              borderRadius: '12px', 
              border: '1px solid #bbf7d0', // Subtle green border
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', 
              textAlign: 'center',
              animation: 'fadeIn 0.5s ease-out'
            }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                background: '#dcfce7', 
                borderRadius: '50%', 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                margin: '0 auto 20px auto' 
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              
              <h2 style={{ margin: '0 0 12px 0', color: '#064e3b', fontSize: '1.5rem', fontWeight: '700' }}>
                Service Request Logged
              </h2>
              <p style={{ color: '#475569', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
                Your support request has been securely routed to our engineering dispatch team. 
              </p>
              
              <div style={{ 
                display: 'inline-block', 
                background: '#f8fafc', 
                border: '1px dashed #cbd5e1', 
                padding: '12px 24px', 
                borderRadius: '8px' 
              }}>
                <span style={{ color: '#64748b', fontSize: '0.85rem', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Official Tracking Reference
                </span>
                <span style={{ color: '#0f172a', fontSize: '1.5rem', fontWeight: '800', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {successReference || 'INQ-PENDING'}
                </span>
              </div>
              
              <div style={{ marginTop: '32px' }}>
                <button 
                  onClick={() => window.location.reload()} 
                  style={{ background: '#f1f5f9', border: 'none', padding: '10px 20px', borderRadius: '6px', color: '#334155', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                  onMouseOver={(e) => e.target.style.background = '#e2e8f0'}
                  onMouseOut={(e) => e.target.style.background = '#f1f5f9'}
                >
                  Submit Another Request
                </button>
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
