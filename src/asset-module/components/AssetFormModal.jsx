/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../services/assetApi';
import './CompanyFormModal.css';
import './AssetFormModal.css';

export default function AssetFormModal({ isOpen, onClose, onSave, initialData, companies: propCompanies }) {
  const [fetchedCompanies, setFetchedCompanies] = useState([]);
  const companies = propCompanies && propCompanies.length > 0 ? propCompanies : fetchedCompanies;

  const defaultState = {
    id: '',
    refCode: '',
    companyName: '',
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
    dlpPeriod: '12 Months',
    warrantyEndDate: '',
    warrantyDaysLeft: ''
  };

  const [formData, setFormData] = useState(defaultState);

  useEffect(() => {
    if (initialData) {
      setFormData({ ...defaultState, ...initialData });
    } else {
      setFormData({
        ...defaultState,
        refCode: companies && companies.length > 0 ? companies[0].id : '',
        companyName: companies && companies.length > 0 ? companies[0].name : ''
      });
    }
  }, [initialData, isOpen, companies]);

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

  // Smart Auto-Calculation for Warranty
  useEffect(() => {
    if (formData.warrantyStartDate && formData.dlpPeriod) {
      const months = parseInt(formData.dlpPeriod, 10);
      if (!isNaN(months)) {
        const start = new Date(formData.warrantyStartDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        
        const endFormatted = end.toISOString().split('T')[0];
        
        const today = new Date();
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setFormData(prev => ({
          ...prev,
          warrantyEndDate: endFormatted,
          warrantyDaysLeft: diffDays
        }));
      }
    }
  }, [formData.warrantyStartDate, formData.dlpPeriod]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Company & Ref_Code Sync
    if (name === 'refCode') {
      const selectedCompany = companies.find(c => c.id === value);
      setFormData(prev => ({
        ...prev,
        refCode: value,
        companyName: selectedCompany ? selectedCompany.name : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString()
    };
    onSave(payload);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content md3-surface large-modal">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button type="button" className="icon-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="md3-form">
          <div className="form-grid">
            {/* Order Info */}
            <div className="form-section">
              <h4>Order Info</h4>
              <div className="form-group">
                <label>Company</label>
                <select 
                  name="refCode" 
                  value={formData.refCode} 
                  onChange={handleChange}
                  className="md3-input"
                  required
                >
                  <option value="" disabled>Select Company</option>
                  {companies && companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Ref Code</label>
                <input type="text" className="md3-input" value={formData.refCode} readOnly />
              </div>
              <div className="form-group">
                <label>Sales Order</label>
                <input type="text" name="salesOrder" value={formData.salesOrder || ''} onChange={handleChange} className="md3-input" />
              </div>
              <div className="form-group">
                <label>Invoice No</label>
                <input type="text" name="invoiceNo" value={formData.invoiceNo || ''} onChange={handleChange} className="md3-input" />
              </div>
            </div>

            {/* Location Info */}
            <div className="form-section">
              <h4>Location Info</h4>
              <div className="form-group">
                <label>Location</label>
                <input type="text" name="location" value={formData.location || ''} onChange={handleChange} className="md3-input" required />
              </div>
              <div className="form-group">
                <label>Sub Location</label>
                <input type="text" name="subLocation" value={formData.subLocation || ''} onChange={handleChange} className="md3-input" />
              </div>
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

            {/* Hardware Details */}
            <div className="form-section">
              <h4>Hardware Details</h4>
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

            {/* Lifecycle & Warranty */}
            <div className="form-section">
              <h4>Lifecycle & Warranty</h4>
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
              <div className="form-group">
                <label>Warranty Start Date</label>
                <input type="date" name="warrantyStartDate" value={formData.warrantyStartDate || ''} onChange={handleChange} className="md3-input" required />
              </div>
              <div className="form-group">
                <label>DLP Period</label>
                <select name="dlpPeriod" value={formData.dlpPeriod} onChange={handleChange} className="md3-input">
                  <option value="12 Months">12 Months</option>
                  <option value="24 Months">24 Months</option>
                  <option value="36 Months">36 Months</option>
                  <option value="48 Months">48 Months</option>
                  <option value="60 Months">60 Months</option>
                </select>
              </div>
              <div className="form-group">
                <label>Warranty End Date</label>
                <input type="date" name="warrantyEndDate" value={formData.warrantyEndDate || ''} className="md3-input read-only-input" readOnly />
              </div>
              <div className="form-group">
                <label>Days Left</label>
                <input type="number" name="warrantyDaysLeft" value={formData.warrantyDaysLeft || ''} className="md3-input read-only-input" readOnly />
              </div>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button type="button" className="btn-text" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-filled">Save Asset</button>
          </div>
        </form>
      </div>
    </div>
  );
}
