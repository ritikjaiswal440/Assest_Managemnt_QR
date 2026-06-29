/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo } from 'react';
import { assetApi } from '../../services/apiClient';
import './AssetFormModal.css';

const formatDateToYYYYMMDD = (dateVal) => {
  if (!dateVal) return '';
  
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    
    // Check if it matches ISO/YYYY-MM-DD format (starts with YYYY-MM-DD)
    const yyyymmddRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
    const matchY = trimmed.match(yyyymmddRegex);
    if (matchY) {
      const year = matchY[1];
      const month = matchY[2].padStart(2, '0');
      const day = matchY[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Check if it matches DD-MM-YYYY or DD/MM/YYYY format
    const ddmmyyyyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;
    const matchD = trimmed.match(ddmmyyyyRegex);
    if (matchD) {
      const day = matchD[1].padStart(2, '0');
      const month = matchD[2].padStart(2, '0');
      const year = matchD[3];
      return `${year}-${month}-${day}`;
    }
  }

  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch (e) {
    console.error("Error parsing date:", dateVal, e);
  }
  
  return '';
};

const getDurationInMonths = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return 'Custom';
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Custom';
  
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;
  
  if (totalMonths === 12) return '12 Months';
  if (totalMonths === 24) return '24 Months';
  if (totalMonths === 36) return '36 Months';
  if (totalMonths === 60) return '60 Months';
  
  return 'Custom';
};

export default function AssetFormModal({ isOpen, onClose, onSave, initialData, companies: propCompanies }) {
  const [fetchedCompanies, setFetchedCompanies] = useState([]);
  const companies = propCompanies && propCompanies.length > 0 ? propCompanies : fetchedCompanies;

  // Flatten nested companies list for the selection mapping
  const flatCompaniesList = useMemo(() => {
    const list = [];
    if (companies && Array.isArray(companies)) {
      companies.forEach(parent => {
        if (parent.branches && Array.isArray(parent.branches) && parent.branches.length > 0) {
          parent.branches.forEach(branch => {
            list.push({
              Ref_Code: parent.Ref_Code,
              Company_Name: parent.Company_Name,
              ClientLink: parent.ClientLink,
              ...branch
            });
          });
        } else {
          list.push({
            Ref_Code: parent.Ref_Code || parent.id || '',
            Company_Name: parent.Company_Name || parent.name || '',
            ClientLink: parent.ClientLink || '',
            Location: parent.Location || '',
            Branch: parent.Branch || '',
            Support_Type: parent.Support_Type || 'Standard',
            AMC_Start_Date: parent.AMC_Start_Date || '',
            AMC_End_Date: parent.AMC_End_Date || '',
            Primary_Contact: parent.Primary_Contact || '',
            Primary_Email: parent.Primary_Email || '',
            Primary_Phone: parent.Primary_Phone || '',
            Status: parent.Status || 'Active'
          });
        }
      });
    }
    return list;
  }, [companies]);

  const defaultState = {
    id: '',
    refCode: '',
    companyName: '',
    branch: '',
    salesOrder: '',
    invoiceNo: '',
    location: '',
    subLocation: '',
    floor: '',
    roomType: '',
    roomName: '',
    productMake: '',
    productModel: '',
    productSerial: '',
    macId: '',
    ipAddress: '',
    assetStatus: 'Active',
    warrantyStartDate: '',
    dlpPeriod: '',
    dlpStart: '',
    dlpEnd: '',
    warrantyEndDate: '',
    warrantyDaysLeft: ''
  };

  const [formData, setFormData] = useState(defaultState);
  const [warrantyDuration, setWarrantyDuration] = useState('12 Months');
  const [availableBranches, setAvailableBranches] = useState([]);

  // Initialize the branch list when the modal opens in Edit Mode
  useEffect(() => {
    if (formData?.refCode && companies?.length > 0) {
      const parentCompany = companies.find(c => c.Ref_Code === formData.refCode);
      if (parentCompany) {
        setAvailableBranches(parentCompany.branches || []);
      }
    }
  }, [formData?.refCode, companies]);

  // Handler for when the Admin changes the Parent Company
  const handleCompanyChange = (e) => {
    const selectedRef = e.target.value;
    const parentCompany = companies.find(c => c.Ref_Code === selectedRef);

    if (parentCompany) {
      setAvailableBranches(parentCompany.branches || []);
      
      // Update the payload AND forcefully wipe the old branch data
      setFormData(prev => ({
        ...prev,
        refCode: parentCompany.Ref_Code,
        companyName: parentCompany.Company_Name,
        location: "", // Wipe old location
        branch: ""    // Wipe old branch
      }));
    }
  };

  // Handler for when the Admin selects the specific new Branch
  const handleBranchChange = (e) => {
    const selectedBranchName = e.target.value;
    const branchObj = availableBranches.find(b => b.Branch === selectedBranchName);
    
    if (branchObj) {
      setFormData(prev => ({
        ...prev,
        branch: branchObj.Branch,
        location: branchObj.Location
      }));
    }
  };

  useEffect(() => {
    if (initialData) {
      const mappedData = {
        id: initialData.Unique_Product_Id || initialData.UNIQUE_PRODUCT_ID || initialData.id || '',
        refCode: initialData.Ref_Code || initialData.REF_CODE || initialData.refCode || '',
        companyName: initialData.Company_Name || initialData.COMPANY_NAME || initialData.companyName || '',
        branch: initialData.Branch || initialData.branch || '',
        salesOrder: initialData.Sales_Order || initialData.SALES_ORDER || initialData.salesOrder || '',
        invoiceNo: initialData.Invoice_No || initialData.INVOICE_NO || initialData.invoiceNo || '',
        location: initialData.Location || initialData.LOCATION || initialData.location || '',
        subLocation: initialData.Sub_Location || initialData.SUB_LOCATION || initialData.subLocation || '',
        floor: initialData.Floor || initialData.floor || '',
        roomType: initialData.Room_Type || initialData.roomType || '',
        roomName: initialData.Room_Name || initialData.roomName || '',
        productMake: initialData.ProductMake || initialData.PRODUCTMAKE || initialData.productMake || '',
        productModel: initialData.ProductModel || initialData.PRODUCTMODEL || initialData.productModel || '',
        productSerial: initialData.ProductSerial || initialData.PRODUCTSERIAL || initialData.productSerial || '',
        macId: initialData.MAC_ID || initialData.macId || '',
        ipAddress: initialData.IP_Address || initialData.IP_ADDRESS || initialData.ipAddress || '',
        assetStatus: initialData.Asset_Status || initialData.ASSET_STATUS || initialData.assetStatus || 'Active',
        warrantyStartDate: formatDateToYYYYMMDD(initialData.Warranty_Start_Date || initialData.WARRANTY_START_DATE || initialData.warrantyStartDate),
        dlpPeriod: initialData.DLP_Period || initialData.dlpPeriod || '',
        dlpStart: formatDateToYYYYMMDD(initialData.DLP_Start_Date),
        dlpEnd: formatDateToYYYYMMDD(initialData.DLP_End_Date),
        warrantyEndDate: formatDateToYYYYMMDD(initialData.Warranty_End_Date || initialData.WARRANTY_END_DATE || initialData.warrantyEndDate),
        warrantyDaysLeft: initialData.Warranty_Days_Left || initialData.WARRANTY_DAYS_LEFT || initialData.warrantyDaysLeft || ''
      };
      setFormData(mappedData);
      const inferredDuration = getDurationInMonths(mappedData.warrantyStartDate, mappedData.warrantyEndDate);
      setWarrantyDuration(inferredDuration);
    } else {
      setFormData({
        ...defaultState,
        refCode: flatCompaniesList && flatCompaniesList.length > 0 ? (flatCompaniesList[0].Ref_Code || flatCompaniesList[0].id) : '',
        companyName: flatCompaniesList && flatCompaniesList.length > 0 ? (flatCompaniesList[0].Company_Name || flatCompaniesList[0].name) : '',
        branch: flatCompaniesList && flatCompaniesList.length > 0 ? flatCompaniesList[0].Branch : ''
      });
      setWarrantyDuration('12 Months');
    }
  }, [initialData, isOpen, flatCompaniesList]);

  useEffect(() => {
    let active = true;
    const fetchCompanies = async () => {
      try {
        const response = await assetApi('getCompanies');
        if (active && response && response.success) {
          setFetchedCompanies(response.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch companies for dropdown", err);
      }
    };
    if (isOpen && (!propCompanies || propCompanies.length === 0)) {
      fetchCompanies();
    }
    return () => { active = false; };
  }, [isOpen, propCompanies]);

  // Smart Warranty Math
  useEffect(() => {
    if (formData.warrantyStartDate) {
      let endFormatted = formData.warrantyEndDate;

      // Auto-calculate End Date if not Custom
      if (warrantyDuration !== 'Custom') {
        const months = parseInt(warrantyDuration, 10);
        if (!isNaN(months)) {
          const start = new Date(formData.warrantyStartDate);
          const end = new Date(start);
          end.setMonth(end.getMonth() + months);
          endFormatted = end.toISOString().split('T')[0];
        }
      }

      // Calculate Days Left based on End Date
      let diffDays = '';
      if (endFormatted) {
        const endDateObj = new Date(endFormatted);
        const today = new Date();
        const diffTime = endDateObj - today;
        diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Update state if anything changed
      if (endFormatted !== formData.warrantyEndDate || diffDays !== formData.warrantyDaysLeft) {
        setFormData(prev => ({
          ...prev,
          warrantyEndDate: endFormatted,
          warrantyDaysLeft: diffDays
        }));
      }
    }
  }, [formData.warrantyStartDate, warrantyDuration, formData.warrantyEndDate, formData.warrantyDaysLeft]);

  if (!isOpen) return null;

  // UTILITY: Adds X months to a given date and returns YYYY-MM-DD
  const calculateDLPEndDate = (startDateString, monthsToAdd) => {
    if (!startDateString || !monthsToAdd) return "";
    
    const date = new Date(startDateString);
    if (isNaN(date.getTime())) return ""; // Invalid date protection
    
    // Add the exact number of months
    date.setMonth(date.getMonth() + parseInt(monthsToAdd, 10));
    
    // Format back to strict HTML YYYY-MM-DD
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => {
      const updatedData = { ...prev, [name]: value };
      
      // --- SMART DLP AUTO-CALCULATOR ---
      if (name === 'dlpPeriod' || name === 'dlpStart') {
        const startDate = name === 'dlpStart' ? value : prev.dlpStart;
        const months = name === 'dlpPeriod' ? value : prev.dlpPeriod;
        
        // Auto-fill the end date in the background
        updatedData.dlpEnd = calculateDLPEndDate(startDate, months);
      }
      
      return updatedData;
    });
  };

  const handleDurationChange = (e) => {
    setWarrantyDuration(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      DLP_Start_Date: formData.dlpStart || "",
      DLP_Period: formData.dlpPeriod || "",
      DLP_End_Date: formData.dlpEnd || "",
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString()
    };
    onSave(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button type="button" className="icon-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body">
            
            {/* --- SMART REASSIGNMENT SECTION --- */}
            <div style={{ padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>
                Ownership & Deployment
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                
                {/* 1. Parent Company Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>
                    Parent Organization <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={formData.refCode || ''} 
                    onChange={handleCompanyChange} 
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff' }}
                  >
                    <option value="" disabled>-- Select Company --</option>
                    {companies?.map(company => (
                      <option key={company.Ref_Code} value={company.Ref_Code}>
                        {company.Ref_Code} — {company.Company_Name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Dependent Branch Selector */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>
                    Physical Branch <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select 
                    value={formData.branch || ''} 
                    onChange={handleBranchChange} 
                    required
                    disabled={!formData.refCode || availableBranches.length === 0}
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid #cbd5e1', 
                      background: (!formData.refCode || availableBranches.length === 0) ? '#f1f5f9' : '#ffffff',
                      cursor: (!formData.refCode || availableBranches.length === 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="" disabled>-- Select Location --</option>
                    {availableBranches.map((b, idx) => (
                      <option key={idx} value={b.Branch}>
                        {b.Location} — {b.Branch}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            </div>

            <div className="form-section">
              <h4>Order Info</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Sales Order</label>
                  <input type="text" name="salesOrder" value={formData.salesOrder || ''} onChange={handleChange} className="md3-input" />
                </div>
                <div className="form-group">
                  <label>Invoice No</label>
                  <input type="text" name="invoiceNo" value={formData.invoiceNo || ''} onChange={handleChange} className="md3-input" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Location Info</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Floor</label>
                  <input type="text" name="floor" value={formData.floor || ''} onChange={handleChange} className="md3-input" />
                </div>
                <div className="form-group">
                  <label>Room Type</label>
                  <input type="text" name="roomType" value={formData.roomType || ''} onChange={handleChange} className="md3-input" />
                </div>
                <div className="form-group">
                  <label>Room Name</label>
                  <input type="text" name="roomName" value={formData.roomName || ''} onChange={handleChange} className="md3-input" required />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Hardware Details</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Make</label>
                  <input type="text" name="productMake" value={formData.productMake || ''} onChange={handleChange} className="md3-input" required />
                </div>
                <div className="form-group">
                  <label>Model</label>
                  <input type="text" name="productModel" value={formData.productModel || ''} onChange={handleChange} className="md3-input" required />
                </div>
                <div className="form-group">
                  <label>Serial Number</label>
                  <input type="text" name="productSerial" value={formData.productSerial || ''} onChange={handleChange} className="md3-input" required />
                </div>
                <div className="form-group">
                  <label>MAC ID</label>
                  <input type="text" name="macId" value={formData.macId || ''} onChange={handleChange} className="md3-input" />
                </div>
                <div className="form-group">
                  <label>IP Address</label>
                  <input type="text" name="ipAddress" value={formData.ipAddress || ''} onChange={handleChange} className="md3-input" />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Lifecycle & Warranty</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Status</label>
                  <select name="assetStatus" value={formData.assetStatus} onChange={handleChange} className="md3-input">
                    <option value="Active">Active</option>
                    <option value="In_Repair">In Repair</option>
                    <option value="Transferred">Transferred</option>
                    <option value="Retired">Retired</option>
                    <option value="Replaced">Replaced</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '4px' }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#475569' }}>Defect Liability Period (DLP) Timeline</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>Start Date</label>
                      <input 
                        type="date" 
                        name="dlpStart" 
                        value={formData.dlpStart || ''} 
                        onChange={handleChange} 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px' }}>Duration (Months)</label>
                      <input 
                        type="number" 
                        name="dlpPeriod" 
                        value={formData.dlpPeriod || ''} 
                        onChange={handleChange} 
                        placeholder="e.g., 12"
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: '#0f172a' }}>Calculated End Date</label>
                      <input 
                        type="date" 
                        name="dlpEnd" 
                        value={formData.dlpEnd || ''} 
                        readOnly
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #94a3b8', background: '#e2e8f0', color: '#475569', cursor: 'not-allowed' }} 
                        title="This date is calculated automatically"
                      />
                    </div>

                  </div>
                </div>
                <div className="form-group">
                  <label>Warranty Start Date</label>
                  <input type="date" name="warrantyStartDate" value={formData.warrantyStartDate || ''} onChange={handleChange} className="md3-input" required />
                </div>
                <div className="form-group">
                  <label>Warranty Duration</label>
                  <select value={warrantyDuration} onChange={handleDurationChange} className="md3-input">
                    <option value="12 Months">12 Months (1 Year)</option>
                    <option value="24 Months">24 Months (2 Years)</option>
                    <option value="36 Months">36 Months (3 Years)</option>
                    <option value="60 Months">60 Months (5 Years)</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Warranty End Date</label>
                  <input 
                    type="date" 
                    name="warrantyEndDate" 
                    value={formData.warrantyEndDate || ''} 
                    onChange={handleChange}
                    className={`md3-input ${warrantyDuration !== 'Custom' ? 'read-only-input' : ''}`} 
                    readOnly={warrantyDuration !== 'Custom'} 
                  />
                </div>
                <div className="form-group">
                  <label>Days Left</label>
                  <input type="number" name="warrantyDaysLeft" value={formData.warrantyDaysLeft || ''} className="md3-input read-only-input" readOnly />
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-filled">Save Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
}
