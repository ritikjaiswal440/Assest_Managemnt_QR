/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import CompanyFormModal from '../components/CompanyFormModal';

export default function CompanyDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      // Assuming assetApi has a method or we do a POST/GET to our unified backend
      // Using generic request logic if not strictly defined in assetApi yet
      const response = await fetch(`${import.meta.env.VITE_ASSET_GAS_API_URL}?route=getCompanies`);
      const result = await response.json();
      if (result.status === 'success') {
        setCompanies(result.data || []);
      } else {
        setError(result.message || 'Failed to fetch companies');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching companies.');
      // Fallback data for UI design & testing while API is barebones
      setCompanies([
        {
          id: 'c-uuid-1',
          name: 'Apex Innovations Ltd',
          amcStart: '2024-01-01',
          amcEnd: '2027-12-31',
          supportTier: 'Comprehensive AMC',
          status: 'Active'
        },
        {
          id: 'c-uuid-2',
          name: 'Vertex Solutions Corp',
          amcStart: '2023-05-01',
          amcEnd: '2026-07-01',
          supportTier: 'Warranty',
          status: 'Active'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleSaveCompany = async (formData) => {
    // In real implementation, this posts to assetApi
    setIsModalOpen(false);
    setLoading(true);
    
    setTimeout(() => {
      if (formData.id) {
        setCompanies(prev => prev.map(c => c.id === formData.id ? formData : c));
      } else {
        setCompanies(prev => [...prev, { ...formData, id: 'c-new-' + Date.now() }]);
      }
      setLoading(false);
    }, 500);
  };

  const getAmcBadge = (amcEndDate) => {
    if (!amcEndDate) return { text: 'Unknown', className: 'retired' };
    
    const end = new Date(amcEndDate);
    const today = new Date(); // In testing, could be '2026-06-16'
    
    if (isNaN(end.getTime())) {
      return { text: 'Invalid Date', className: 'retired' };
    }
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Expired', className: 'expired' }; // Custom red style
    } else if (diffDays <= 30) {
      return { text: 'Expiring Soon', className: 'expiring-soon' }; // Custom yellow style
    } else {
      return { text: 'Active', className: 'active' }; // Custom green style
    }
  };

  return (
    <section className="table-card">
      <div className="table-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="filter-bar">
          {/* Simple filter bar placeholder */}
          <input type="text" placeholder="Search Companies..." className="md3-input" style={{ padding: '8px 16px', borderRadius: '20px' }} />
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
                <th>Support_Type</th>
                <th>AMC_End_Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((comp) => {
                const badge = getAmcBadge(comp.amcEnd);
                return (
                  <tr key={`${comp.id}-${comp.name}`}>
                    <td className="bold-cell">{comp.id}</td>
                    <td>{comp.name}</td>
                    <td><span className="tier-badge">{comp.supportTier}</span></td>
                    <td>{comp.amcEnd}</td>
                    <td>
                      <span className={`status-badge ${badge.className}`}>
                        {badge.text}
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
              {companies.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center' }}>No companies found.</td>
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
