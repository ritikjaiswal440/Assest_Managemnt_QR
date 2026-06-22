/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../../services/apiClient';
import AssetFormModal from '../components/AssetFormModal';
import QRLabel from '../components/QRLabel';
import html2canvas from 'html2canvas';

export default function AssetDashboard() {
  const [assets, setAssets] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  // Print Label State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printAssetData, setPrintAssetData] = useState(null);
  const [printSignature, setPrintSignature] = useState('');
  const [isGeneratingSig, setIsGeneratingSig] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mocked simultaneous fetching since backend may not be fully connected yet.
      const companyRes = await fetch(`${import.meta.env.VITE_GAS_API_URL}?route=getCompanies`).catch(() => null);
      let companyData = [];
      if (companyRes && companyRes.ok) {
        const cResult = await companyRes.json();
        if (cResult.status === 'success') companyData = cResult.data || [];
      } else {
        // Fallback mock companies
        companyData = [{ id: 'c-uuid-1', name: 'Apex Innovations Ltd' }, { id: 'c-uuid-2', name: 'Vertex Solutions Corp' }];
      }
      setCompanies(companyData);

      const assetRes = await fetch(`${import.meta.env.VITE_GAS_API_URL}?route=getAssets`).catch(() => null);
      if (assetRes && assetRes.ok) {
        const aResult = await assetRes.json();
        if (aResult.status === 'success') {
          setAssets(aResult.data || []);
          setError('');
        } else {
          throw new Error(aResult.message);
        }
      } else {
        throw new Error("API not ready");
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch assets. Operating with sandbox/offline fallback data.');
      // Fallback mock data
      setAssets([
        {
          id: 'AVD/PD/000001',
          uuid: 'uuid-1',
          refCode: 'c-uuid-1',
          companyName: 'Apex Innovations Ltd',
          location: 'Conference Room Alpha',
          roomName: 'Alpha',
          productMake: 'Epson',
          productModel: 'EB-L520U',
          productSerial: 'EPS12345678',
          assetStatus: 'Active',
          signature: 'abc123xyz'
        },
        {
          id: 'AVD/PD/000002',
          uuid: 'uuid-2',
          refCode: 'c-uuid-1',
          companyName: 'Apex Innovations Ltd',
          location: 'Executive Boardroom',
          roomName: 'Boardroom',
          productMake: 'Poly',
          productModel: 'Studio X50',
          productSerial: 'PLY87654321',
          assetStatus: 'In_Repair',
          signature: 'def456uvw'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveAsset = async (formData) => {
    setLoading(true);
    
    try {
      const company = companies.find(c => c.id === formData.refCode);
      const payload = {
        ...formData,
        companyName: company ? company.name : 'Unknown'
      };

      if (formData.id) {
        // Update existing
        const response = await assetApi('updateAsset', payload);
        if (response && response.success) {
          setAssets(prev => prev.map(a => a.id === formData.id ? { ...a, ...response.data } : a));
          setIsModalOpen(false);
        } else {
          alert('Failed to update asset: ' + (response?.message || 'Unknown error'));
        }
      } else {
        // Create new
        const response = await assetApi('createAsset', payload);
        if (response && response.success) {
          setAssets(prev => [...prev, response.data]);
          setIsModalOpen(false);
        } else {
          alert('Failed to create asset: ' + (response?.message || 'Unknown error'));
        }
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving the asset.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrintLabel = async (asset) => {
    setIsGeneratingSig(true);
    try {
      // Use assetApi to securely fetch the generated signature
      const response = await assetApi('generateQRSig', { assetId: asset.id });
      
      if (response && response.success && response.data) {
        setPrintSignature(response.data.signature);
        setPrintAssetData(asset);
        setIsPrintModalOpen(true);
      } else {
        alert("Failed to generate secure QR signature: " + (response?.message || "Unknown error"));
        // Fallback for UI testing
        setPrintSignature(asset.signature || 'mockSig1');
        setPrintAssetData(asset);
        setIsPrintModalOpen(true);
      }
    } catch (err) {
      console.error("Error generating sig:", err);
      alert("Network error generating QR signature.");
      // Fallback for UI testing
      setPrintSignature(asset.signature || 'mockSig1');
      setPrintAssetData(asset);
      setIsPrintModalOpen(true);
    } finally {
      setIsGeneratingSig(false);
    }
  };

  const triggerPrint = () => {
    window.print();
  };

  const handleDownloadLabel = async () => {
    const labelElement = document.getElementById('qr-label-preview');
    if (!labelElement) return;
    try {
      const canvas = await html2canvas(labelElement, { scale: 2, useCORS: true });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${printAssetData?.id || 'Asset'}_Label.png`;
      a.click();
    } catch (err) {
      console.error('Failed to generate label image', err);
      alert('Failed to download label as PNG.');
    }
  };

  const filteredAssets = assets.filter(asset => {
    const term = searchTerm.toLowerCase();
    return (
      (asset.id && asset.id.toLowerCase().includes(term)) ||
      (asset.companyName && asset.companyName.toLowerCase().includes(term)) ||
      (asset.location && asset.location.toLowerCase().includes(term)) ||
      (asset.productSerial && asset.productSerial.toLowerCase().includes(term))
    );
  });

  return (
    <section className="table-card">
      <div className="table-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="filter-bar">
          <input 
            type="text" 
            placeholder="Search Assets..." 
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
              {filteredAssets.map((asset) => (
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
                      onClick={() => handlePrintLabel(asset)}
                      disabled={isGeneratingSig}
                    >
                      Print Label
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
              {filteredAssets.length === 0 && (
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

      {/* Print Modal Overlay */}
      {isPrintModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content md3-surface" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Asset Label Preview</h2>
              <button className="icon-button" onClick={() => setIsPrintModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '20px 0', background: '#f5f5f5', display: 'flex', justifyContent: 'center' }}>
              <div id="qr-label-preview">
                <QRLabel asset={printAssetData} signature={printSignature} />
              </div>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '8px', display: 'flex', flexWrap: 'wrap' }}>
              <button className="btn-filled" onClick={handleDownloadLabel}>⬇️ Download PNG</button>
              <button className="btn-filled" onClick={triggerPrint}>🖨️ Print PDF</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
