/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import CompanyFormModal from '../components/CompanyFormModal';
import { getCompanies } from '../../services/apiClient';

export default function CompanyDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompany, setExpandedCompany] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

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
                                const isExpired = branch.AMC_End_Date ? new Date(branch.AMC_End_Date) < new Date() : false;
                                return (
                                  <div className="branch-card" key={idx}>
                                    
                                    <div className="branch-card-header">
                                      <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{branch.Location} &gt; {branch.Branch}</span>
                                      <span style={{ 
                                        fontSize: '0.7rem', 
                                        padding: '2px 8px', 
                                        borderRadius: '10px', 
                                        background: branch.Status === 'Active' && !isExpired ? '#dcfce7' : '#fee2e2',
                                        color: branch.Status === 'Active' && !isExpired ? '#166534' : '#991b1b',
                                        fontWeight: 'bold'
                                      }}>
                                        {isExpired ? 'Expired' : branch.Status}
                                      </span>
                                    </div>

                                    <div className="branch-stat"><span className="stat-label">Support Tier:</span> <span className="stat-value">{branch.Support_Type || 'Standard'}</span></div>
                                    <div className="branch-stat"><span className="stat-label">AMC Start:</span> <span className="stat-value">{branch.AMC_Start_Date || 'N/A'}</span></div>
                                    <div className="branch-stat"><span className="stat-label">AMC End:</span> <span className="stat-value" style={{ color: isExpired ? '#dc2626' : '#15803d', fontWeight: 'bold' }}>{branch.AMC_End_Date || 'N/A'}</span></div>
                                    
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
    </section>
  );
}
