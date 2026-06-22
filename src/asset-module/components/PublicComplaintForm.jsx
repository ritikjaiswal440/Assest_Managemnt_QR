import { useState } from 'react';
import { submitComplaint } from '../../services/apiClient';
import './PublicComplaintForm.css';

export default function PublicComplaintForm({ asset, signature }) {
  const [formData, setFormData] = useState({
    requestedBy: '',
    clientEmail: '',
    phoneNumber: '',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState(null);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.requestedBy || !formData.clientEmail || !formData.description) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const assetId = asset?.Unique_Product_Id || asset?.unique_product_id || asset?.id || asset?.assetId;

      const finalPayload = {
        requestedBy: formData.requestedBy,
        clientEmail: formData.clientEmail,
        phoneNumber: formData.phoneNumber,
        description: formData.description,
        Unique_Product_Id: assetId, // Guaranteed resolution
        security_signature: signature
      };
      
      if (!finalPayload.Unique_Product_Id) {
          console.error("CRITICAL: Asset ID is missing before submission!");
          alert("System Error: Physical Asset ID could not be mapped. Please re-scan the QR code.");
          setIsSubmitting(false);
          return; // Prevent submitting a broken payload
      }

      console.log("🔍 TRACE - Final Payload Leaving Browser:", finalPayload);
      
      const response = await submitComplaint(finalPayload);

      if (response && response.success) {
        setSuccessReference(response.data?.complaintId || response.message || 'CMP-SUCCESS');
      } else {
        setError(response?.message || 'Failed to log complaint. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successReference) {
    return (
      <div className="success-state md3-surface">
        <div className="success-icon">✓</div>
        <h2>Complaint Logged Successfully.</h2>
        <p>Your support request has been registered.</p>
        <div className="reference-box">
          Reference: <strong>{successReference}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="complaint-form-container md3-surface">
      <h2>Report a Hardware Issue</h2>
      <p className="form-subtitle">Scan-verified routing. Your request will be directly dispatched to the support team.</p>
      
      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit} className="md3-form">
        <div className="form-group">
          <label>Requested By *</label>
          <input 
            type="text" 
            name="requestedBy" 
            value={formData.requestedBy} 
            onChange={handleChange} 
            className="md3-input"
            placeholder="Your Full Name"
            required 
          />
        </div>

        <div className="form-group">
          <label>Email Address *</label>
          <input 
            type="email" 
            name="clientEmail" 
            value={formData.clientEmail} 
            onChange={handleChange} 
            className="md3-input"
            placeholder="name@company.com"
            required 
          />
        </div>

        <div className="form-group">
          <label>Phone Number</label>
          <input 
            type="tel" 
            name="phoneNumber" 
            value={formData.phoneNumber} 
            onChange={handleChange} 
            className="md3-input"
            placeholder="+1 234 567 8900"
          />
        </div>

        <div className="form-group">
          <label>Description of Issue *</label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            className="md3-input"
            rows="4"
            placeholder="Please detail the hardware issue..."
            required 
          />
        </div>

        <button type="submit" className="btn-filled submit-btn" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Support Request'}
        </button>
      </form>
    </div>
  );
}
