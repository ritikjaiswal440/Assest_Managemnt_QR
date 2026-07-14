/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../../services/apiClient';
import AssetFormModal from '../components/AssetFormModal';
import QRLabel from '../components/QRLabel';
import html2canvas from 'html2canvas';

export default function AssetDashboard() {
  // UTILITY: Calculates if a specific date range is currently active
  const getTimelineBadge = (startDate, endDate) => {
    if (!startDate && !endDate) return <span className="status-badge na">N/A</span>;
    
    const now = new Date().getTime();
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    if (now >= start && now <= end) {
      return <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>Active</span>;
    } else if (now > end) {
      return <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>Expired</span>;
    } else {
      return <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 'bold', marginLeft: '6px' }}>Pending</span>;
    }
  };

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

  // Bulk AMC Update State
  const [showBulkAmcModal, setShowBulkAmcModal] = useState(false);
  const [bulkConfig, setBulkConfig] = useState({ salesOrder: '', amcType: 'Comprehensive AMC', startDate: '', endDate: '' });

  const uniqueSalesOrders = [...new Set(assets.map(a => a.Sales_Order || a.salesOrder).filter(Boolean))].sort();

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
        companyData = [
          { id: 'c-uuid-1', name: 'Apex Innovations Ltd', Ref_Code: 'c-uuid-1', Company_Name: 'Apex Innovations Ltd' },
          { id: 'c-uuid-2', name: 'Vertex Solutions Corp', Ref_Code: 'c-uuid-2', Company_Name: 'Vertex Solutions Corp' }
        ];
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
          Unique_Product_Id: 'AVD/PD/000001',
          id: 'AVD/PD/000001',
          uuid: 'uuid-1',
          Ref_Code: 'c-uuid-1',
          refCode: 'c-uuid-1',
          Company_Name: 'Apex Innovations Ltd',
          companyName: 'Apex Innovations Ltd',
          Location: 'Conference Room Alpha',
          location: 'Conference Room Alpha',
          Room_Name: 'Alpha',
          roomName: 'Alpha',
          ProductMake: 'Epson',
          productMake: 'Epson',
          ProductModel: 'EB-L520U',
          productModel: 'EB-L520U',
          ProductSerial: 'EPS12345678',
          productSerial: 'EPS12345678',
          IP_Address: '192.168.1.100',
          ipAddress: '192.168.1.100',
          MAC_ID: '00:1A:2B:3C:4D:5E',
          macId: '00:1A:2B:3C:4D:5E',
          Warranty_Start_Date: '2025-01-01',
          warrantyStartDate: '2025-01-01',
          Warranty_End_Date: '2026-01-01',
          warrantyEndDate: '2026-01-01',
          Warranty_Days_Left: 190,
          warrantyDaysLeft: 190,
          Asset_Status: 'Active',
          assetStatus: 'Active',
          signature: 'abc123xyz'
        },
        {
          Unique_Product_Id: 'AVD/PD/000002',
          id: 'AVD/PD/000002',
          uuid: 'uuid-2',
          Ref_Code: 'c-uuid-1',
          refCode: 'c-uuid-1',
          Company_Name: 'Apex Innovations Ltd',
          companyName: 'Apex Innovations Ltd',
          Location: 'Executive Boardroom',
          location: 'Executive Boardroom',
          Room_Name: 'Boardroom',
          roomName: 'Boardroom',
          ProductMake: 'Poly',
          productMake: 'Poly',
          ProductModel: 'Studio X50',
          productModel: 'Studio X50',
          ProductSerial: 'PLY87654321',
          productSerial: 'PLY87654321',
          IP_Address: '192.168.1.101',
          ipAddress: '192.168.1.101',
          MAC_ID: '00:1A:2B:3C:4D:5F',
          macId: '00:1A:2B:3C:4D:5F',
          Warranty_Start_Date: '2025-02-15',
          warrantyStartDate: '2025-02-15',
          Warranty_End_Date: '2026-02-15',
          warrantyEndDate: '2026-02-15',
          Warranty_Days_Left: 235,
          warrantyDaysLeft: 235,
          Asset_Status: 'In_Repair',
          assetStatus: 'In_Repair',
          signature: 'def456uvw'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = fetchData;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const hashString = window.location.hash;
    const queryString = hashString.includes('?') ? hashString.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    
    const targetSO = params.get('salesOrder');
    
    if (targetSO && assets.length > 0) {
      setSearchTerm(targetSO);
    }
  }, [assets]);

  const handleSaveAsset = async (formData) => {
    setLoading(true);
    
    try {
      const company = companies.find(c => (c.Ref_Code || c.id) === formData.refCode);
      const payload = {
        ...formData,
        companyName: company ? (company.Company_Name || company.name) : 'Unknown'
      };

      if (formData.id) {
        // Update existing
        const response = await assetApi('updateAsset', payload);
        if (response && response.success) {
          const updatedAsset = {
            Unique_Product_Id: formData.id,
            Sales_Order: formData.salesOrder,
            Invoice_No: formData.invoiceNo,
            Ref_Code: formData.refCode,
            Company_Name: formData.companyName,
            Location: formData.location,
            Branch: formData.branch || formData.subLocation || '',
            Sub_Location: formData.branch || formData.subLocation || '',
            Room_Type: formData.roomType,
            Floor: formData.floor,
            Room_Name: formData.roomName,
            ProductMake: formData.productMake,
            ProductModel: formData.productModel,
            ProductSerial: formData.productSerial,
            MAC_ID: formData.macId,
            IP_Address: formData.ipAddress,
            Warranty_Start_Date: formData.warrantyStartDate,
            DLP_Period: formData.dlpPeriod,
            Warranty_End_Date: formData.warrantyEndDate,
            Warranty_Days_Left: formData.warrantyDaysLeft,
            Asset_Status: formData.assetStatus,
            Updated_At: new Date().toISOString()
          };
          setAssets(prev => prev.map(a => {
            const aId = a.Unique_Product_Id || a.UNIQUE_PRODUCT_ID || a.id;
            return aId === formData.id ? { ...a, ...updatedAsset } : a;
          }));
          setIsModalOpen(false);
        } else {
          alert('Failed to update asset: ' + (response?.message || 'Unknown error'));
        }
      } else {
        // Create new
        const response = await assetApi('createAsset', payload);
        if (response && response.success) {
          const newAsset = {
            Unique_Product_Id: response.data.id || response.data.Unique_Product_Id,
            Sales_Order: formData.salesOrder,
            Invoice_No: formData.invoiceNo,
            Ref_Code: response.data.refCode || formData.refCode,
            Company_Name: formData.companyName,
            Location: formData.location,
            Branch: formData.branch || formData.subLocation || '',
            Sub_Location: formData.branch || formData.subLocation || '',
            Room_Type: formData.roomType,
            Floor: formData.floor,
            Room_Name: formData.roomName,
            ProductMake: formData.productMake,
            ProductModel: formData.productModel,
            ProductSerial: formData.productSerial,
            MAC_ID: formData.macId,
            IP_Address: formData.ipAddress,
            Warranty_Start_Date: formData.warrantyStartDate,
            DLP_Period: formData.dlpPeriod,
            Warranty_End_Date: formData.warrantyEndDate,
            Warranty_Days_Left: formData.warrantyDaysLeft,
            Asset_Status: formData.assetStatus,
            Created_At: new Date().toISOString(),
            Updated_At: new Date().toISOString()
          };
          setAssets(prev => [...prev, newAsset]);
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
    const assetId = asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.id || '';
    try {
      // Use assetApi to securely fetch the generated signature
      const response = await assetApi('generateQRSig', { assetId });
      
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

  // 1. ROBUST PNG DOWNLOAD
  const handleDownloadPNG = async () => {
    try {
      const element = document.getElementById('print-label');
      if (!element) throw new Error("Label container 'print-label' not found in DOM.");

      // Capture at 3x scale for crisp thermal printing
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const assetId = printAssetData?.Unique_Product_Id || printAssetData?.UNIQUE_PRODUCT_ID || printAssetData?.id || 'Unknown';
      link.download = `Asset_Label_${assetId}.png`;
      
      // Append, click, and clean up securely
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Download Failed:", error);
      alert("Failed to generate the label image. Check the developer console for details.");
    }
  };

  // 2. ROBUST BROWSER PRINT (Converts to image first to guarantee layout)
  const handlePrintPDFLabel = async () => {
    try {
      const element = document.getElementById('print-label');
      if (!element) throw new Error("Label container 'print-label' not found in DOM.");

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      const assetId = printAssetData?.Unique_Product_Id || printAssetData?.UNIQUE_PRODUCT_ID || printAssetData?.id || 'Asset';
      
      // Open a temporary print window, load the image, print, and auto-close
      const printWindow = window.open('', '_blank');
      if (!printWindow) throw new Error("Popup blocked. Please allow popups to print.");
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Label - ${assetId}</title>
            <style>
              @media print {
                @page { margin: 0; }
                body { margin: 0; display: flex; justify-content: center; align-items: flex-start; }
              }
            </style>
          </head>
          <body style="margin:0; padding: 20px; display:flex; justify-content:center;">
            <img src="${dataUrl}" style="max-width: 100%; height: auto;" onload="window.print(); window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (error) {
      console.error("Print Failed:", error);
      alert("Failed to trigger print dialog. Check the developer console.");
    }
  };

  const filteredAssets = assets.filter(asset => {
    const term = searchTerm.toLowerCase();
    
    const assetId = asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.id || '';
    const company = asset.Company_Name || asset.COMPANY_NAME || asset.companyName || '';
    const location = asset.Location || asset.LOCATION || asset.location || '';
    const serial = asset.ProductSerial || asset.PRODUCTSERIAL || asset.productSerial || '';
    const refCode = asset.Ref_Code || asset.REF_CODE || asset.refCode || '';
    const make = asset.ProductMake || asset.PRODUCTMAKE || asset.productMake || '';
    const model = asset.ProductModel || asset.PRODUCTMODEL || asset.productModel || '';
    
    return (
      String(assetId).toLowerCase().includes(term) ||
      String(company).toLowerCase().includes(term) ||
      String(location).toLowerCase().includes(term) ||
      String(serial).toLowerCase().includes(term) ||
      String(refCode).toLowerCase().includes(term) ||
      String(make).toLowerCase().includes(term) ||
      String(model).toLowerCase().includes(term)
    );
  });

  return (
    <section className="table-card">
      <style>{`
        .md3-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.875rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .md3-btn-primary {
          background-color: var(--primary-action, #2563eb);
          color: white;
        }
        .md3-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .md3-btn-primary:disabled {
          background-color: #cbd5e1;
          color: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }
        .md3-btn-secondary {
          background-color: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }
        .md3-btn-secondary:hover {
          background-color: #e2e8f0;
        }
        .md3-btn-text {
          background: transparent;
          color: #64748b;
        }
        .md3-btn-text:hover {
          background-color: #f1f5f9;
        }
      `}</style>
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
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="table-responsive" style={{ marginTop: '16px' }}>
        {loading ? (
          <p>Loading assets...</p>
        ) : (
          <table className="material-table">
            <thead>
              <tr>
                <th>Asset ID & Ref</th>
                <th>Company & Location</th>
                <th>Hardware Specs</th>
                <th>Serial & Billing</th>
                <th>SLA & Warranty</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets && filteredAssets.length > 0 ? (
                filteredAssets.map((asset, idx) => {
                  // EXACT SCHEMA MAPPING based on Google Sheet Headers
                  const assetId = asset.Unique_Product_Id || asset.UNIQUE_PRODUCT_ID || asset.id || 'N/A';
                  const refCode = asset.Ref_Code || asset.REF_CODE || asset.refCode || 'N/A';
                  const company = asset.Company_Name || asset.COMPANY_NAME || asset.companyName || 'N/A';
                  const location = asset.Location || asset.LOCATION || asset.location || 'N/A';
                  const branch = asset.Branch || asset.Sub_Location || asset.SUB_LOCATION || asset.subLocation || '';
                  const roomInfo = `Flr ${asset.Floor || asset.floor || '-'} | ${asset.Room_Type || asset.roomType || '-'} | ${asset.Room_Name || asset.roomName || '-'}`;
                  const make = asset.ProductMake || asset.PRODUCTMAKE || asset.productMake || '';
                  const model = asset.ProductModel || asset.PRODUCTMODEL || asset.productModel || 'Unknown Model';
                  const serial = asset.ProductSerial || asset.PRODUCTSERIAL || asset.productSerial || 'N/A';
                  const ip = asset.IP_Address || asset.IP_ADDRESS || asset.ipAddress || 'DHCP';
                  const mac = asset.MAC_ID || asset.MAC_Id || asset.macId || 'N/A';
                  const warrantyStart = asset.Warranty_Start_Date || asset.WARRANTY_START_DATE || asset.warrantyStartDate || 'N/A';
                  const warrantyEnd = asset.Warranty_End_Date || asset.WARRANTY_END_DATE || asset.warrantyEndDate || 'N/A';
                  const daysLeft = asset.Warranty_Days_Left || asset.WARRANTY_DAYS_LEFT || asset.warrantyDaysLeft || '-';
                  const status = asset.Asset_Status || asset.ASSET_STATUS || asset.assetStatus || 'Active';

                  // Calculate if DLP period is over
                  const dlpEndVal = asset.DLP_End_Date || asset.DLP_END_DATE || asset.dlpEndDate;
                  let isDlpOver = false;
                  if (dlpEndVal) {
                    const dlpEndDateObj = new Date(dlpEndVal);
                    if (!isNaN(dlpEndDateObj.getTime())) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      dlpEndDateObj.setHours(0, 0, 0, 0);
                      isDlpOver = dlpEndDateObj < today;
                    }
                  }

                  return (
                    <tr key={asset.uuid || asset.id || idx}>
                      {/* Asset ID & Reference */}
                      <td>
                        <div style={{ fontWeight: '600', color: 'var(--primary-action)' }}>{assetId}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Ref: {refCode}</div>
                      </td>

                      {/* Company & Location Stack */}
                      <td>
                        <div style={{ fontWeight: 'bold', color: '#334155' }}>{company}</div>
                        <div style={{ fontSize: '0.8rem', color: '#475569' }}>{location} {branch ? `> ${branch}` : ''}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{roomInfo}</div>
                      </td>

                      {/* Hardware Stack */}
                      <td>
                        <div style={{ fontWeight: '600', color: '#475569' }}>{make}</div>
                        <div style={{ fontSize: '0.85rem', color: '#334155' }}>{model}</div>
                      </td>

                      {/* Serial & Billing Stack */}
                      <td>
                        <div style={{ fontSize: '0.85rem', color: '#334155' }}><span style={{color:'#94a3b8', fontWeight:'bold'}}>S/N:</span> {serial}</div>
                        {/* --- FINANCIAL TRACKING --- */}
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', fontSize: '0.75rem', color: '#64748b' }}>
                          <div><span style={{ fontWeight: 'bold' }}>Sales Order:</span> {asset.Sales_Order || asset.salesOrder || 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', paddingLeft: '8px', marginBottom: '4px' }}>PO: {asset.Purchase_Order || asset.purchaseOrder || 'N/A'}</div>
                          <div><span style={{ fontWeight: 'bold' }}>Invoice No:</span> {asset.Invoice_No || asset.invoiceNo || 'N/A'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', paddingLeft: '8px' }}>
                            Dt: {asset.Invoice_Date || asset.invoiceDate ? new Date(asset.Invoice_Date || asset.invoiceDate).toLocaleDateString('en-GB') : 'No Date'}
                          </div>
                        </div>
                      </td>

                      {/* SLA & Warranty Stack */}
                      <td>
                        {/* --- 4-TIER SLA TIMELINE VIEW --- */}
                        <div style={{ fontSize: '0.75rem', lineHeight: '1.5', minWidth: '220px' }}>
                          
                          {/* 1. DLP Timeline */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#0369a1' }}>DLP:</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#64748b' }}>{asset.DLP_Start_Date ? new Date(asset.DLP_Start_Date).toLocaleDateString('en-GB') : '-'} to {asset.DLP_End_Date ? new Date(asset.DLP_End_Date).toLocaleDateString('en-GB') : '-'}</div>
                              {getTimelineBadge(asset.DLP_Start_Date, asset.DLP_End_Date)}
                            </div>
                          </div>

                          {/* 2. OEM Warranty */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#4f46e5' }}>Warranty:</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#64748b' }}>{asset.Warranty_Start_Date ? new Date(asset.Warranty_Start_Date).toLocaleDateString('en-GB') : '-'} to {asset.Warranty_End_Date ? new Date(asset.Warranty_End_Date).toLocaleDateString('en-GB') : '-'}</div>
                              {getTimelineBadge(asset.Warranty_Start_Date, asset.Warranty_End_Date)}
                            </div>
                          </div>

                          {/* 3. Comprehensive AMC (Inherited or Direct) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', color: '#15803d' }}>Comp. AMC:</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#64748b' }}>{asset.AMC_Start_Date ? new Date(asset.AMC_Start_Date).toLocaleDateString('en-GB') : '-'} to {asset.AMC_End_Date ? new Date(asset.AMC_End_Date).toLocaleDateString('en-GB') : '-'}</div>
                              {getTimelineBadge(asset.AMC_Start_Date, asset.AMC_End_Date)}
                            </div>
                          </div>

                          {/* 4. Non-Comprehensive AMC (Inherited or Direct) */}
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 'bold', color: '#b45309' }}>Non-Comp AMC:</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ color: '#64748b' }}>{asset.NON_CAMC_Start_Date ? new Date(asset.NON_CAMC_Start_Date).toLocaleDateString('en-GB') : '-'} to {asset.NON_CAMC_End_Date ? new Date(asset.NON_CAMC_End_Date).toLocaleDateString('en-GB') : '-'}</div>
                              {getTimelineBadge(asset.NON_CAMC_Start_Date, asset.NON_CAMC_End_Date)}
                            </div>
                          </div>

                        </div>
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          backgroundColor: status.toLowerCase() === 'active' ? '#dcfce7' : '#fee2e2',
                          color: status.toLowerCase() === 'active' ? '#166534' : '#991b1b',
                          display: 'inline-block'
                        }}>
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button 
                            className="row-action-btn"
                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            onClick={() => handlePrintLabel(asset)}
                            disabled={isGeneratingSig}
                          >
                            Print Label
                          </button>
                          <button 
                            className="row-action-btn"
                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                            onClick={() => {
                              setEditingAsset(asset);
                              setIsModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                    No assets found. Awaiting data sync.
                  </td>
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
              <button className="btn-filled" onClick={handleDownloadPNG}>⬇️ Download PNG</button>
              <button className="btn-filled" onClick={handlePrintPDFLabel}>🖨️ Print Label</button>
            </div>
          </div>
        </div>
      )}

      {/* --- BULK AMC UPDATE MODAL --- */}
      {showBulkAmcModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3>Bulk AMC Renewal by Sales Order</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
              Select a Sales Order. All linked assets will have their AMC dates updated instantly.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Target Sales Order *</label>
                <select 
                  value={bulkConfig.salesOrder} 
                  onChange={(e) => setBulkConfig({...bulkConfig, salesOrder: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Select Sales Order --</option>
                  {uniqueSalesOrders.map(so => <option key={so} value={so}>{so}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>Renewal Contract Type *</label>
                <select 
                  value={bulkConfig.amcType} 
                  onChange={(e) => setBulkConfig({...bulkConfig, amcType: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                >
                  <option value="Comprehensive AMC">Comprehensive AMC</option>
                  <option value="Non-Comprehensive AMC">Non-Comprehensive AMC</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>New Start Date *</label>
                  <input type="date" value={bulkConfig.startDate} onChange={(e) => setBulkConfig({...bulkConfig, startDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px' }}>New End Date *</label>
                  <input type="date" value={bulkConfig.endDate} onChange={(e) => setBulkConfig({...bulkConfig, endDate: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="md3-btn md3-btn-text" onClick={() => setShowBulkAmcModal(false)}>Cancel</button>
              <button 
                className="md3-btn md3-btn-primary" 
                disabled={!bulkConfig.salesOrder || !bulkConfig.startDate || !bulkConfig.endDate}
                onClick={async () => {
                  try {
                    const res = await assetApi('bulkUpdateAmcBySalesOrder', bulkConfig);
                    if(res.success) {
                      alert(`Success! ${res.updatedCount || res.data?.updatedCount || 0} assets were updated.`);
                      setShowBulkAmcModal(false);
                      fetchAssets(); // Refresh the table via the alias
                    } else {
                      alert('Update failed: ' + (res.message || 'Unknown error'));
                    }
                  } catch (err) {
                    alert('Error executing bulk update: ' + err.message);
                  }
                }}
              >
                Execute Bulk Update
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
