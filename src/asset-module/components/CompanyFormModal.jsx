/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../../services/apiClient';
import './CompanyFormModal.css';

// UTILITY: Safely converts any valid date string into HTML input format (YYYY-MM-DD)
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  
  const str = String(dateString).trim();
  const parts = str.split(/[\/\-]/);
  
  if (parts.length === 3) {
    // Case 1: DD/MM/YYYY or D/M/YYYY
    if (parts[2].length === 4) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const year = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}`;
      }
    }
    // Case 2: YYYY-MM-DD or YYYY/MM/DD
    if (parts[0].length === 4) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // 0-indexed
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}`;
      }
    }
  }

  // Fallback to standard parsing for ISO strings, etc.
  const d = new Date(str);
  if (isNaN(d.getTime())) return ""; 
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};


export default function CompanyFormModal({ isOpen, onClose, onSave, initialData, companies = [] }) {
  const [formData, setFormData] = useState({
    refCode: '',
    companyName: '',
    clientLink: '',
    location: '',
    branch: '',
    supportType: 'Comprehensive AMC',
    amcStart: '',
    amcEnd: '',
    primaryContact: '',
    primaryPhone: '',
    primaryEmail: '',
    status: 'Active'
  });

  const [amcDuration, setAmcDuration] = useState('1 Year');
  const [isExistingParent, setIsExistingParent] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        refCode: initialData.Ref_Code || '',
        companyName: initialData.Company_Name || '',
        clientLink: initialData.ClientLink || '',
        location: initialData.Location || '',
        branch: initialData.Branch || '',
        supportType: initialData.Support_Type || 'Comprehensive AMC',
        amcStart: formatDateForInput(initialData.AMC_Start_Date),
        amcEnd: formatDateForInput(initialData.AMC_End_Date),
        primaryContact: initialData.Primary_Contact || '',
        primaryPhone: initialData.Primary_Phone || '',
        primaryEmail: initialData.Primary_Email || '',
        status: initialData.Status || 'Active'
      });
      setIsExistingParent(true);
      setAmcDuration('Custom'); // Default to Custom for existing entries
    } else {
      setFormData({
        refCode: '',
        companyName: '',
        clientLink: '',
        location: '',
        branch: '',
        supportType: 'Comprehensive AMC',
        amcStart: '',
        amcEnd: '',
        primaryContact: '',
        primaryPhone: '',
        primaryEmail: '',
        status: 'Active'
      });
      setIsExistingParent(false);
      setAmcDuration('1 Year'); // Default to 1 Year for new entries
    }
  }, [initialData, isOpen]);

  // Smart AMC Contract Math
  useEffect(() => {
    if (amcDuration !== 'Custom' && formData.amcStart) {
      const years = parseInt(amcDuration, 10);
      if (!isNaN(years)) {
        const startDate = new Date(formData.amcStart);
        startDate.setFullYear(startDate.getFullYear() + years);
        startDate.setDate(startDate.getDate() - 1); // Subtract 1 day
        setFormData(prev => ({
          ...prev,
          amcEnd: formatDateForInput(startDate)
        }));
      }
    }
  }, [formData.amcStart, amcDuration]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRefCodeChange = (e) => {
    const code = e.target.value.toUpperCase();
    
    // Check if this Ref_Code already exists in our grouped companies data
    const existingCompany = companies.find(c => String(c.Ref_Code || '').trim().toUpperCase() === code);
    
    if (existingCompany) {
      setIsExistingParent(true);
      setFormData(prev => ({
        ...prev,
        refCode: code,
        companyName: existingCompany.Company_Name || '',
        clientLink: existingCompany.ClientLink || ''
      }));
    } else {
      setIsExistingParent(false);
      setFormData(prev => ({ ...prev, refCode: code }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditMode = !!initialData; 
    
    const payload = {
      action: isEditMode ? "updateCompany" : "createCompany",
      Original_Branch: isEditMode ? initialData.Branch : "", 
      Ref_Code: formData.refCode,
      Company_Name: formData.companyName,
      Location: formData.location,
      Branch: formData.branch,
      Support_Type: formData.supportType || "Standard AMC",
      AMC_Start_Date: formData.amcStart || "",
      AMC_End_Date: formData.amcEnd || "",
      Primary_Contact: formData.primaryContact || "",
      Primary_Email: formData.primaryEmail || "",
      Primary_Phone: formData.primaryPhone || "",
      Status: formData.status || "Active",
      ClientLink: formData.clientLink || ""
    };
    
    try {
      let response;
      if (isEditMode) {
        response = await assetApi('updateCompany', payload);
      } else {
        response = await assetApi('createCompany', payload);
      }
      
      if (response && response.success) {
        onSave(payload);
      } else {
        throw new Error(response?.message || 'Backend rejected the operation.');
      }
    } catch (err) {
      console.error("Save/Update Company Failed. Payload Dump:", payload, "Error Detail:", err);
      window.alert(err.message || "Backend sync failed. Please verify the Google Sheet columns match the system schema exactly.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Company' : 'Add New Company'}</h2>
          <button type="button" className="icon-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
            
            {/* SECTION 1: Parent Identity */}
            <div style={{ marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>1. Parent Organization</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Ref Code <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    name="refCode" 
                    value={formData.refCode || ''} 
                    onChange={handleRefCodeChange} 
                    placeholder="e.g., AVD001_ZS" 
                    className="md3-input" 
                    disabled={!!initialData}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !!initialData ? '#f1f5f9' : '#fff' }} 
                    required 
                  />
                  {isExistingParent && !initialData && <small style={{ color: '#16a34a', display: 'block', marginTop: '4px', fontWeight: 'bold' }}>✓ Existing Company Found</small>}
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Company Name <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    name="companyName" 
                    value={formData.companyName || ''} 
                    onChange={handleChange} 
                    placeholder="Full Company Name" 
                    disabled={isExistingParent} 
                    className="md3-input" 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: isExistingParent ? '#f1f5f9' : '#fff' }} 
                    required 
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Client Portal URL</label>
                  <input 
                    type="url" 
                    name="clientLink" 
                    value={formData.clientLink || ''} 
                    onChange={handleChange} 
                    placeholder="https://..." 
                    disabled={isExistingParent} 
                    className="md3-input" 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: isExistingParent ? '#f1f5f9' : '#fff' }} 
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: Physical Branch */}
            <div style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>2. Branch Location</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>City / Location <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    name="location" 
                    value={formData.location || ''} 
                    onChange={handleChange} 
                    placeholder="e.g., Pune" 
                    className="md3-input" 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Specific Branch <span style={{color: 'red'}}>*</span></label>
                  <input 
                    type="text" 
                    name="branch" 
                    value={formData.branch || ''} 
                    onChange={handleChange} 
                    placeholder="e.g., Hinjewadi Phase 1" 
                    className="md3-input" 
                    disabled={!!initialData}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: !!initialData ? '#f1f5f9' : '#fff' }} 
                    required 
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Contract & Contact */}
            <div style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>3. SLA & Local Contact</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Support Tier</label>
                  <select 
                    name="supportType" 
                    value={formData.supportType || 'Comprehensive AMC'} 
                    onChange={handleChange} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Comprehensive AMC">Comprehensive AMC</option>
                    <option value="DLP">DLP</option>
                    <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
                    <option value="Warranty">Warranty</option>
                    <option value="Out Of Support">Out Of Support</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>AMC Duration</label>
                  <select 
                    value={amcDuration} 
                    onChange={(e) => setAmcDuration(e.target.value)} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="5 Years">5 Years</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Branch Status</label>
                  <select 
                    name="status" 
                    value={formData.status || 'Active'} 
                    onChange={handleChange} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>AMC Start Date</label>
                  <input 
                    type="date" 
                    name="amcStart" 
                    value={formData.amcStart || ''} 
                    onChange={handleChange} 
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} 
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>AMC End Date</label>
                  <input 
                    type="date" 
                    name="amcEnd" 
                    value={formData.amcEnd || ''} 
                    onChange={handleChange} 
                    readOnly={amcDuration !== 'Custom'}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1', background: amcDuration !== 'Custom' ? '#f1f5f9' : '#fff' }} 
                  />
                </div>
                <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', marginTop: '4px' }}>
                  <h5 style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#475569' }}>Local IT Contact Details</h5>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <input type="text" name="primaryContact" value={formData.primaryContact || ''} onChange={handleChange} placeholder="Contact Name" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    <input type="text" name="primaryPhone" value={formData.primaryPhone || ''} onChange={handleChange} placeholder="Phone Number" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                    <input type="email" name="primaryEmail" value={formData.primaryEmail || ''} onChange={handleChange} placeholder="Email Address" style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="modal-actions">
            <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-filled">Save Company</button>
          </div>
        </form>
      </div>
    </div>
  );
}
