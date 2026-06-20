/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import CompanyFormModal from '../components/CompanyFormModal';
import { getCompanies } from '../services/assetApi';

export default function CompanyDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

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

  const handleSaveCompany = (formData) => {
    setIsModalOpen(false);
    
    // The formData comes from CompanyFormModal ONLY after a successful API save.
    // Update the local state synchronously.
    if (formData.Ref_Code && companies.some(c => c.Ref_Code === formData.Ref_Code && c.Company_Name === formData.Company_Name && c.Branch === formData.Branch)) {
      setCompanies(prev => prev.map(c => 
        (c.Ref_Code === formData.Ref_Code && c.Company_Name === formData.Company_Name && c.Branch === formData.Branch) 
          ? formData 
          : c
      ));
    } else {
      setCompanies(prev => [...prev, formData]);
    }
  };

  const filteredCompanies = companies.filter(comp => {
    const term = searchTerm.toLowerCase();
    return (
      (comp.Ref_Code && comp.Ref_Code.toLowerCase().includes(term)) ||
      (comp.Company_Name && comp.Company_Name.toLowerCase().includes(term)) ||
      (comp.Location && comp.Location.toLowerCase().includes(term)) ||
      (comp.Branch && comp.Branch.toLowerCase().includes(term)) ||
      (comp.Primary_Email && comp.Primary_Email.toLowerCase().includes(term))
    );
  });

  return (
    <section className="table-card">
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
                <th>Ref_Code</th>
                <th>Company_Name</th>
                <th>Location</th>
                <th>Branch</th>
                <th>Support_Type</th>
                <th>AMC_Start_Date</th>
                <th>AMC_End_Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((comp, index) => {
                const isExpired = comp.AMC_End_Date ? new Date(comp.AMC_End_Date) < new Date() : false;
                const displayStatus = isExpired ? 'Expired' : (comp.Status || 'Active');
                const displaySupport = isExpired ? 'Out Of Support' : (comp.Support_Type || 'Unknown');
                
                return (
                  <tr key={`${comp.Ref_Code}-${comp.Branch}-${index}`}>
                    <td className="bold-cell">{comp.Ref_Code}</td>
                    <td>{comp.Company_Name}</td>
                    <td>{comp.Location}</td>
                    <td>{comp.Branch}</td>
                    <td>
                      <span className={isExpired ? 'tier-badge out-of-support' : 'tier-badge'}>
                        {displaySupport}
                      </span>
                    </td>
                    <td>{comp.AMC_Start_Date}</td>
                    <td>{comp.AMC_End_Date}</td>
                    <td>
                      <span className={`status-badge ${isExpired ? 'expired' : 'active'}`}>
                        {displayStatus}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="row-action-btn"
                        onClick={() => {
                          setEditingCompany(comp);
                          setIsModalOpen(true);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center' }}>No companies found.</td>
                </tr>
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
      />
    </section>
  );
}
