import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitToIntakeQueue } from '../services/apiClient';
import './TicketRequest.css';

const GeneralRequest = () => {
  const navigate = useNavigate();

  // States
  const [generalFormData, setGeneralFormData] = useState({
    companyName: '',
    requesterName: '',
    clientEmail: '',
    phoneNumber: '',
    location: '',
    branch: '',
    roomName: '',
    category: '',
    productMake: '',
    productModel: '',
    productSerial: '',
    description: '',
    attachmentBase64: '',
    attachmentName: '',
    attachmentMimeType: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ success: false, error: null, reqId: '' });

  const handleChange = (e) => {
    setGeneralFormData({ ...generalFormData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5242880) {
        alert('File size exceeds the 5MB limit.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGeneralFormData(prev => ({
          ...prev,
          attachmentBase64: reader.result.split(',')[1],
          attachmentName: file.name,
          attachmentMimeType: file.type
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ success: false, error: null, reqId: '' });

    try {
      const payload = {
        Source: "General Web Form",
        ref: "General",
        refCode: "General",
        Ref_Code: "General",
        companyName: generalFormData.companyName,
        Company_Name: generalFormData.companyName,
        requesterName: generalFormData.requesterName,
        Requester_Name: generalFormData.requesterName,
        email: generalFormData.clientEmail,
        Client_Email: generalFormData.clientEmail,
        phoneNumber: generalFormData.phoneNumber,
        PhoneNumber: generalFormData.phoneNumber,
        location: generalFormData.location,
        Location: generalFormData.location,
        branch: generalFormData.branch,
        Branch: generalFormData.branch,
        subLocation: generalFormData.branch,
        Sub_Location: generalFormData.branch,
        roomName: generalFormData.roomName,
        Room_Name: generalFormData.roomName,
        category: generalFormData.category,
        Category: generalFormData.category,
        issueDescription: generalFormData.description,
        Issue_Description: generalFormData.description,
        Attachment_Base64: generalFormData.attachmentBase64,
        Attachment_Name: generalFormData.attachmentName,
        Attachment_MimeType: generalFormData.attachmentMimeType,
        products: [{
          uniqueId: "Manual",
          uniqueProductId: "Manual",
          Unique_Product_Id: "Manual",
          productMake: generalFormData.productMake,
          ProductMake: generalFormData.productMake,
          productModel: generalFormData.productModel,
          ProductModel: generalFormData.productModel,
          productSerial: generalFormData.productSerial,
          ProductSerial: generalFormData.productSerial,
          branch: generalFormData.branch,
          Branch: generalFormData.branch,
          subLocation: generalFormData.branch,
          Sub_Location: generalFormData.branch,
          roomName: generalFormData.roomName,
          Room_Name: generalFormData.roomName
        }]
      };

      console.log("PAYLOAD BEING SENT TO SERVER:", payload);

      const response = await submitToIntakeQueue(payload);

      if (response?.success) {
        setSubmitStatus({
          success: true,
          error: null,
          reqId: response?.data?.Intake_ID || response?.data?.requestId || 'Generated Successfully'
        });
      } else {
        setSubmitStatus({
          success: false,
          error: response?.message || 'Failed to submit request.',
          reqId: ''
        });
      }
    } catch (err) {
      console.error(err);
      setSubmitStatus({
        success: false,
        error: 'A network error occurred. Please try again.',
        reqId: ''
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitStatus.success) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: '500px' }}>
          <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="success-logo-img" style={{ marginBottom: '20px' }} />
          <div className="success-icon" style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', width: '80px', height: '80px', borderRadius: '50%', background: '#e6f4ea' }}>✓</div>
          <h2 style={{ fontSize: '24px', color: 'var(--slate-dark)', marginBottom: '10px' }}>Request Logged Successfully</h2>
          <p style={{ color: 'var(--slate-gray)', marginBottom: '20px' }}>Your general service request has been registered.</p>
          <div style={{ background: '#f1f5f9', padding: '12px 24px', borderRadius: '8px', marginTop: '16px', fontSize: '1.1rem', color: '#334155' }}>
            Reference ID: <strong>{submitStatus.reqId}</strong>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ marginTop: '24px', width: '100%' }}>Submit Another</button>
          <button onClick={() => navigate('/')} className="btn btn-outline" style={{ marginTop: '12px', width: '100%' }}>Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <main className="app-main" style={{ maxWidth: '600px' }}>
        <div className="card" id="generalFormView" style={{ padding: '40px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="auth-logo-img" style={{ display: 'block', margin: '0 auto 16px auto', maxHeight: '50px' }} />
            <h2 style={{ color: '#1e293b', marginBottom: '8px', fontSize: '24px' }}>General Service Request</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Fill out the details below. Our triage team will process your request.</p>
          </div>

          {submitStatus.error && (
            <div className="error-text" style={{ marginBottom: '20px', color: '#ef4444', textAlign: 'center', background: '#fee2e2', padding: '10px', borderRadius: '6px' }}>
              {submitStatus.error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-2">
              <div className="input-group">
                <label>Company / Organization Name *</label>
                <input type="text" name="companyName" value={generalFormData.companyName} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Your Name *</label>
                <input type="text" name="requesterName" value={generalFormData.requesterName} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Email Address *</label>
                <input type="email" name="clientEmail" value={generalFormData.clientEmail} onChange={handleChange} required disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <input type="tel" name="phoneNumber" value={generalFormData.phoneNumber} onChange={handleChange} disabled={isSubmitting} />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: '10px' }}><span>02.</span> Location & Site Details</div>
            <div className="grid-2">
              <div className="input-group">
                <label>Location / City *</label>
                <input type="text" name="location" value={generalFormData.location} onChange={handleChange} required placeholder="e.g. Pune, Kolkata" disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Branch / Office Name *</label>
                <input type="text" name="branch" value={generalFormData.branch} onChange={handleChange} required placeholder="e.g. DLF Tower, Salt-lake" disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Room Name *</label>
                <input type="text" name="roomName" value={generalFormData.roomName} onChange={handleChange} required placeholder="e.g. Boardroom, Meeting Room 1" disabled={isSubmitting} />
              </div>
            </div>

            <div className="section-title" style={{ marginTop: '10px' }}><span>03.</span> Hardware & Issue Details</div>

            <div className="grid-2">
              <div className="input-group">
                <label>Issue Category *</label>
                <select name="category" value={generalFormData.category} onChange={handleChange} required disabled={isSubmitting}>
                  <option value="">Select Category...</option>
                  <option value="Hardware">Hardware Failure</option>
                  <option value="Software">Software/Firmware</option>
                  <option value="Connectivity">Network/Connectivity</option>
                  <option value="Configuration">Programming/Configuration</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Serial Number</label>
                <input type="text" name="productSerial" value={generalFormData.productSerial} onChange={handleChange} disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Hardware Make</label>
                <input type="text" name="productMake" value={generalFormData.productMake} onChange={handleChange} placeholder="e.g. Poly, Sennheiser" disabled={isSubmitting} />
              </div>
              <div className="input-group">
                <label>Hardware Model</label>
                <input type="text" name="productModel" value={generalFormData.productModel} onChange={handleChange} disabled={isSubmitting} />
              </div>
            </div>

            <div className="input-group full-width" style={{ display: 'flex', flexDirection: 'column' }}>
              <label>Issue Description *</label>
              <textarea rows="4" name="description" value={generalFormData.description} onChange={handleChange} required disabled={isSubmitting}></textarea>
            </div>

            <div className="input-group full-width" style={{ display: 'flex', flexDirection: 'column', marginTop: '8px' }}>
              <label>Attach Image or Document (Optional)</label>
              <div className="upload-box" style={{ marginTop: '8px', border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '20px', textAlign: 'center', background: '#f8fafc', cursor: 'pointer' }}>
                <label htmlFor="generalAttachment" className="upload-label" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                  <span style={{ color: generalFormData.attachmentName ? 'var(--brand-accent)' : 'var(--text-muted)', fontWeight: generalFormData.attachmentName ? 'bold' : 'normal' }}>
                    {generalFormData.attachmentName || 'Click to attach file (PDF, JPG, PNG - Max 5MB)'}
                  </span>
                </label>
                <input type="file" id="generalAttachment" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={isSubmitting} />
              </div>
            </div>

            <div className="form-footer" style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button type="button" onClick={() => navigate(-1)} className="btn btn-outline" style={{ flex: 1 }} disabled={isSubmitting}>Back</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ flex: 2 }}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default GeneralRequest;
