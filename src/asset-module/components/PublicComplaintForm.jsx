import { useState, useEffect } from 'react';
import { submitComplaint } from '../../services/apiClient';
import './PublicComplaintForm.css';

export default function PublicComplaintForm({ asset, signature, assets = [] }) {
  const [formData, setFormData] = useState({
    requestedBy: '',
    clientEmail: '',
    phoneNumber: '',
    description: '',
    Support_Type: '',
    Asset_ID: ''
  });

  const handleAssetSelect = (e) => {
    const selectedAssetId = e.target.value;
    setFormData(prev => ({ ...prev, Asset_ID: selectedAssetId }));

    // Lookup the support type from your existing 'assets' data array
    const foundAsset = assets.find(a => a.Unique_Product_Id === selectedAssetId);
    
    if (foundAsset) {
      setFormData(prev => ({
        ...prev,
        Support_Type: foundAsset.Support_Type || foundAsset.supportType || 'General' // Pre-fills the field
      }));
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReference, setSuccessReference] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (asset) {
      // Determine default support type based on AMC details
      const today = new Date();
      let detectedType = '';
      
      const compEnd = asset.AMC_End_Date || asset.amcEndDate;
      const nonCompEnd = asset.NON_CAMC_End_Date || asset.nonCamcEndDate;
      
      if (compEnd && new Date(compEnd) >= today) {
        detectedType = 'Comprehensive';
      } else if (nonCompEnd && new Date(nonCompEnd) >= today) {
        detectedType = 'Non-Comprehensive';
      } else if (compEnd) {
        detectedType = 'Comprehensive';
      } else if (nonCompEnd) {
        detectedType = 'Non-Comprehensive';
      }
      
      if (detectedType) {
        setFormData(prev => ({ ...prev, Support_Type: detectedType }));
      }
    }
  }, [asset]);

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
        Support_Type: formData.Support_Type,
        Unique_Product_Id: assetId, // Guaranteed resolution
        security_signature: signature
      };

      if (!finalPayload.Unique_Product_Id) {
        console.error("CRITICAL: Asset ID is missing before submission!");
        alert("System Error: Physical Asset ID could not be mapped. Please re-scan the QR code.");
        setIsSubmitting(false);
        return; // Prevent submitting a broken payload
      }

      console.log("PAYLOAD BEING SENT TO SERVER:", formData);
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
          <label>Support Type</label>
          <select 
            name="Support_Type" 
            value={formData.Support_Type} 
            onChange={handleChange} 
            className="md3-input"
            style={{ width: '100%', height: '40px', background: '#ffffff', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="">Select Support Type</option>
            <option value="Comprehensive">Comprehensive</option>
            <option value="Non-Comprehensive">Non-Comprehensive</option>
          </select>
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
