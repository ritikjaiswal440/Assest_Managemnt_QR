/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import CompanyFormModal from '../components/CompanyFormModal';
import { getCompanies, updateSalesOrderContracts, getAssetInventory } from '../../services/apiClient';

// Helper to make raw DB dates look pretty on the dashboard (DD/MM/YYYY)
const formatDisplayDate = (dateString) => {
  if (!dateString) return 'N/A';
  // If it's already a short date from Excel (like 25/06/2025), just return it
  if (String(dateString).length <= 10 && String(dateString).includes('/')) return dateString;
  
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  
  return d.toLocaleDateString('en-GB'); // Renders as DD/MM/YYYY
};

export default function CompanyDashboard() {
  // UTILITY: Calculates if a specific date range is currently active
  const getTimelineBadge = (startDate, endDate) => {
    if (!startDate && !endDate) return <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>N/A</span>;
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (now >= start && now <= end) return <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>Active</span>;
    if (now > end) return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>Expired</span>;
    return <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>Pending</span>;
  };

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompany, setExpandedCompany] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [selectedSOEdit, setSelectedSOEdit] = useState(null);
  const [selectedSOAssets, setSelectedSOAssets] = useState(null);

  const toggleCompany = (refCode) => {
    if (expandedCompany === refCode) {
      setExpandedCompany(null);
    } else {
      setExpandedCompany(refCode);
    }
  };

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const result = await getCompanies();
      if (result.status === 'success' || result.success) {
        setCompanies(result.data || []);
      } else {
        setError(result.message || 'Failed to fetch companies');
      }
    } catch (err) {
      console.error('Fetch Companies Error Details:', err);
      setError('Network error fetching companies.');
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSaveCompany = () => {
    setIsModalOpen(false);
    fetchCompanies();
  };

  const filteredCompanies = companies.filter(comp => {
    const term = searchTerm.toLowerCase();
    return (
      (comp.Ref_Code && comp.Ref_Code.toLowerCase().includes(term)) ||
      (comp.Company_Name && comp.Company_Name.toLowerCase().includes(term)) ||
      (comp.branches && comp.branches.some(b => 
        (b.Location && b.Location.toLowerCase().includes(term)) ||
        (b.Branch && b.Branch.toLowerCase().includes(term)) ||
        (b.Primary_Email && b.Primary_Email.toLowerCase().includes(term))
      ))
    );
  });

  return (
    <section className="table-card">
      <style>{`
        .company-parent-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }
        .company-parent-row:hover {
          background-color: #f1f5f9;
        }
        .branch-dossier {
          background-color: #f8fafc;
          padding: 24px;
          border-bottom: 2px solid #e2e8f0;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
        }
        .branch-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .branch-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .branch-card-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .branch-stat {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          margin-bottom: 6px;
        }
        .stat-label { color: #64748b; font-weight: 600; }
        .stat-value { color: #334155; font-weight: 500; text-align: right; }
      `}</style>

      <div className="table-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="filter-bar">
          <input 
            type="text" 
            placeholder="Search Companies..." 
            className="md3-input" 
            style={{ padding: '8px 16px', borderRadius: '20px' }} 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          className="btn-filled" 
          style={{ borderRadius: '20px' }}
          onClick={() => {
            setEditingCompany(null);
            setIsModalOpen(true);
          }}
        >
          + Add Company
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-responsive" style={{ marginTop: '16px' }}>
        {loading ? (
          <p>Loading companies...</p>
        ) : (
          <table className="material-table">
            <thead>
              <tr>
                <th>Ref Code</th>
                <th>Company Name</th>
                <th>Deployments</th>
                <th>Client Portal</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies && filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <React.Fragment key={company.Ref_Code}>
                    {/* --- PARENT COMPANY ROW --- */}
                    <tr className="company-parent-row" onClick={() => toggleCompany(company.Ref_Code)}>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary-action)' }}>
                        {expandedCompany === company.Ref_Code ? '▼' : '▶'} {company.Ref_Code}
                      </td>
                      <td style={{ fontWeight: '600', color: '#0f172a', fontSize: '1.05rem' }}>
                        {company.Company_Name}
                      </td>
                      <td>
                        <span style={{ background: '#e2e8f0', color: '#475569', padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                          {company.branches?.length || 0} Branches
                        </span>
                      </td>
                      <td>
                        {company.ClientLink ? (
                          <a href={company.ClientLink} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#2563eb', fontSize: '0.85rem' }}>Portal Link</a>
                        ) : 'N/A'}
                      </td>
                      <td>
                        <button className="row-action-btn" onClick={(e) => {
                          e.stopPropagation();
                          const baseBranch = company.branches?.[0] || {};
                          setEditingCompany({
                            Ref_Code: company.Ref_Code,
                            Company_Name: company.Company_Name,
                            ClientLink: company.ClientLink,
                            ...baseBranch
                          });
                          setIsModalOpen(true);
                        }}>
                          Edit Client
                        </button>
                      </td>
                    </tr>

                    {/* --- CHILD BRANCH DOSSIER (EXPANDED) --- */}
                    {expandedCompany === company.Ref_Code && (
                      <tr>
                        <td colSpan="100%" style={{ padding: 0 }}>
                          <div className="branch-dossier">
                            <h4 style={{ margin: '0 0 16px 0', color: '#475569', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              Deployed Locations & SLAs
                            </h4>
                            
                            <div className="branch-grid">
                              {company.branches?.map((branch, idx) => {
                                return (
                                  <div className="branch-card" key={idx}>
                                    
                                    <div className="branch-card-header" style={{ marginBottom: '8px' }}>
                                       <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{branch.Location} &gt; {branch.Branch}</span>
                                     </div>

                                     {/* --- PROJECT CONTRACTS (SALES ORDERS) --- */}
                                     <div style={{ marginTop: '16px', borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                                       <h5 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                         Executed Projects ({branch.salesOrders?.length || 0})
                                       </h5>

                                       {(!branch.salesOrders || branch.salesOrders.length === 0) ? (
                                         <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No Sales Orders linked to this branch.</div>
                                       ) : (
                                         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                           {branch.salesOrders.map((so, soIdx) => (
                                             <div key={soIdx} style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '12px' }}>
                                               
                                               {/* SO Header & Status */}
                                               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px dashed #cbd5e1' }}>
                                                 <a 
                                                   href={`${window.location.pathname.split('/pages')[0].replace(/\/$/, '')}/assets?salesOrder=${encodeURIComponent(so.Sales_Order)}`} 
                                                   target="_blank" 
                                                   rel="noopener noreferrer"
                                                   style={{ fontWeight: 'bold', color: '#2563eb', textDecoration: 'none', cursor: 'pointer' }}
                                                 >
                                                   📦 {so.Sales_Order}
                                                 </a>
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                   <span style={{ 
                                                     fontSize: '0.75rem', 
                                                     fontWeight: 'bold', 
                                                     padding: '4px 8px', 
                                                     borderRadius: '4px',
                                                     background: so.RealTime_Status === 'Out Of Support' ? '#fee2e2' : '#dcfce7',
                                                     color: so.RealTime_Status === 'Out Of Support' ? '#991b1b' : '#166534'
                                                   }}>
                                                     {so.RealTime_Status || 'Unknown'}
                                                   </span>
                                                   <button 
                                                     style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center' }}
                                                     title="Edit SLA & DLP"
                                                     onClick={(e) => {
                                                       e.stopPropagation();
                                                       setSelectedSOEdit(so);
                                                     }}
                                                   >
                                                     ✏️
                                                   </button>
                                                 </div>
                                               </div>

                                               {/* SO Specific Timelines */}
                                               <div style={{ fontSize: '0.75rem', lineHeight: '1.6' }}>
                                                 {so.DLP_Start_Date && (
                                                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                     <span style={{ color: '#0369a1', fontWeight: 'bold' }}>DLP:</span>
                                                     <div>
                                                       <span style={{ color: '#475569' }}>{new Date(so.DLP_Start_Date).toLocaleDateString('en-GB')} to {new Date(so.DLP_End_Date).toLocaleDateString('en-GB')}</span>
                                                       {getTimelineBadge(so.DLP_Start_Date, so.DLP_End_Date)}
                                                     </div>
                                                   </div>
                                                 )}
                                                 
                                                 {so.AMC_Start_Date && (
                                                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                     <span style={{ color: '#15803d', fontWeight: 'bold' }}>Comp AMC:</span>
                                                     <div>
                                                       <span style={{ color: '#475569' }}>{new Date(so.AMC_Start_Date).toLocaleDateString('en-GB')} to {new Date(so.AMC_End_Date).toLocaleDateString('en-GB')}</span>
                                                       {getTimelineBadge(so.AMC_Start_Date, so.AMC_End_Date)}
                                                     </div>
                                                   </div>
                                                 )}

                                                 {so.NON_CAMC_Start_Date && (
                                                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                     <span style={{ color: '#b45309', fontWeight: 'bold' }}>Non-Comp AMC:</span>
                                                     <div>
                                                       <span style={{ color: '#475569' }}>{new Date(so.NON_CAMC_Start_Date).toLocaleDateString('en-GB')} to {new Date(so.NON_CAMC_End_Date).toLocaleDateString('en-GB')}</span>
                                                       {getTimelineBadge(so.NON_CAMC_Start_Date, so.NON_CAMC_End_Date)}
                                                     </div>
                                                   </div>
                                                 )}
                                               </div>

                                             </div>
                                           ))}
                                         </div>
                                       )}
                                     </div>

                                    {/* --- LOCAL CONTACT DETAILS --- */}
                                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #e2e8f0' }}>
                                      <div className="branch-stat"><span className="stat-label">Contact:</span> <span className="stat-value">{branch.Primary_Contact || 'N/A'}</span></div>
                                      <div className="branch-stat"><span className="stat-label">Phone:</span> <span className="stat-value">{branch.Primary_Phone || 'N/A'}</span></div>
                                      <div className="branch-stat"><span className="stat-label">Email:</span> <span className="stat-value">{branch.Primary_Email || 'N/A'}</span></div>
                                    </div>

                                    <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                      <button 
                                        className="row-action-btn"
                                        style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCompany({
                                            Ref_Code: company.Ref_Code,
                                            Company_Name: company.Company_Name,
                                            ClientLink: company.ClientLink,
                                            ...branch
                                          });
                                          setIsModalOpen(true);
                                        }}
                                      >
                                        Edit Branch
                                      </button>
                                    </div>

                                  </div>
                                );
                              })}
                              {(!company.branches || company.branches.length === 0) && (
                                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>No branch data registered.</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <tr><td colSpan="100%" style={{textAlign: 'center', padding: '20px'}}>No companies found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <CompanyFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCompany}
        initialData={editingCompany}
        companies={companies}
      />

      <SalesOrderEditModal 
        isOpen={!!selectedSOEdit}
        onClose={() => setSelectedSOEdit(null)}
        so={selectedSOEdit}
        onSave={fetchCompanies}
      />

      <AssetDrillDownModal 
        isOpen={!!selectedSOAssets}
        onClose={() => setSelectedSOAssets(null)}
        soId={selectedSOAssets}
      />
    </section>
  );
}

// Helper to safely format dates for HTML inputs
const formatDateForInput = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split('T')[0];
};

// UTILITY: Calculates the real-time status preview for the Edit Modal
const getModalStatusPreview = (formState) => {
  if (!formState) return "Unknown";
  const now = new Date().getTime();
  
  const isActive = (startStr, endStr) => {
    if (!startStr || !endStr) return false;
    const s = new Date(startStr).getTime();
    const e = new Date(endStr).getTime();
    return (now >= s && now <= e);
  };

  if (isActive(formState.dlpStart, formState.dlpEnd)) return "DLP";
  if (formState.amcType === 'Comprehensive AMC' && isActive(formState.amcStart, formState.amcEnd)) return "Comprehensive AMC";
  if (formState.amcType === 'Non-Comprehensive AMC' && isActive(formState.amcStart, formState.amcEnd)) return "Non-Comprehensive AMC";
  
  return "Out Of Support";
};

// --- EDIT SALES ORDER SLA MODAL ---
function SalesOrderEditModal({ isOpen, onClose, so, onSave }) {
  const [editForm, setEditForm] = useState({
    salesOrder: '',
    dlpStart: '',
    dlpEnd: '',
    dlpDuration: '12 Months',
    amcType: 'Comprehensive AMC',
    amcStart: '',
    amcEnd: '',
    amcDuration: '1 Year'
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (so) {
      const initialDlpStart = so.DLP_Start_Date ? formatDateForInput(so.DLP_Start_Date) : '';
      const initialDlpEnd = so.DLP_End_Date ? formatDateForInput(so.DLP_End_Date) : '';
      
      let initialAmcType = 'Comprehensive AMC';
      let initialAmcStart = '';
      let initialAmcEnd = '';

      if (so.NON_CAMC_Start_Date) {
        initialAmcType = 'Non-Comprehensive AMC';
        initialAmcStart = so.NON_CAMC_Start_Date ? formatDateForInput(so.NON_CAMC_Start_Date) : '';
        initialAmcEnd = so.NON_CAMC_End_Date ? formatDateForInput(so.NON_CAMC_End_Date) : '';
      } else {
        initialAmcType = 'Comprehensive AMC';
        initialAmcStart = so.AMC_Start_Date ? formatDateForInput(so.AMC_Start_Date) : '';
        initialAmcEnd = so.AMC_End_Date ? formatDateForInput(so.AMC_End_Date) : '';
      }

      setEditForm({
        salesOrder: so.Sales_Order || '',
        dlpStart: initialDlpStart,
        dlpEnd: initialDlpEnd,
        dlpDuration: 'Custom',
        amcType: initialAmcType,
        amcStart: initialAmcStart,
        amcEnd: initialAmcEnd,
        amcDuration: 'Custom'
      });
    }
  }, [so, isOpen]);

  // DLP calculator
  useEffect(() => {
    if (editForm.dlpDuration !== 'Custom' && editForm.dlpStart) {
      const months = parseInt(editForm.dlpDuration, 10);
      if (!isNaN(months)) {
        const start = new Date(editForm.dlpStart);
        start.setMonth(start.getMonth() + months);
        start.setDate(start.getDate() - 1);
        setEditForm(prev => ({ ...prev, dlpEnd: start.toISOString().split('T')[0] }));
      }
    }
  }, [editForm.dlpStart, editForm.dlpDuration]);

  // AMC calculator
  useEffect(() => {
    if (editForm.amcDuration !== 'Custom' && editForm.amcStart) {
      const years = parseInt(editForm.amcDuration, 10);
      if (!isNaN(years)) {
        const start = new Date(editForm.amcStart);
        start.setFullYear(start.getFullYear() + years);
        start.setDate(start.getDate() - 1);
        setEditForm(prev => ({ ...prev, amcEnd: start.toISOString().split('T')[0] }));
      }
    }
  }, [editForm.amcStart, editForm.amcDuration]);

  if (!isOpen || !so) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await updateSalesOrderContracts({
        salesOrder: so.Sales_Order,
        dlpStart: editForm.dlpStart,
        dlpEnd: editForm.dlpEnd,
        amcType: editForm.amcType === 'Comprehensive AMC' ? 'COMP' : 'NON-COMP',
        amcStart: editForm.amcStart,
        amcEnd: editForm.amcEnd
      });
      if (res && res.success) {
        onSave();
        onClose();
      } else {
        alert(res.message || "Failed to update Sales Order SLAs.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error updating Sales Order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '550px' }}>
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* --- MODAL HEADER & PREVIEW --- */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', borderBottom: '1px solid #cbd5e1', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, color: '#0f172a' }}>Edit Project SLAs: {editForm.salesOrder}</h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Preview Status:</span>
              <span style={{ 
                padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold',
                background: getModalStatusPreview(editForm) === 'Out Of Support' ? '#fee2e2' : '#dcfce7',
                color: getModalStatusPreview(editForm) === 'Out Of Support' ? '#991b1b' : '#166534'
              }}>
                {getModalStatusPreview(editForm)}
              </span>
            </div>
            <button type="button" className="icon-button" onClick={onClose} style={{ marginLeft: '12px' }}>✕</button>
          </div>

          {/* --- PHASE 1: DLP INPUTS WITH CLEAR BUTTONS --- */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '16px', marginBottom: '8px' }}>
            <h6 style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '0.85rem' }}>Phase 1: Defect Liability Period (DLP)</h6>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* DLP Start */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: '#0c4a6e' }}>DLP Start Date</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={editForm.dlpStart || ''} onChange={(e) => setEditForm({...editForm, dlpStart: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #7dd3fc' }} />
                  <button type="button" onClick={() => setEditForm({...editForm, dlpStart: ''})} style={{ padding: '0 8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} title="Clear Date">✕</button>
                </div>
              </div>
              
              {/* DLP End */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: '#0c4a6e' }}>DLP End Date</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={editForm.dlpEnd || ''} onChange={(e) => setEditForm({...editForm, dlpEnd: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #7dd3fc' }} />
                  <button type="button" onClick={() => setEditForm({...editForm, dlpEnd: ''})} style={{ padding: '0 8px', background: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} title="Clear Date">✕</button>
                </div>
              </div>

            </div>
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#0369a1', marginBottom: '4px' }}>DLP Duration Helper</label>
              <select
                value={editForm.dlpDuration}
                onChange={(e) => setEditForm({...editForm, dlpDuration: e.target.value})}
                style={{ width: '100%', padding: '6px', borderRadius: '4px', border: '1px solid #7dd3fc', fontSize: '0.75rem' }}
              >
                <option value="12 Months">12 Months</option>
                <option value="24 Months">24 Months</option>
                <option value="36 Months">36 Months</option>
                <option value="Custom">Custom (Manual Edit)</option>
              </select>
            </div>
          </div>

          {/* --- PHASE 2: AMC INPUTS WITH CLEAR BUTTONS --- */}
          <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '16px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h6 style={{ margin: 0, color: '#334155', fontSize: '0.85rem' }}>Phase 2: Post-DLP Contract</h6>
              <select 
                value={editForm.amcType} 
                onChange={(e) => setEditForm({...editForm, amcType: e.target.value})}
                style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #94a3b8', fontSize: '0.8rem' }}
              >
                <option value="Comprehensive AMC">Comprehensive AMC</option>
                <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              
              {/* AMC Start */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>AMC Start Date</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={editForm.amcStart || ''} onChange={(e) => setEditForm({...editForm, amcStart: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <button type="button" onClick={() => setEditForm({...editForm, amcStart: ''})} style={{ padding: '0 8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} title="Clear Date">✕</button>
                </div>
              </div>
              
              {/* AMC End */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '6px', color: '#475569' }}>AMC End Date</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="date" value={editForm.amcEnd || ''} onChange={(e) => setEditForm({...editForm, amcEnd: e.target.value})} style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                  <button type="button" onClick={() => setEditForm({...editForm, amcEnd: ''})} style={{ padding: '0 8px', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} title="Clear Date">✕</button>
                </div>
              </div>

            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: '#475569', marginBottom: '4px' }}>AMC Duration Helper</label>
              <select 
                value={editForm.amcDuration} 
                onChange={(e) => setEditForm({...editForm, amcDuration: e.target.value})}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              >
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
                <option value="3 Years">3 Years</option>
                <option value="5 Years">5 Years</option>
                <option value="Custom">Custom (Manual Edit)</option>
              </select>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '8px' }}>
            <button type="button" className="btn-text" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-filled" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- PROJECT HARDWARE DRILL DOWN MODAL ---
function AssetDrillDownModal({ isOpen, onClose, soId }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && soId) {
      const loadAssets = async () => {
        setLoading(true);
        setError('');
        try {
          const res = await getAssetInventory();
          if (res && res.success && res.data) {
            const filtered = res.data.filter(asset => 
              String(asset.Sales_Order || '').trim().toLowerCase() === String(soId).trim().toLowerCase()
            );
            setAssets(filtered);
          } else {
            setError(res.message || 'Failed to fetch assets.');
          }
        } catch (err) {
          console.error(err);
          setError('Network error fetching connected hardware assets.');
        } finally {
          setLoading(false);
        }
      };
      loadAssets();
    }
  }, [isOpen, soId]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal" style={{ maxWidth: '800px' }}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Project Hardware Inventory</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
              Sales Order: <b>{soId}</b>
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading ? (
            <p>Loading connected hardware...</p>
          ) : error ? (
            <div className="error-banner">{error}</div>
          ) : assets.length === 0 ? (
            <p style={{ color: '#64748b', fontStyle: 'italic' }}>No hardware assets are currently linked to this Sales Order.</p>
          ) : (
            <div className="table-responsive">
              <table className="material-table" style={{ width: '100%', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '10px' }}>Asset ID</th>
                    <th style={{ padding: '10px' }}>Product Make</th>
                    <th style={{ padding: '10px' }}>Product Model</th>
                    <th style={{ padding: '10px' }}>Serial Number</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset, index) => (
                    <tr key={index}>
                      <td style={{ padding: '10px', fontWeight: 'bold', color: '#2563eb' }}>{asset.Unique_Product_Id}</td>
                      <td style={{ padding: '10px' }}>{asset.ProductMake}</td>
                      <td style={{ padding: '10px' }}>{asset.ProductModel}</td>
                      <td style={{ padding: '10px', fontFamily: 'monospace' }}>{asset.ProductSerial || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="modal-actions" style={{ borderTop: '1px solid #e2e8f0', padding: '15px 20px' }}>
          <button type="button" className="btn-filled" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
