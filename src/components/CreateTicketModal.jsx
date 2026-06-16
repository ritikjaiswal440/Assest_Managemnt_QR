/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { gasApi } from '../services/api';

const initialState = {
  serviceRequestId: '',
  company: '',
  clientEmail: '',
  phoneNumber: '',
  salesOrder: '',
  clientId: '',
  location: '',
  room: '',
  reqBy: '',
  category: '',
  issueType: '',
  otherIssue: '',
  productMake: '',
  productModel: '',
  productSerial: '',
  serviceType: '',
  description: '',
  engineerData: '', // Will hold "email|name|role"
  instructions: ''
};

const CreateTicketModal = ({ isOpen, onClose, bundle, currentUser, onSuccess, initialData }) => {
  // 1. ALL HOOKS MUST BE AT THE VERY TOP
  const [formData, setFormData] = useState(initialState);
  const [status, setStatus] = useState({ loading: false, error: null });
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  // 2. Add this useEffect to pre-fill the form if initialData exists
  useEffect(() => {
    if (isOpen) {
      setSelectedProductIndex(0);
      if (initialData) {
        let defaultMake = '';
        let defaultModel = '';
        let defaultSerial = '';

        if (Array.isArray(initialData.products) && initialData.products.length > 0) {
          defaultMake = initialData.products[0].productMake || initialData.products[0].brand || '';
          defaultModel = initialData.products[0].productModel || initialData.products[0].model || '';
          defaultSerial = initialData.products[0].productSerial || initialData.products[0].serial || '';
        } else {
          defaultMake = initialData.productMake || initialData.brand || '';
          defaultModel = initialData.productModel || initialData.model || '';
          defaultSerial = initialData.productSerial || initialData.serial || '';
        }

        const invoicePart = initialData?.invoiceUrl ? `\n\nSee Attached Client File: ${initialData.invoiceUrl}` : '';

        // Pre-fill the form with the client's raw request data
        setFormData(prev => ({
          ...prev,
          serviceRequestId: initialData?.requestId || '',
          company: initialData?.companyName || '',
          clientEmail: initialData?.email || '',
          reqBy: initialData?.requesterName || '',
          phoneNumber: initialData?.phoneNumber || '',
          location: initialData?.location || '',
          room: initialData?.roomName || '',
          category: initialData?.category || '',
          description: `${initialData?.description || ''}${invoicePart}`,
          productMake: defaultMake,
          productModel: defaultModel,
          productSerial: defaultSerial,
          instructions: ''
        }));
      } else {
        setFormData(initialState); // Clean slate for manual creation
      }
      setStatus({ loading: false, error: null });
    }
  }, [isOpen, initialData]);

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

  const handleProductSelect = (index) => {
    setSelectedProductIndex(index);
    if (initialData?.products && initialData.products[index]) {
      const prod = initialData.products[index];
      setFormData(prev => ({
        ...prev,
        productMake: prod.productMake || prod.brand || '',
        productModel: prod.productModel || prod.model || '',
        productSerial: prod.productSerial || prod.serial || ''
      }));
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

    // Map React state to backend API payload expectations
    const payload = {
      actorEmail: currentUser?.email || '',
      ticketData: {
        ...formData,
        engEmail,
        engName,
        engRole
      }
    };

    try {
      const response = await gasApi('createTicket', payload);
      
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

  const clientsArray = Array.isArray(bundle?.clients) ? bundle.clients : [];
  const engineersArray = Array.isArray(bundle?.engineers) ? bundle.engineers : [];

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
              <label>Service Request Reference ID</label>
              <input type="text" name="serviceRequestId" value={formData.serviceRequestId} onChange={handleChange} placeholder="Manual entry reference..." disabled={status.loading || !!initialData} />
            </div>

            {initialData?.products && initialData.products.length > 1 && (
              <div className="form-group span-2" style={{ backgroundColor: '#f1f3f4', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--primary-action)', marginBottom: '10px' }}>
                <label style={{ fontWeight: '600', color: 'var(--primary-action)', marginBottom: '8px', display: 'block' }}>
                  Select Hardware for this Ticket
                </label>
                <select 
                  value={selectedProductIndex} 
                  onChange={(e) => handleProductSelect(parseInt(e.target.value, 10))}
                  disabled={status.loading}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', background: '#ffffff', fontSize: '0.95rem' }}
                >
                  {initialData.products.map((prod, idx) => (
                    <option key={idx} value={idx}>
                      Item {idx + 1}: {prod.productMake || prod.brand || 'N/A'} - {prod.productModel || prod.model || 'N/A'} (S/N: {prod.productSerial || prod.serial || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Client / Company Name *</label>
              <select name="company" value={formData.company} onChange={handleChange} required disabled={status.loading}>
                <option value="">Select Client...</option>
                {clientsArray.map((c, i) => {
                  if (!c) return null;
                  const companyName = typeof c === 'object' ? c.Company_Name : c;
                  return <option key={i} value={companyName}>{companyName}</option>;
                })}
              </select>
            </div>

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
              <label>Room Name</label>
              <input type="text" name="room" value={formData.room} onChange={handleChange} disabled={status.loading} />
            </div>

            {/* --- Technical Details --- */}
            <div className="form-group">
              <label>Category *</label>
              <select name="category" value={formData.category} onChange={handleChange} required disabled={status.loading}>
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
              <select name="issueType" value={formData.issueType} onChange={handleChange} required disabled={status.loading}>
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
              <select name="serviceType" value={formData.serviceType} onChange={handleChange} disabled={status.loading}>
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
                {engineersArray.map((eng, i) => {
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
              {status.loading ? 'Generating Infrastructure...' : 'Deploy Master Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTicketModal;