/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { createMasterTicket, fetchEngineers, fetchCompanies, fetchAssets } from '../services/apiClient';

const initialState = {
  serviceRequestId: '',
  manualIntakeRef: '',
  refCode: '',
  company: '',
  clientEmail: '',
  phoneNumber: '',
  salesOrder: '',
  clientId: '',
  location: '',
  branch: '',
  roomName: '',
  room: '',
  reqBy: '',
  category: '',
  issueType: '',
  otherIssue: '',
  productMake: '',
  productModel: '',
  productSerial: '',
  macId: '',
  ipAddress: '',
  warrantyEnd: '',
  attachmentUrl: '',
  serviceType: '',
  description: '',
  engineerData: '',
  instructions: '',
  uniqueId: '',
  floor: '',
  roomType: '',
  warrantyStart: '',
  dlpPeriod: '',
  warrantyDays: '',
  assetStatus: 'Active'
};

const CreateTicketModal = ({ isOpen, onClose, clients = [], engineers = [], currentUser, onSuccess, initialData }) => {
  // 1. ALL HOOKS MUST BE AT THE VERY TOP
  const [formData, setFormData] = useState(initialState);
  const [status, setStatus] = useState({ loading: false, error: null });
  const [engineersList, setEngineersList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [assetsList, setAssetsList] = useState([]);

  // 2. Add this useEffect to pre-fill the form if initialData exists
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const defaultMake = initialData.ProductMake || initialData.productMake || initialData.brand || '';
        const defaultModel = initialData.ProductModel || initialData.productModel || initialData.model || '';
        const defaultSerial = initialData.ProductSerial || initialData.productSerial || initialData.serial || '';
        const defaultUniqueId = initialData.Unique_Product_Id || initialData.uniqueId || '';

        const invoicePart = initialData?.invoiceUrl ? `\n\nSee Attached Client File: ${initialData.invoiceUrl}` : '';

        // Pre-fill the form with the client's raw request data
        setFormData(prev => ({
          ...prev,
          serviceRequestId: initialData?.requestId || initialData?.Intake_ID || '',
          manualIntakeRef: initialData?.requestId || initialData?.Intake_ID || '',
          refCode: initialData?.Ref_Code || initialData?.Company_Ref || initialData?.refCode || '',
          company: initialData?.companyName || initialData?.Company_Name || '',
          clientEmail: initialData?.Client_Email || initialData?.email || '',
          reqBy: initialData?.Requester_Name || initialData?.requesterName || '',
          phoneNumber: initialData?.PhoneNumber || initialData?.phoneNumber || '',
          location: initialData?.Location || initialData?.location || '',
          branch: initialData?.Branch || initialData?.Sub_Location || initialData?.subLocation || '',
          roomName: initialData?.Room_Name || initialData?.roomName || initialData?.room || '',
          room: initialData?.Room_Name || initialData?.roomName || initialData?.room || '',
          category: initialData?.Category || initialData?.category || '',
          issueType: initialData?.Issue_Type || initialData?.issueType || '',
          serviceType: initialData?.Type_of_Service || initialData?.serviceType || '',
          salesOrder: initialData?.Sales_Order || initialData?.salesOrder || '',
          description: `${initialData?.Issue_Description || initialData?.description || ''}${invoicePart}`,
          productMake: defaultMake,
          productModel: defaultModel,
          productSerial: defaultSerial,
          instructions: '',
          uniqueId: defaultUniqueId,
          floor: initialData?.Floor || initialData?.floor || '',
          roomType: initialData?.Room_Type || initialData?.roomType || '',
          warrantyStart: initialData?.Warranty_Start_Date || initialData?.warrantyStart || '',
          dlpPeriod: initialData?.DLP_Period || initialData?.dlpPeriod || '',
          warrantyDays: initialData?.Warranty_Days_Left || initialData?.warrantyDays || '',
          assetStatus: initialData?.Asset_Status || initialData?.assetStatus || initialData?.Active || 'Active',
          macId: initialData?.MAC_ID || initialData?.macId || '',
          ipAddress: initialData?.IP_Address || initialData?.ipAddress || '',
          warrantyEnd: initialData?.Warranty_End_Date || initialData?.warrantyEnd || '',
          attachmentUrl: initialData?.Attachment_URL || initialData?.attachmentUrl || "",
        }));
      } else {
        setFormData(initialState); // Clean slate for manual creation
      }
      setStatus({ loading: false, error: null });
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const loadEngineers = async () => {
      try {
        const res = await fetchEngineers();
        if (res && res.data) {
          setEngineersList(res.data);
        }
      } catch (error) {
        console.error("Failed to load engineers:", error);
      }
    };
    const loadCompanies = async () => {
      try {
        const res = await fetchCompanies();
        if (res && res.data) {
          setCompaniesList(res.data);
        }
      } catch (error) {
        console.error("Failed to load companies:", error);
      }
    };
    const loadAssets = async () => {
      try {
        const res = await fetchAssets();
        if (res && res.data) {
          console.log("DEBUG - Loaded Master Assets Payload:", res.data);
          setAssetsList(res.data);
        }
      } catch (error) {
        console.error("Failed to load assets:", error);
      }
    };
    if (isOpen) {
      loadEngineers();
      loadCompanies();
      loadAssets();
    }
  }, [isOpen]);

  // 3. Escape key closure & basic focus trap support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Do not render if the modal is closed
  if (!isOpen) return null;

  // 2. Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const normalizeCompanyName = (name) => {
    if (!name) return "";
    return String(name)
      .toLowerCase()
      .replace(/\b(private|limited|pvt|ltd|llp|inc|co)\b/gi, "")
      .replace(/[^a-z0-9]/gi, "");
  };

  const filteredAssets = (assetsList || []).filter(asset => {
    if (!formData.company) return false;
    
    const selectedClean = normalizeCompanyName(formData.company);
    const assetCompanyClean = normalizeCompanyName(asset.Company_Name || asset.companyName || asset.company || "");
    
    // 1. Cleaned name exact or substring match
    if (selectedClean && assetCompanyClean && (assetCompanyClean.includes(selectedClean) || selectedClean.includes(assetCompanyClean))) {
      return true;
    }
    
    // 2. Standard includes check on stringified asset
    const selectedCompanyStr = String(formData.company).trim().toLowerCase();
    const rowDataString = JSON.stringify(asset).toLowerCase();
    if (rowDataString.includes(selectedCompanyStr)) {
      return true;
    }

    // 3. Fallback: Split selected company by space and search for any token of length >= 2 (excluding common terms)
    const tokens = String(formData.company)
      .toLowerCase()
      .split(/[\s\._,-]+/)
      .filter(t => t.length >= 2 && !['pvt', 'ltd', 'private', 'limited', 'llp', 'inc', 'corp', 'corporation', 'india', 'pvt.', 'ltd.', 'co', 'in'].includes(t));
      
    if (tokens.length > 0) {
      const assetStringLower = rowDataString.toLowerCase();
      // If ALL token words match anywhere in the asset data, include it!
      const allTokensMatch = tokens.every(token => assetStringLower.includes(token));
      if (allTokensMatch) return true;
    }

    return false;
  });

  const handleAssetSelect = (e) => {
    const selectedId = e.target.value;
    const asset = assetsList.find(a => 
      String(a.Unique_Product_Id || a.Unique_Product_ID || a.Asset_ID || a.assetId || '').trim() === String(selectedId).trim()
    );

    if (asset) {
      setFormData(prev => ({
        ...prev,
        uniqueId: selectedId,
        location: asset.Location || asset.location || prev.location || "",
        branch: asset.Branch || asset.Sub_Location || asset.subLocation || prev.branch || "",
        floor: asset.Floor || asset.floor || prev.floor || "",
        roomType: asset.Room_Type || asset.roomType || prev.roomType || "",
        roomName: asset.Room_Name || asset.roomName || asset.room || prev.roomName || "",
        productMake: asset.ProductMake || asset.productMake || asset.make || prev.productMake || "",
        productModel: asset.ProductModel || asset.productModel || asset.model || prev.productModel || "",
        productSerial: asset.ProductSerial || asset.productSerial || asset.serial || prev.productSerial || "",
        macId: asset.MAC_ID || asset.macId || asset.mac || prev.macId || "",
        ipAddress: asset.IP_Address || asset.ipAddress || asset.ip || prev.ipAddress || "",
        salesOrder: asset.Sales_Order || asset.salesOrder || prev.salesOrder || "",
        warrantyStart: asset.Warranty_Start_Date || asset.warrantyStartDate || asset.warrantyStart || prev.warrantyStart || "",
        dlpPeriod: asset.DLP_Period || asset.dlpPeriod || prev.dlpPeriod || "",
        warrantyEnd: asset.Warranty_End_Date || asset.warrantyEndDate || asset.warrantyEnd || prev.warrantyEnd || "",
        warrantyDays: asset.Warranty_Days_Left || asset.warrantyDaysLeft || asset.warrantyDays || prev.warrantyDays || "",
        assetStatus: asset.Asset_Status || asset.assetStatus || asset.Active || prev.assetStatus || "Active",
        serviceRequestId: asset.Ref_Code || asset.refCode || prev.serviceRequestId || ""
      }));
    } else {
      setFormData(prev => ({ ...prev, uniqueId: selectedId }));
    }
  };

  // 3. Form Submission Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });

    // Parse the optional engineer dropdown
    let engEmail = '', engName = '', engRole = '';
    if (formData.engineerData) {
      const parts = formData.engineerData.split('|');
      engEmail = parts[0] || '';
      engName = parts[1] || '';
      engRole = parts[2] || '';
    }

    const payload = {
      actorEmail: currentUser?.email || '',
      ticketData: {
        Intake_ID_Ref: initialData?.Intake_ID || initialData?.Intake_ID_Ref || formData.serviceRequestId || "MANUAL_ENTRY",
        Ref_Code: formData.serviceRequestId || formData.refCode || "",
        Company_Name: formData.company || "",
        Requester_Name: formData.reqBy || "",
        Client_Email: formData.clientEmail || "",
        PhoneNumber: formData.phoneNumber || "",
        Location: formData.location || "",
        Branch: formData.branch || "",
        Sub_Location: formData.branch || "", // fallback compatibility
        Room_Name: formData.roomName || "",
        ProductMake: formData.productMake || "",
        ProductModel: formData.productModel || "",
        ProductSerial: formData.productSerial || "",
        MAC_ID: formData.macId || "",
        IP_Address: formData.ipAddress || "",
        Sales_Order: formData.salesOrder || "",
        Warranty_End_Date: formData.warrantyEnd || "",
        Category: formData.category || "",
        Attachment_URL: formData.attachmentUrl || "",
        Service_Type: formData.serviceType || "General",
        Admin_Remarks: `[${formData.category || 'General'} - ${formData.issueType || 'Issue'}] ${formData.description || ''}`,
        Unique_Product_Id: formData.uniqueId || "",
        Floor: formData.floor || "",
        Room_Type: formData.roomType || "",
        Warranty_Start_Date: formData.warrantyStart || "",
        DLP_Period: formData.dlpPeriod || "",
        Warranty_Days_Left: formData.warrantyDays || "",
        Asset_Status: formData.assetStatus || "Active",
        Issue_Type: formData.issueType === 'Other' ? (formData.otherIssue || 'Other') : (formData.issueType || "")
      },
      engineer: {
        email: engEmail || null,
        name: engName || null,
        role: engRole || null,
        instructions: formData.instructions || ""
      }
    };

    try {
      const response = await createMasterTicket(payload);
      
      if (response?.success) {
        setFormData(initialState); // Reset form
        onSuccess();               // Trigger Dashboard refresh
        onClose();                 // Hide Modal
      } else {
        setStatus({ loading: false, error: response?.message || 'Error occurred.' });
      }
    } catch {
      setStatus({ loading: false, error: "Network communication failure." });
    }
  };

  const clientsArray = Array.isArray(clients) ? clients : [];
  const engineersArray = Array.isArray(engineers) ? engineers : [];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create Master Incident Ticket</h2>
          <button className="close-btn" aria-label="Close modal" onClick={onClose} disabled={status.loading}>&times;</button>
        </div>

        {status.error && <div className="error-banner">{status.error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-grid">
            {/* --- Core Details --- */}
            <div className="form-group span-2">
              <label>SR Reference / Intake ID (Optional)</label>
              <input 
                type="text" 
                name="manualIntakeRef" 
                value={formData.manualIntakeRef || ''} 
                onChange={(e) => setFormData({...formData, manualIntakeRef: e.target.value})} 
                placeholder="e.g., INQ-001 (Leave blank for MANUAL_ENTRY)" 
                disabled={status.loading || !!initialData} 
              />
            </div>

            <div className="form-group">
              <label>Client / Company Name *</label>
              <select name="company" value={formData.company} onChange={handleChange} required disabled={status.loading}>
                <option value="">Select Client...</option>
                {companiesList.map((companyName, i) => (
                  <option key={`comp-${i}`} value={companyName}>{companyName}</option>
                ))}
                {/* Fallback to retain initialData company if not in list */}
                {formData.company && !companiesList.includes(formData.company) && (
                  <option value={formData.company}>{formData.company}</option>
                )}
              </select>
            </div>

            <div className="form-group span-2">
              <label>Select Device / Asset</label>
              <select 
                value={formData.uniqueId || ""} 
                onChange={handleAssetSelect}
                disabled={!formData.company}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: '#ffffff', fontSize: '0.95rem' }}
              >
                <option value="">-- Choose Asset to Auto-Fill Data --</option>
                {filteredAssets.map((a, idx) => (
                  <option key={idx} value={a.Unique_Product_Id || a.Unique_Product_ID || a.Asset_ID}>
                    {a.Unique_Product_Id || a.Unique_Product_ID || a.Asset_ID} - {a.ProductMake || a.productMake || ''} {a.ProductModel || a.productModel || ''} ({a.Room_Name || a.roomName || 'No Room'})
                  </option>
                ))}
              </select>
            </div>

            {formData.uniqueId && (
              <div className="auto-fill-preview" style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '12px', 
                marginTop: '15px', 
                marginBottom: '15px',
                padding: '15px', 
                backgroundColor: 'var(--slate-light)', 
                border: '1px dashed var(--slate-border)', 
                borderRadius: 'var(--radius-md)',
                gridColumn: '1 / -1'
              }}>
                <div style={{ gridColumn: '1 / -1', fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary-deep)', marginBottom: '5px' }}>
                  ✓ Asset Data Auto-Linked
                </div>

                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Make & Model</label>
                  <input type="text" className="form-control form-control-sm" disabled value={`${formData.productMake || ''} ${formData.productModel || ''}`} style={{ backgroundColor: '#f1f3f4', width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Serial Number</label>
                  <input type="text" className="form-control form-control-sm" disabled value={formData.productSerial || ''} style={{ backgroundColor: '#f1f3f4', width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Location / Room</label>
                  <input type="text" className="form-control form-control-sm" disabled value={`${formData.floor || ''} - ${formData.roomName || ''}`} style={{ backgroundColor: '#f1f3f4', width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Network (IP / MAC)</label>
                  <input type="text" className="form-control form-control-sm" disabled value={`${formData.ipAddress || 'N/A'} / ${formData.macId || 'N/A'}`} style={{ backgroundColor: '#f1f3f4', width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Warranty Status</label>
                  <input type="text" className="form-control form-control-sm" disabled value={`${formData.assetStatus || ''} (Ends: ${formData.warrantyEnd || 'N/A'})`} style={{ backgroundColor: '#f1f3f4', width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Days Left</label>
                  <input type="text" className="form-control form-control-sm" disabled value={formData.warrantyDays || ''} style={{ backgroundColor: '#f1f3f4', width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Client Email(s) - Comma separated</label>
              <input type="text" name="clientEmail" value={formData.clientEmail} onChange={handleChange} placeholder="client1@example.com, client2@example.com" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Requested By (Contact Name)</label>
              <input 
                type="text" 
                name="reqBy" 
                value={formData.reqBy} 
                onChange={handleChange} 
                placeholder="e.g., John Smith" 
                disabled={status.loading}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input 
                type="tel" 
                name="phoneNumber" 
                value={formData.phoneNumber} 
                onChange={handleChange} 
                placeholder="e.g., +1 234 567 890" 
                disabled={status.loading}
              />
            </div>

            <div className="form-group">
              <label>Location (Site) *</label>
              <input type="text" name="location" value={formData.location} onChange={handleChange} required disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Branch</label>
              <input type="text" name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Block A" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Floor</label>
              <input type="text" name="floor" value={formData.floor} onChange={handleChange} placeholder="e.g. 1st Floor" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Room Type</label>
              <input type="text" name="roomType" value={formData.roomType} onChange={handleChange} placeholder="e.g. Boardroom" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Room Name</label>
              <input type="text" name="roomName" value={formData.roomName} onChange={handleChange} placeholder="e.g. Room 101" disabled={status.loading} />
            </div>

            {/* --- Technical Details --- */}
            <div className="form-group">
              <label>Category *</label>
              <select name="category" value={formData.category || ''} onChange={handleChange} required disabled={status.loading}>
                <option value="">Select...</option>
                <option>Hardware</option>
                <option>Connectivity</option>
                <option>Programming</option>
                <option>Software</option>
                <option>Network</option>
              </select>
            </div>

            <div className="form-group">
              <label>Issue Type *</label>
              <select name="issueType" value={formData.issueType || ''} onChange={handleChange} required disabled={status.loading}>
                <option value="">Select...</option>
                <option>Audio</option>
                <option>Video</option>
                <option>Display</option>
                <option>Programming</option>
                <option>Configuration / Firmware update</option>
                <option>Connectivity</option>
                <option>Event / Meeting Support</option>
                <option value="Other">Other Issues</option>
              </select>
            </div>

            <div className="form-group">
              <label>Type of Service</label>
              <select name="serviceType" value={formData.serviceType || ''} onChange={handleChange} disabled={status.loading}>
                <option value="">Select...</option>
                <option>DLP</option>
                <option>OEM- Warranty</option>
                <option>Out of Warranty</option>
                <option>C-AMC</option>
                <option>NC- AMC</option>
              </select>
            </div>

            {formData.issueType === 'Other' && (
              <div className="form-group span-2">
                <label>Specify Other Issue</label>
                <input type="text" name="otherIssue" value={formData.otherIssue} onChange={handleChange} required disabled={status.loading} />
              </div>
            )}
            <div className="form-group">
              <label>Sales Order Reference</label>
              <input 
                type="text" 
                name="salesOrder" 
                value={formData.salesOrder} 
                onChange={handleChange} 
                placeholder="e.g., SO-9921" 
                disabled={status.loading}
              />
            </div>
            {/* --- Equipment Tracking --- */}
            <div className="form-group">
              <label>Make / Model</label>
              <div style={{display:'flex', gap:'10px'}}>
                <input type="text" name="productMake" placeholder="Make" value={formData.productMake} onChange={handleChange} style={{flex:1}} disabled={status.loading} />
                <input type="text" name="productModel" placeholder="Model" value={formData.productModel} onChange={handleChange} style={{flex:1}} disabled={status.loading} />
              </div>
            </div>

            <div className="form-group">
              <label>Serial Number</label>
              <input type="text" name="productSerial" value={formData.productSerial} onChange={handleChange} disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Unique Product ID</label>
              <input type="text" name="uniqueId" value={formData.uniqueId} onChange={handleChange} placeholder="e.g. UID-10293" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>MAC ID</label>
              <input type="text" name="macId" value={formData.macId} onChange={handleChange} placeholder="e.g. 00:0a:95:9d:68:16" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>IP Address</label>
              <input type="text" name="ipAddress" value={formData.ipAddress} onChange={handleChange} placeholder="e.g. 192.168.1.50" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Warranty End Date</label>
              <input type="text" name="warrantyEnd" value={formData.warrantyEnd} onChange={handleChange} placeholder="YYYY-MM-DD" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Attachment URL</label>
              <input 
                type="text" 
                name="attachmentUrl" 
                value={formData.attachmentUrl || ''} 
                onChange={handleChange} 
                placeholder="https://..." 
                disabled={status.loading} 
              />
            </div>

            {/* --- Warranty Details --- */}
            <div className="section-divider span-2">
              <h4>Warranty & Asset Status</h4>
            </div>

            <div className="form-group">
              <label>Warranty Start Date</label>
              <input type="text" name="warrantyStart" value={formData.warrantyStart} onChange={handleChange} placeholder="YYYY-MM-DD" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>DLP Period</label>
              <input type="text" name="dlpPeriod" value={formData.dlpPeriod} onChange={handleChange} placeholder="e.g. 1 Year" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Warranty Days Left</label>
              <input type="text" name="warrantyDays" value={formData.warrantyDays} onChange={handleChange} placeholder="e.g. 365" disabled={status.loading} />
            </div>

            <div className="form-group">
              <label>Asset Status</label>
              <select name="assetStatus" value={formData.assetStatus} onChange={handleChange} disabled={status.loading}>
                <option value="Active">Active</option>
                <option value="In Stock">In Stock</option>
                <option value="Under Service">Under Service</option>
                <option value="Scrapped">Scrapped</option>
              </select>
            </div>

            <div className="form-group span-2">
              <label>Detailed Incident Description *</label>
              <textarea name="description" rows="3" value={formData.description} onChange={handleChange} required disabled={status.loading}></textarea>
            </div>

            {/* --- Optional Instant Assignment --- */}
            <div className="section-divider span-2">
              <h4>Instant Engineer Deployment (Optional)</h4>
            </div>

            <div className="form-group">
              <label>Allocate Engineer</label>
              <select name="engineerData" value={formData.engineerData} onChange={handleChange} disabled={status.loading}>
                <option value="">Do not assign yet...</option>
                {engineersList.map((eng, i) => {
                  if (!eng) return null;
                  const engEmail = eng.Email || eng.email || '';
                  const engName = eng.Name || eng.name || '';
                  const engRole = eng.Role || eng.role || '';
                  return (
                    <option key={i} value={`${engEmail}|${engName}|${engRole}`}>
                      {engName} ({engRole})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>Direct Instructions</label>
              <input type="text" name="instructions" value={formData.instructions} onChange={handleChange} placeholder="Task directives..." disabled={status.loading} />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={status.loading}>Cancel</button>
            <button type="submit" className="btn btn-success" disabled={status.loading}>
              {status.loading ? 'Creating Master Ticket...' : 'Create Master Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;