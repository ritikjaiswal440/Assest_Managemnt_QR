/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi, updateCompany } from '../services/assetApi';
import './CompanyFormModal.css';

export default function CompanyFormModal({ isOpen, onClose, onSave, initialData }) {
  const defaultState = {
    Ref_Code: '',
    Company_Name: '',
    Location: '',
    Branch: '',
    Support_Type: 'Comprehensive AMC',
    AMC_Start_Date: '',
    AMC_End_Date: '',
    Primary_Contact: '',
    Primary_Email: '',
    Primary_Phone: '',
    Status: 'Active'
  };

  const [formData, setFormData] = useState(defaultState);
  const [amcDuration, setAmcDuration] = useState('1 Year');

  // Helper to safely format dates for input type="date"
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...defaultState,
        ...initialData,
        AMC_Start_Date: formatDateForInput(initialData.AMC_Start_Date),
        AMC_End_Date: formatDateForInput(initialData.AMC_End_Date)
      });
      setAmcDuration('Custom'); // Default to Custom for existing entries
    } else {
      setFormData(defaultState);
      setAmcDuration('1 Year'); // Default to 1 Year for new entries
    }
  }, [initialData, isOpen]);

  // Smart AMC Contract Math
  useEffect(() => {
    if (amcDuration !== 'Custom' && formData.AMC_Start_Date) {
      const years = parseInt(amcDuration, 10);
      if (!isNaN(years)) {
        const startDate = new Date(formData.AMC_Start_Date);
        startDate.setFullYear(startDate.getFullYear() + years);
        startDate.setDate(startDate.getDate() - 1); // Subtract 1 day
        setFormData(prev => ({
          ...prev,
          AMC_End_Date: formatDateForInput(startDate)
        }));
      }
    }
  }, [formData.AMC_Start_Date, amcDuration]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      Created_At: new Date().toISOString(),
      Status: formData.Status || 'Active'
    };
    
    try {
      if (initialData) {
        // Edit Mode: Construct Composite Key
        const originalKeys = {
          Ref_Code: initialData.Ref_Code,
          Company_Name: initialData.Company_Name,
          Branch: initialData.Branch
        };
        
        // Await the explicit update execution
        const response = await updateCompany(originalKeys, payload);
        if (response && response.success) {
          onSave(payload);
        } else {
          throw new Error(response?.message || 'Backend rejected the update operation.');
        }
      } else {
        // Create Mode
        const response = await assetApi('createCompany', payload);
        if (response && response.success) {
          onSave(payload); 
        } else {
          throw new Error(response?.message || 'Backend rejected the save operation.');
        }
      }
    } catch (err) {
      // Robust Error Handling & Diagnostics
      console.error("Save/Update Company Failed. Payload Dump:", payload, "Error Detail:", err);
      window.alert("Backend sync failed. Please verify the Google Sheet columns match the system schema exactly.");
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
          <div className="modal-body">
            
            <div className="form-section">
              <h4>Branch Identity</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Ref Code</label>
                  <input 
                    type="text" 
                    name="Ref_Code" 
                    value={formData.Ref_Code || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                    required 
                    readOnly={!!initialData}
                    style={initialData ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="form-group">
                  <label>Company Name</label>
                  <input 
                    type="text" 
                    name="Company_Name" 
                    value={formData.Company_Name || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                    required 
                    readOnly={!!initialData}
                    style={initialData ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                  />
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input 
                    type="text" 
                    name="Location" 
                    value={formData.Location || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Branch</label>
                  <input 
                    type="text" 
                    name="Branch" 
                    value={formData.Branch || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                    required 
                    readOnly={!!initialData}
                    style={initialData ? { backgroundColor: '#f0f0f0', cursor: 'not-allowed' } : {}}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Contract Details</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Support Type</label>
                  <select 
                    name="Support_Type" 
                    value={formData.Support_Type || 'Comprehensive AMC'} 
                    onChange={handleChange}
                    className="md3-input"
                  >
                    <option value="Comprehensive AMC">Comprehensive AMC</option>
                    <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
                    <option value="Warranty">Warranty</option>
                    <option value="Out Of Support">Out Of Support</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>AMC Duration</label>
                  <select 
                    value={amcDuration} 
                    onChange={(e) => setAmcDuration(e.target.value)}
                    className="md3-input"
                  >
                    <option value="1 Year">1 Year</option>
                    <option value="2 Years">2 Years</option>
                    <option value="3 Years">3 Years</option>
                    <option value="5 Years">5 Years</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>AMC Start Date</label>
                  <input 
                    type="date" 
                    name="AMC_Start_Date" 
                    value={formData.AMC_Start_Date || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                  />
                </div>
                <div className="form-group">
                  <label>AMC End Date</label>
                  <input 
                    type="date" 
                    name="AMC_End_Date" 
                    value={formData.AMC_End_Date || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                    readOnly={amcDuration !== 'Custom'}
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Contact Info</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Primary Contact</label>
                  <input 
                    type="text" 
                    name="Primary_Contact" 
                    value={formData.Primary_Contact || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                  />
                </div>
                <div className="form-group">
                  <label>Primary Email</label>
                  <input 
                    type="email" 
                    name="Primary_Email" 
                    value={formData.Primary_Email || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                  />
                </div>
                <div className="form-group">
                  <label>Primary Phone</label>
                  <input 
                    type="text" 
                    name="Primary_Phone" 
                    value={formData.Primary_Phone || ''} 
                    onChange={handleChange} 
                    className="md3-input"
                  />
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
