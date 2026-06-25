/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validateRef, submitToIntakeQueue, fetchDropdownData } from '../services/apiClient';
import './TicketRequest.css';

const TicketRequest = () => {
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref') || '';

  // View States
  const [view, setView] = useState('auth'); // 'auth', 'form', 'success'
  const [serviceRequestId, setServiceRequestId] = useState(urlRef);
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });
  const [reqId, setReqId] = useState('');

  // Dropdown Master Data
  const [dropdownData, setDropdownData] = useState({ companies: [], assets: [] });
  const [companyAssets, setCompanyAssets] = useState([]);

  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [availableHardware, setAvailableHardware] = useState([]);

  // Form State variables
  const [reqBy, setReqBy] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [location, setLocation] = useState('');
  const [room, setRoom] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  
  // Hardware Products State array
  const [products, setProducts] = useState([
    {
      uniqueId: '',
      productMake: '',
      productModel: '',
      productSerial: '',
      salesOrder: '',
      invoiceNo: '',
      subLocation: '',
      roomType: '',
      floor: '',
      roomName: '',
      macId: '',
      ipAddress: '',
      warrantyStart: '',
      dlpPeriod: '',
      warrantyEnd: '',
      warrantyDays: '',
      assetStatus: 'Active',
      selectedAsset: null
    }
  ]);

  const asset = products[0]?.selectedAsset;

  // File Upload State
  const [attachment, setAttachment] = useState(null);
  const [fileName, setFileName] = useState('Attach Invoice, Image, or Document');

  // Load dropdown data on mount
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const response = await fetchDropdownData();
        if (response?.success && response?.data) {
          setDropdownData(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch dropdown datasets:", err);
      }
    };
    loadDropdowns();
  }, []);

  // Filter available hardware based on selected branch
  useEffect(() => {
    if (selectedBranch && companyAssets.length > 0) {
      const filtered = companyAssets.filter(a => 
        String(a.Branch || a.Sub_Location || '').trim().toLowerCase() === String(selectedBranch).trim().toLowerCase()
      );
      setAvailableHardware(filtered);
    } else {
      setAvailableHardware([]);
    }
  }, [selectedBranch, companyAssets]);

  const handleVerifyRefCode = async (enteredCode) => {
    if (!enteredCode) return;
    setIsVerifying(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_GAS_API_URL}?action=verifyRefCode&code=${enteredCode}`);
      const data = await response.json();
      
      if (data.success && data.branches && data.branches.length > 0) {
        setBranchOptions(data.branches);
        setCompanyAssets(data.assets || []); // <-- Store the fetched assets
        if (data.branches.length === 1) {
          // Auto-select if there is only one branch
          setSelectedBranch(data.branches[0].Branch);
        }
      } else {
        setBranchOptions([]);
        alert("Reference Code not found or has no active branches.");
      }
    } catch (error) {
      console.error("Verification failed", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearBranch = () => {
    setSelectedBranch("");
    setLocation("");
  };

  const handleAuth = useCallback(async (codeOverride = null) => {
    const codeToUse = codeOverride || serviceRequestId;
    if (!codeToUse.trim()) {
      setStatus({ loading: false, error: "Please enter a reference code." });
      return;
    }

    // Safety Lock: Ensure branch is selected if there are multiple branch options
    if (branchOptions.length > 1 && !selectedBranch) {
      setStatus({ loading: false, error: "You must select your specific branch location before submitting." });
      return;
    }

    setStatus({ loading: true, error: null });

    try {
      const response = await validateRef({ ref: codeToUse });
      if (response?.success) {
        setCompany(response?.data?.companyName || "Verified Client");
        
        // Filter assets by verified client code
        if (dropdownData.assets && dropdownData.assets.length > 0) {
          const filtered = dropdownData.assets.filter(asset => 
            String(asset.Company_Ref || '').trim().toLowerCase() === String(codeToUse).trim().toLowerCase()
          );
          if (filtered.length > 0) {
            setCompanyAssets(filtered);
          }
        }

        setView('form');
        setStatus({ loading: false, error: null });
      } else {
        setStatus({ loading: false, error: response?.message || "Invalid reference code." });
      }
    } catch {
      setStatus({ loading: false, error: "Network error. Please try again." });
    }
  }, [serviceRequestId, dropdownData.assets, branchOptions, selectedBranch]);

  // Auto-authenticate if URL has ?ref= and dropdown data is loaded
  useEffect(() => {
    if (urlRef && dropdownData.assets.length > 0) {
      handleAuth(urlRef);
    }
  }, [urlRef, dropdownData.assets, handleAuth]);

  const addProduct = () => {
    if (products.length >= 5) return;
    setProducts(prev => [
      ...prev,
      {
        uniqueId: '',
        productMake: '',
        productModel: '',
        productSerial: '',
        salesOrder: '',
        invoiceNo: '',
        subLocation: '',
        roomType: '',
        floor: '',
        roomName: '',
        macId: '',
        ipAddress: '',
        warrantyStart: '',
        dlpPeriod: '',
        warrantyEnd: '',
        warrantyDays: '',
        assetStatus: 'Active',
        selectedAsset: null
      }
    ]);
  };

  const removeProduct = (index) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index, field, value) => {
    setProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleProductAssetSelect = (index, assetRef) => {
    const selected = companyAssets.find(a => a.Asset_Ref === assetRef || a.Unique_Product_Id === assetRef);
    const updated = [...products];
    if (selected) {
      updated[index] = {
        ...updated[index],
        uniqueId: selected.Asset_Ref || selected.Unique_Product_Id,
        productMake: selected.Make || selected.ProductMake || '',
        productModel: selected.Model || selected.ProductModel || '',
        productSerial: selected.Serial_Number || selected.ProductSerial || '',
        salesOrder: selected.Sales_Order || '',
        invoiceNo: selected.Invoice_No || '',
        subLocation: selected.Branch || selected.Sub_Location || '',
        roomType: selected.Room_Type || '',
        floor: selected.Floor || '',
        roomName: selected.Room_Name || '',
        macId: selected.MAC_ID || '',
        ipAddress: selected.IP_Address || '',
        warrantyStart: selected.Warranty_Start_Date || '',
        dlpPeriod: selected.DLP_Period || '',
        warrantyEnd: selected.Warranty_End_Date || '',
        warrantyDays: selected.Warranty_Days_Left || '',
        assetStatus: selected.Asset_Status || 'Active',
        selectedAsset: selected
      };
      
      if (selected.Location) {
        setLocation(selected.Location);
      }
      if (selected.Room_Name) {
        setRoom(selected.Room_Name);
      }
    } else {
      updated[index] = {
        uniqueId: '',
        productMake: '',
        productModel: '',
        productSerial: '',
        salesOrder: '',
        invoiceNo: '',
        subLocation: '',
        roomType: '',
        floor: '',
        roomName: '',
        macId: '',
        ipAddress: '',
        warrantyStart: '',
        dlpPeriod: '',
        warrantyEnd: '',
        warrantyDays: '',
        assetStatus: 'Active',
        selectedAsset: null
      };
    }
    setProducts(updated);
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

  const submitForm = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });

    try {
      let base64String = "";
      if (attachment) {
        base64String = await toBase64(attachment);
      }

      const payload = {
        Source: "Manual",
        ref: serviceRequestId,
        refCode: serviceRequestId,
        Ref_Code: serviceRequestId,
        companyName: company,
        Company_Name: company,
        location: asset?.Location || location || "",
        Location: asset?.Location || location || "",
        Branch: asset?.Branch || selectedBranch || "",
        Sub_Location: asset?.Branch || selectedBranch || "",
        roomName: room,
        Room_Name: room,
        requesterName: reqBy,
        Requester_Name: reqBy,
        email: clientEmail,
        Client_Email: clientEmail,
        phoneNumber: phoneNumber,
        PhoneNumber: phoneNumber,
        category: category,
        Category: category,
        issueDescription: description,
        Issue_Description: description,
        
        Attachment_Base64: base64String,
        Attachment_Name: attachment ? attachment.name : "",
        Attachment_MimeType: attachment ? attachment.type : "",
        
        products: products.map(p => ({
          uniqueId: p.uniqueId || "Manual",
          uniqueProductId: p.uniqueId || "Manual",
          Unique_Product_Id: p.uniqueId || "Manual",
          salesOrder: p.salesOrder,
          Sales_Order: p.salesOrder,
          invoiceNo: p.invoiceNo,
          Invoice_No: p.invoiceNo,
          branch: p.subLocation || selectedBranch || "",
          Branch: p.subLocation || selectedBranch || "",
          subLocation: p.subLocation || selectedBranch || "",
          Sub_Location: p.subLocation || selectedBranch || "",
          roomType: p.roomType,
          Room_Type: p.roomType,
          floor: p.floor,
          Floor: p.floor,
          roomName: p.roomName,
          Room_Name: p.roomName,
          productMake: p.productMake,
          ProductMake: p.productMake,
          brand: p.productMake,
          productModel: p.productModel,
          ProductModel: p.productModel,
          model: p.productModel,
          productSerial: p.productSerial,
          ProductSerial: p.productSerial,
          serial: p.productSerial,
          macId: p.macId,
          MAC_ID: p.macId,
          ipAddress: p.ipAddress,
          IP_Address: p.ipAddress,
          warrantyStart: p.warrantyStart,
          Warranty_Start_Date: p.warrantyStart,
          dlpPeriod: p.dlpPeriod,
          DLP_Period: p.dlpPeriod,
          warrantyEnd: p.warrantyEnd,
          Warranty_End_Date: p.warrantyEnd,
          warrantyDays: p.warrantyDays,
          Warranty_Days_Left: p.warrantyDays,
          assetStatus: p.assetStatus,
          Asset_Status: p.assetStatus
        }))
      };

      const response = await submitToIntakeQueue(payload);
      if (response?.success) {
        setReqId(response?.data?.Intake_ID || response?.data?.requestId || 'Generated Successfully');
        setView('success');
      } else {
        alert("Error: " + (response?.message || "Unknown error during form submission"));
        setStatus({ loading: false, error: null });
      }
    } catch (err) {
      console.error(err);
      alert("Submission failed. Network layer blocked.");
      setStatus({ loading: false, error: null });
    }
  };

  if (view === 'success') {
    return (
      <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="success-logo-img" />
          <div className="success-icon">✓</div>
          <h2 style={{ fontSize: '28px', color: 'var(--slate-dark)', marginBottom: '10px' }}>Ticket Generated</h2>
          <p style={{ color: 'var(--slate-gray)', marginBottom: '30px' }}>Your service request has been logged successfully.</p>
          <div className="request-id-display">{reqId}</div>
          <button className="btn btn-outline mt-4" onClick={() => window.location.href = '/'} style={{ marginTop: '20px' }}>Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <main className="app-main">

        {/* Auth View */}
        {view === 'auth' && (
          <div className="card" id="authView">
            <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="auth-logo-img" />
            <h1>Welcome to ProSupport</h1>
            <p className="subtitle">Secure enterprise service request system.</p>
            <div className="input-group" style={{ marginBottom: '30px', width: '100%' }}>
              <label>Client Reference Code</label>
              <input
                type="text"
                value={serviceRequestId}
                onChange={(e) => setServiceRequestId(e.target.value)}
                onBlur={(e) => handleVerifyRefCode(e.target.value)}
                placeholder="e.g., A7K2L1"
                disabled={status.loading}
              />
              
              {/* --- SMART BRANCH SELECTOR (Only shows for manual entry with valid Ref_Code) --- */}
              {branchOptions.length > 1 && (
                <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>
                    Select Your Specific Location <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={selectedBranch} 
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #94a3b8', color: '#334155' }}
                  >
                    <option value="" disabled>-- Please choose your physical branch --</option>
                    {branchOptions.map((opt, idx) => (
                      <option key={idx} value={opt.Branch}>
                        {opt.Location} - {opt.Branch}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <button className="btn btn-primary" onClick={() => handleAuth()} disabled={status.loading}>
              {status.loading ? 'Authenticating...' : 'Authenticate & Continue'}
            </button>
            {status.error && <div className="error-text">{status.error}</div>}
          </div>
        )}

        {/* Main Form View */}
        {view === 'form' && (
          <div className="card" id="formView">
            <div className="form-header">
              <h2>Register Service Request</h2>
              <div className="company-display">Company: {company}</div>
            </div>

            <form onSubmit={submitForm}>
              <div className="section-title"><span>01.</span> General Information</div>
              <div className="grid-2">
                <div className="input-group">
                  <label>Requester Name <span className="req">*</span></label>
                  <input type="text" required value={reqBy} onChange={e => setReqBy(e.target.value)} disabled={status.loading} />
                </div>
                <div className="input-group">
                  <label>Phone Number <span className="req">*</span></label>
                  <input type="tel" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={status.loading} />
                </div>
                <div className="input-group">
                  <label>Client Email(s) - Comma separated <span className="req">*</span></label>
                  <input type="text" required value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="e.g., client1@example.com, client2@example.com" disabled={status.loading} />
                </div>
                {/* --- DYNAMIC LOCATION & BRANCH SELECTOR --- */}
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '8px' }}>
                    {asset?.Unique_Product_Id ? 'Location & Branch' : 'Select Your Branch'} <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  
                  {asset?.Unique_Product_Id ? (
                    /* READ-ONLY STATE: User scanned a QR code, so we know exactly where they are */
                    <div style={{ 
                      padding: '12px 16px', 
                      background: '#f1f5f9', 
                      border: '1px solid #e2e8f0', 
                      borderRadius: '6px', 
                      color: '#475569', 
                      fontSize: '0.9rem',
                      fontWeight: '500' 
                    }}>
                      {asset.Location || 'N/A'} {asset.Branch ? `— ${asset.Branch}` : ''}
                    </div>
                  ) : (
                    /* DROPDOWN STATE (MANUAL ENTRY) WITH RESET BUTTON */
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        value={selectedBranch} 
                        onChange={(e) => {
                          const branchVal = e.target.value;
                          setSelectedBranch(branchVal);
                          
                          const selectedOpt = branchOptions.find(b => b.Branch === branchVal);
                          if (selectedOpt) {
                            setLocation(selectedOpt.Location);
                          }
                        }}
                        required
                        style={{ 
                          flex: 1, 
                          padding: '12px 16px', 
                          borderRadius: '6px', 
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          fontSize: '0.9rem',
                          color: '#0f172a',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="" disabled>-- Choose Branch --</option>
                        {branchOptions.map((opt, idx) => (
                          <option key={idx} value={opt.Branch}>
                            {opt.Location} — {opt.Branch}
                          </option>
                        ))}
                      </select>

                      {/* CONDITIONAL RESET BUTTON */}
                      {selectedBranch && (
                        <button 
                          type="button" 
                          onClick={handleClearBranch}
                          title="Clear Selection"
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#fee2e2', 
                            color: '#ef4444', 
                            border: 'none', 
                            borderRadius: '6px', 
                            width: '42px',
                            height: '42px',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                          onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="input-group">
                  <label>Room Name <span className="req">*</span></label>
                  <input type="text" required value={room} onChange={e => setRoom(e.target.value)} disabled={status.loading} />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Category <span className="req">*</span></label>
                  <select required value={category} onChange={e => setCategory(e.target.value)} disabled={status.loading}>
                    <option value="">Select Category...</option>
                    <option>Hardware</option>
                    <option>Connectivity</option>
                    <option>Programming</option>
                    <option>Software</option>
                    <option>Network</option>
                  </select>
                </div>
              </div>

              <div className="input-group full-width mt-3">
                <label>Issue Description <span className="req">*</span></label>
                <textarea rows="4" required value={description} onChange={e => setDescription(e.target.value)} disabled={status.loading}></textarea>
              </div>

              <div className="section-title"><span>02.</span> Infrastructure Details</div>
              <span className="form-note">Note: Select pre-registered hardware from the registry or type details manually.</span>
              
              {products.map((prod, index) => (
                <div className="product-box" key={index}>
                  <div className="product-header">
                    <h4>Item Details #{index + 1}</h4>
                    {products.length > 1 && (
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => removeProduct(index)}
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="input-group" style={{ marginBottom: '15px' }}>
                    <label>Link Registered Hardware Asset</label>
                    <select 
                      value={prod.uniqueId} 
                      onChange={e => handleProductAssetSelect(index, e.target.value)}
                      disabled={status.loading}
                    >
                      <option value="">-- Custom / Manual Entry --</option>
                      {availableHardware.map((hw, idx) => (
                        <option key={idx} value={hw.Unique_Product_Id || hw.Asset_Ref}>
                          {hw.ProductMake || hw.Make} {hw.ProductModel || hw.Model} (S/N: {hw.ProductSerial || hw.Serial_Number || 'N/A'}) — {hw.Unique_Product_Id || hw.Asset_Ref}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Make *</label>
                      <input 
                        type="text" 
                        required 
                        value={prod.productMake} 
                        onChange={e => handleProductChange(index, 'productMake', e.target.value)} 
                        disabled={status.loading || !!prod.uniqueId} 
                      />
                    </div>
                    <div className="input-group">
                      <label>Model *</label>
                      <input 
                        type="text" 
                        required 
                        value={prod.productModel} 
                        onChange={e => handleProductChange(index, 'productModel', e.target.value)} 
                        disabled={status.loading || !!prod.uniqueId} 
                      />
                    </div>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Serial Number *</label>
                    <input 
                      type="text" 
                      required 
                      value={prod.productSerial} 
                      onChange={e => handleProductChange(index, 'productSerial', e.target.value)} 
                      placeholder="Write NA if unknown" 
                      disabled={status.loading || !!prod.uniqueId} 
                    />
                  </div>
                </div>
              ))}

              {products.length < 5 && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={addProduct}
                  style={{ marginBottom: '20px', borderStyle: 'dashed' }}
                >
                  ➕ Add Another Hardware Item
                </button>
              )}

              <div className="section-title"><span>03.</span> Attachments</div>
              <div className="upload-box">
                <label htmlFor="reqInvoice" className="upload-label">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <span style={{ color: attachment ? 'var(--brand-accent)' : 'var(--text-muted)', fontWeight: attachment ? 'bold' : 'normal' }}>{fileName}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>(PDF, JPG, PNG - Max limit: 5MB)</span>
                  </div>
                </label>
                <input type="file" id="reqInvoice" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={status.loading} />
              </div>

              <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={status.loading}>
                  {status.loading ? 'Processing...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketRequest;