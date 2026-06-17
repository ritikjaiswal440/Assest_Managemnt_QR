/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import './CompanyFormModal.css';

export default function CompanyFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    supportTier: 'Warranty',
    amcStart: '',
    amcEnd: '',
    primaryContact: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        id: '',
        name: '',
        supportTier: 'Warranty',
        amcStart: '',
        amcEnd: '',
        primaryContact: ''
      });
    }
  }, [initialData, isOpen]);

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
          <h2>{initialData ? 'Edit Company' : 'Add New Company'}</h2>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="md3-form">
          <div className="form-group">
            <label>Company Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleChange} 
              className="md3-input"
              required 
            />
          </div>

          <div className="form-group">
            <label>Support Type</label>
            <select 
              name="supportTier" 
              value={formData.supportTier} 
              onChange={handleChange}
              className="md3-input"
            >
              <option value="Warranty">Warranty</option>
              <option value="Comprehensive AMC">Comprehensive AMC</option>
              <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
              <option value="Out Of Support">Out Of Support</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>AMC Start Date</label>
              <input 
                type="date" 
                name="amcStart" 
                value={formData.amcStart} 
                onChange={handleChange} 
                className="md3-input"
              />
            </div>
            <div className="form-group">
              <label>AMC End Date</label>
              <input 
                type="date" 
                name="amcEnd" 
                value={formData.amcEnd} 
                onChange={handleChange} 
                className="md3-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Primary Contact</label>
            <input 
              type="text" 
              name="primaryContact" 
              value={formData.primaryContact} 
              onChange={handleChange} 
              className="md3-input"
              placeholder="Name, Email, or Phone"
            />
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
