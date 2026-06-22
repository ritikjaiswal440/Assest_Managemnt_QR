/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { validateRef, submitIntake } from '../services/apiClient';
import './TicketRequest.css';

const TicketRequest = () => {
  const [searchParams] = useSearchParams();
  const urlRef = searchParams.get('ref') || '';

  // View States
  const [view, setView] = useState('auth'); // 'auth', 'form', 'success'
  const [clientCode, setClientCode] = useState(urlRef);
  const [companyName, setCompanyName] = useState('');
  const [status, setStatus] = useState({ loading: false, error: null });
  const [reqId, setReqId] = useState('');

  // Form Data State
  const [formData, setFormData] = useState({
    reqName: '', reqPhone: '', reqEmail: '', reqLocation: '', reqRoom: '', reqCategory: '', reqDescription: ''
  });

  // Dynamic Hardware Array (Max 5)
  const [products, setProducts] = useState([{ productMake: '', productModel: '', productSerial: '' }]);
  
  // File Upload State
  const [fileData, setFileData] = useState(null);
  const [fileName, setFileName] = useState('Attach Invoice, Image, or Document');

  const handleAuth = useCallback(async (codeOverride = null) => {
    const codeToUse = codeOverride || clientCode;
    if (!codeToUse.trim()) {
      setStatus({ loading: false, error: "Please enter a reference code." });
      return;
    }
    
    setStatus({ loading: true, error: null });
    
    try {
      const response = await validateRef({ ref: codeToUse });
      if (response?.success) {
        setCompanyName(response?.data?.companyName || "Verified Client");
        setView('form');
        setStatus({ loading: false, error: null });
      } else {
        setStatus({ loading: false, error: response?.message || "Invalid reference code." });
      }
    } catch {
      setStatus({ loading: false, error: "Network error. Please try again." });
    }
  }, [clientCode]);

  // Auto-authenticate if URL has ?ref=
  useEffect(() => {
    if (urlRef) handleAuth(urlRef);
  }, [urlRef, handleAuth]);

  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    if (newProducts[index]) {
      newProducts[index][field] = value;
      setProducts(newProducts);
    }
  };

  const addProductUI = () => {
    if (products.length < 5) {
      setProducts([...products, { productMake: '', productModel: '', productSerial: '' }]);
    }
  };

  const removeProductUI = (index) => {
    if (products.length > 1) {
      const newProducts = products.filter((_, i) => i !== index);
      setProducts(newProducts);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName('Attach Invoice, Image, or Document');
      setFileData(null);
      return;
    }
    
    // Validate File Size (5MB limit)
    if (file.size > 5242880) {
      alert('File size exceeds the 5MB limit. Please select a smaller file.');
      e.target.value = '';
      setFileName('Attach Invoice, Image, or Document');
      setFileData(null);
      return;
    }

    // Validate MIME Type
    const validMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!validMimeTypes.includes(file.type)) {
      alert('Invalid file format. Please upload a PDF, JPG, or PNG.');
      e.target.value = '';
      setFileName('Attach Invoice, Image, or Document');
      setFileData(null);
      return;
    }

    setFileName(`Attached: ${file.name}`);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setFileData({
        filename: file.name,
        mimeType: file.type,
        base64: reader.result?.split(',')[1] || ''
      });
    };
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: null });

    const payload = {
      ref: clientCode,
      requesterName: formData.reqName,
      phoneNumber: formData.reqPhone,
      email: formData.reqEmail,
      location: formData.reqLocation,
      roomName: formData.reqRoom,
      category: formData.reqCategory,
      issueDescription: formData.reqDescription,
      products: products.filter(p => p && (p.productMake || p.productModel || p.productSerial)), // Only send filled items
      fileData: fileData
    };

    try {
      const response = await submitIntake(payload);
      if (response?.success) {
        setReqId(response?.data?.requestId || 'Generated Successfully');
        setView('success');
      } else {
        alert("Error: " + (response?.message || "Unknown error during form submission"));
        setStatus({ loading: false, error: null });
      }
    } catch {
      alert("Submission failed. Network layer blocked.");
      setStatus({ loading: false, error: null });
    }
  };

  if (view === 'success') {
    return (
      <div className="page-wrapper" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'}}>
        <div className="card" style={{textAlign: 'center', padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="success-logo-img" />
          <div className="success-icon">✓</div>
          <h2 style={{fontSize: '28px', color: 'var(--slate-dark)', marginBottom: '10px'}}>Ticket Generated</h2>
          <p style={{color: 'var(--slate-gray)', marginBottom: '30px'}}>Your service request has been logged successfully.</p>
          <div className="request-id-display">{reqId}</div>
          <button className="btn btn-outline mt-4" onClick={() => window.location.href = '/'} style={{marginTop: '20px'}}>Return to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <main className="app-main">
        
        {/* Auth View */}
        {view === 'auth' && (
          <div className="card" id="authView">
             <img src={`${import.meta.env.BASE_URL}logo-1.png`} alt="AV Dynamic" className="auth-logo-img" />
             <h1>Welcome to ProSupport</h1>
             <p className="subtitle">Secure enterprise service request system.</p>
             <div className="input-group" style={{marginBottom: '30px', width: '100%'}}>
                <label>Client Reference Code</label>
                <input 
                  type="text" 
                  value={clientCode} 
                  onChange={(e) => setClientCode(e.target.value)}
                  placeholder="e.g., A7K2L1" 
                  disabled={status.loading}
                />
             </div>
             <button className="btn btn-primary" onClick={() => handleAuth()} disabled={status.loading}>
               {status.loading ? 'Authenticating...' : 'Authenticate & Continue'}
             </button>
             {status.error && <div className="error-text">{status.error}</div>}
          </div>
        )}

        {/* Main Form View */}
        {view === 'form' && (
          <div className="card" id="formView">
            <div className="form-header">
              <h2>Register Service Request</h2>
              <div className="company-display">Company: {companyName}</div>
            </div>

            <form onSubmit={submitForm}>
              <div className="section-title"><span>01.</span> General Information</div>
              <div className="grid-2">
                <div className="input-group">
                  <label>Requester Name <span className="req">*</span></label>
                  <input type="text" required value={formData.reqName} onChange={e => setFormData({...formData, reqName: e.target.value})} disabled={status.loading} />
                </div>
                <div className="input-group">
                  <label>Phone Number <span className="req">*</span></label>
                  <input type="tel" required value={formData.reqPhone} onChange={e => setFormData({...formData, reqPhone: e.target.value})} disabled={status.loading} />
                </div>
                <div className="input-group">
                  <label>Client Email(s) - Comma separated <span className="req">*</span></label>
                  <input type="text" required value={formData.reqEmail} onChange={e => setFormData({...formData, reqEmail: e.target.value})} placeholder="e.g., client1@example.com, client2@example.com" disabled={status.loading} />
                </div>
                <div className="input-group">
                  <label>Location (Site) <span className="req">*</span></label>
                  <input type="text" required value={formData.reqLocation} onChange={e => setFormData({...formData, reqLocation: e.target.value})} disabled={status.loading} />
                </div>
                <div className="input-group">
                  <label>Room Name <span className="req">*</span></label>
                  <input type="text" required value={formData.reqRoom} onChange={e => setFormData({...formData, reqRoom: e.target.value})} disabled={status.loading} />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>Category <span className="req">*</span></label>
                  <select required value={formData.reqCategory} onChange={e => setFormData({...formData, reqCategory: e.target.value})} disabled={status.loading}>
                    <option value="">Select Category...</option>
                    <option>Hardware</option>
                    <option>Connectivity</option>
                    <option>Programming</option>
                    <option>Software</option>
                    <option>Network</option>
                  </select>
                </div>
              </div>

              <div className="input-group full-width mt-3">
                <label>Issue Description <span className="req">*</span></label>
                <textarea rows="4" required value={formData.reqDescription} onChange={e => setFormData({...formData, reqDescription: e.target.value})} disabled={status.loading}></textarea>
              </div>

              <div className="section-title"><span>02.</span> Infrastructure Details</div>
              <span className="form-note">Note: If you do not have the Make, Model or Serial Number write NA</span>
              {products.map((prod, idx) => {
                if (!prod) return null;
                return (
                  <div className="product-box" key={idx}>
                    <div className="product-header">
                      <h4>Item {idx + 1}</h4>
                      {products.length > 1 && (
                        <button 
                          type="button" 
                          className="btn btn-sm btn-danger remove-btn" 
                          onClick={() => removeProductUI(idx)}
                          disabled={status.loading}
                        >
                          &times; Remove
                        </button>
                      )}
                    </div>
                    <div className="grid-2">
                      <div className="input-group">
                        <label>Make *</label>
                        <input type="text" required value={prod.productMake} onChange={e => handleProductChange(idx, 'productMake', e.target.value)} disabled={status.loading} />
                      </div>
                      <div className="input-group">
                        <label>Model *</label>
                        <input type="text" required value={prod.productModel} onChange={e => handleProductChange(idx, 'productModel', e.target.value)} disabled={status.loading} />
                      </div>
                    </div>
                    <div className="input-group" style={{marginBottom: 0}}>
                      <label>Serial Number *</label>
                      <input type="text" required value={prod.productSerial} onChange={e => handleProductChange(idx, 'productSerial', e.target.value)} placeholder="Write NA if unknown" disabled={status.loading} />
                    </div>
                  </div>
                );
              })}
              
              {products.length < 5 && (
                <button type="button" className="btn btn-outline mt-3" onClick={addProductUI} disabled={status.loading}>+ Add Hardware Item</button>
              )}

              <div className="section-title"><span>03.</span> Attachments</div>
              <div className="upload-box">
                <label htmlFor="reqInvoice" className="upload-label">
                  <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'}}>
                    <span style={{color: fileData ? 'var(--brand-accent)' : 'var(--text-muted)', fontWeight: fileData ? 'bold' : 'normal'}}>{fileName}</span>
                    <span style={{fontSize: '13px', color: 'var(--text-muted)'}}>(PDF, JPG, PNG - Max limit: 5MB)</span>
                  </div>
                </label>
                <input type="file" id="reqInvoice" style={{display: 'none'}} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} disabled={status.loading} />
              </div>

              <div className="form-footer">
                <button type="submit" className="btn btn-primary" disabled={status.loading}>
                  {status.loading ? 'Processing...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default TicketRequest;