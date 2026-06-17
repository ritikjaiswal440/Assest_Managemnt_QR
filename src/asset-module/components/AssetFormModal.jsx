/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../services/assetApi';
import './CompanyFormModal.css'; // Re-use the modal styling

export default function AssetFormModal({ isOpen, onClose, onSave, initialData, companies: propCompanies }) {
  const [fetchedCompanies, setFetchedCompanies] = useState([]);
  const companies = propCompanies && propCompanies.length > 0 ? propCompanies : fetchedCompanies;

  const [formData, setFormData] = useState({
    id: '',
    refCode: '',
    location: '',
    roomName: '',
    productMake: '',
    productModel: '',
    productSerial: '',
    assetStatus: 'Active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: '',
        refCode: companies && companies.length > 0 ? companies[0].id : '',
        location: '',
        roomName: '',
        productMake: '',
        productModel: '',
        productSerial: '',
        assetStatus: 'Active'
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

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content md3-surface">
        <div className="modal-header">
          <h2>{initialData ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="md3-form">
          <div className="form-group">
            <label>Company Reference</label>
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

          <div className="form-row">
            <div className="form-group">
              <label>Location</label>
              <input 
                type="text" 
                name="location" 
                value={formData.location} 
                onChange={handleChange} 
                className="md3-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Room Name</label>
              <input 
                type="text" 
                name="roomName" 
                value={formData.roomName} 
                onChange={handleChange} 
                className="md3-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Product Make</label>
              <input 
                type="text" 
                name="productMake" 
                value={formData.productMake} 
                onChange={handleChange} 
                className="md3-input"
                required
              />
            </div>
            <div className="form-group">
              <label>Product Model</label>
              <input 
                type="text" 
                name="productModel" 
                value={formData.productModel} 
                onChange={handleChange} 
                className="md3-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Product Serial</label>
            <input 
              type="text" 
              name="productSerial" 
              value={formData.productSerial} 
              onChange={handleChange} 
              className="md3-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Asset Status</label>
            <select 
              name="assetStatus" 
              value={formData.assetStatus} 
              onChange={handleChange}
              className="md3-input"
            >
              <option value="Active">Active</option>
              <option value="In_Repair">In Repair</option>
              <option value="Transferred">Transferred</option>
              <option value="Retired">Retired</option>
              <option value="Replaced">Replaced</option>
            </select>
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
