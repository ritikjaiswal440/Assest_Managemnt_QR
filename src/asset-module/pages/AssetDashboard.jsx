import { useState, useEffect } from 'react';
import { assetApi } from '../services/assetApi';
import AssetFormModal from '../components/AssetFormModal';

export default function AssetDashboard() {
  const [assets, setAssets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mocked simultaneous fetching since backend may not be fully connected yet.
      const companyRes = await fetch(`${import.meta.env.VITE_ASSET_GAS_API_URL}?route=getCompanies`).catch(() => null);
      let companyData = [];
      if (companyRes && companyRes.ok) {
        const cResult = await companyRes.json();
        if (cResult.status === 'success') companyData = cResult.data || [];
      } else {
        // Fallback mock companies
        companyData = [{ id: 'c-uuid-1', name: 'Apex Innovations Ltd' }, { id: 'c-uuid-2', name: 'Vertex Solutions Corp' }];
      }
      setCompanies(companyData);

      const assetRes = await fetch(`${import.meta.env.VITE_ASSET_GAS_API_URL}?route=getAssets`).catch(() => null);
      if (assetRes && assetRes.ok) {
        const aResult = await assetRes.json();
        if (aResult.status === 'success') {
          setAssets(aResult.data || []);
        } else {
          throw new Error(aResult.message);
        }
      } else {
        throw new Error("API not ready");
      }
    } catch (err) {
      console.error(err);
      // Fallback mock data
      setAssets([
        {
          id: 'AVD/PD/000001',
          uuid: 'uuid-1',
          refCode: 'c-uuid-1',
          companyName: 'Apex Innovations Ltd',
          location: 'Conference Room Alpha',
          productMake: 'Epson',
          productModel: 'EB-L520U',
          assetStatus: 'Active',
          signature: 'abc123xyz'
        },
        {
          id: 'AVD/PD/000002',
          uuid: 'uuid-2',
          refCode: 'c-uuid-1',
          companyName: 'Apex Innovations Ltd',
          location: 'Executive Boardroom',
          productMake: 'Poly',
          productModel: 'Studio X50',
          assetStatus: 'In_Repair',
          signature: 'def456uvw'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAsset = async (formData) => {
    setIsModalOpen(false);
    setLoading(true);
    
    // Fallback Mock save logic
    setTimeout(() => {
      const company = companies.find(c => c.id === formData.refCode);
      const newAsset = {
        ...formData,
        companyName: company ? company.name : 'Unknown',
        signature: 'mock_sig_' + Date.now().toString().slice(-4)
      };

      if (formData.id) {
        setAssets(prev => prev.map(a => a.id === formData.id ? { ...a, ...newAsset } : a));
      } else {
        newAsset.id = 'AVD/PD/NEW' + Math.floor(Math.random() * 1000);
        newAsset.uuid = 'uuid-new-' + Date.now();
        setAssets(prev => [...prev, newAsset]);
      }
      setLoading(false);
    }, 500);
  };

  return (
    <section className="table-card">
      <div className="table-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="filter-bar">
          <input type="text" placeholder="Search Assets..." className="md3-input" style={{ padding: '8px 16px', borderRadius: '20px' }} />
        </div>
        <button 
          className="btn-filled" 
          style={{ borderRadius: '20px' }}
          onClick={() => {
            setEditingAsset(null);
            setIsModalOpen(true);
          }}
        >
          + Add Asset
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-responsive" style={{ marginTop: '16px' }}>
        {loading ? (
          <p>Loading assets...</p>
        ) : (
          <table className="material-table">
            <thead>
              <tr>
                <th>Unique_Product_Id</th>
                <th>Company_Name</th>
                <th>Location</th>
                <th>ProductMake</th>
                <th>ProductModel</th>
                <th>Asset_Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.uuid || asset.id}>
                  <td className="bold-cell">{asset.id}</td>
                  <td>{asset.companyName}</td>
                  <td>{asset.location}</td>
                  <td>{asset.productMake}</td>
                  <td>{asset.productModel}</td>
                  <td>
                    <span className={`status-badge ${asset.assetStatus?.toLowerCase()}`}>
                      {asset.assetStatus}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="row-action-btn"
                      onClick={() => {
                        // Generate the expected QR URL hash structure
                        const qrPath = `#/asset/${asset.id}.${asset.signature}`;
                        window.open(qrPath, '_blank');
                      }}
                    >
                      View QR Link
                    </button>
                    <button 
                      className="row-action-btn"
                      onClick={() => {
                        setEditingAsset(asset);
                        setIsModalOpen(true);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center' }}>No assets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <AssetFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveAsset}
        initialData={editingAsset}
        companies={companies}
      />
    </section>
  );
}
