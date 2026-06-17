import { useState, useRef } from 'react';
import { assetApi } from '../services/assetApi';
import './BulkDataPanel.css';

export default function BulkDataPanel() {
  const [activeTab, setActiveTab] = useState('assets'); // 'assets' or 'companies'
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  
  // Pre-flight stats
  const [stats, setStats] = useState({ total: 0, valid: 0 });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const parseCSV = (text) => {
    // A lightweight CSV string-to-array parser
    const rows = text.split('\n').filter(row => row.trim() !== '');
    if (rows.length < 2) return [];

    const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const parsedRows = rows.slice(1).map(rowStr => {
      // Handle commas inside quotes
      const values = rowStr.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || rowStr.split(',');
      const rowObj = {};
      
      headers.forEach((header, index) => {
        let val = values[index] ? values[index].trim() : "";
        val = val.replace(/^"|"$/g, ''); // Remove wrapping quotes
        rowObj[header] = val;
      });
      return rowObj;
    });

    return parsedRows;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (fileObj) => {
    if (!fileObj.name.endsWith('.csv')) {
      alert("Please upload a CSV file.");
      return;
    }
    setFile(fileObj);
    setUploadResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = parseCSV(text);
      setParsedData(data);
      setStats({ total: data.length, valid: data.length }); // Basic validation logic can be expanded here
    };
    reader.readAsText(fileObj);
  };

  const handleUpload = async () => {
    if (!parsedData || parsedData.length === 0) return;
    
    setIsUploading(true);
    setUploadResult(null);
    
    const route = activeTab === 'assets' ? 'importAssets' : 'importCompanies';
    
    try {
      const response = await assetApi(route, { rows: parsedData });
      
      if (response && response.success) {
        setUploadResult({
          type: 'success',
          message: response.message || 'Import successful.',
          stats: response.stats
        });
        setFile(null);
        setParsedData(null);
      } else {
        setUploadResult({
          type: 'error',
          message: response?.message || 'Import failed.'
        });
      }
    } catch (err) {
      console.error(err);
      setUploadResult({
        type: 'error',
        message: 'Network error during import.'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleExport = async (type) => {
    setIsUploading(true);
    try {
      const response = await assetApi('exportData', { entityType: type === 'assets' ? 'Assets' : 'Companies' });
      if (response && response.success) {
        // Convert JSON to CSV locally for download
        const data = response.data;
        if (data.length === 0) {
          alert("No data to export.");
          setIsUploading(false);
          return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
          const values = headers.map(header => {
            const escaped = ('' + (row[header] || '')).replace(/"/g, '""');
            return `"${escaped}"`;
          });
          csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        alert("Export failed: " + (response?.message || 'Unknown error'));
      }
    } catch (err) {
      console.error(err);
      alert("Network error during export.");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData(null);
    setUploadResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bulk-data-panel md3-surface">
      <div className="panel-header">
        <h2>Data Operations Hub</h2>
        <div className="tab-switcher">
          <button 
            className={`tab-btn ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => { setActiveTab('assets'); resetForm(); }}
          >
            Asset Registry
          </button>
          <button 
            className={`tab-btn ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => { setActiveTab('companies'); resetForm(); }}
          >
            Company Profiles
          </button>
        </div>
      </div>

      <div className="operations-grid">
        {/* IMPORT ZONE */}
        <div className="operation-zone import-zone">
          <h3>📥 Bulk Import ({activeTab})</h3>
          
          <div 
            className={`drag-drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
          >
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".csv" 
              onChange={handleChange} 
              style={{ display: "none" }} 
            />
            
            {file ? (
              <div className="file-info">
                <span className="file-icon">📄</span>
                <p>{file.name}</p>
                <button className="btn-text" onClick={(e) => { e.stopPropagation(); resetForm(); }}>Clear</button>
              </div>
            ) : (
              <div className="upload-prompt">
                <span className="upload-icon">⬆️</span>
                <p>Drag and drop a .csv file here, or click to browse</p>
                <small>Requires specific column headers mapping to {activeTab}.</small>
              </div>
            )}
          </div>

          {/* Pre-flight Validation Banner */}
          {parsedData && !uploadResult && (
            <div className="validation-banner">
              <h4>Pre-flight Summary</h4>
              <div className="stats-row">
                <div className="stat-box">
                  <span className="stat-val">{stats.total}</span>
                  <span className="stat-label">Rows Detected</span>
                </div>
                <div className="stat-box highlight">
                  <span className="stat-val">Duplication Engine Active</span>
                  <span className="stat-label">Will skip exact matches</span>
                </div>
              </div>
              
              <button 
                className="btn-filled upload-action-btn"
                onClick={handleUpload}
                disabled={isUploading}
              >
                {isUploading ? 'Transmitting Data...' : 'Proceed with Upload'}
              </button>
            </div>
          )}

          {/* Upload Result */}
          {uploadResult && (
            <div className={`result-banner ${uploadResult.type}`}>
              <h4>{uploadResult.type === 'success' ? '✅ Import Complete' : '❌ Import Failed'}</h4>
              <p>{uploadResult.message}</p>
              {uploadResult.stats && (
                <ul className="error-list">
                  <li>Successfully Inserted: {uploadResult.stats.importedCount}</li>
                  <li>Skipped/Duplicates: {uploadResult.stats.skippedCount}</li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* EXPORT ZONE */}
        <div className="operation-zone export-zone">
          <h3>📤 Data Export ({activeTab})</h3>
          <p className="export-desc">
            Download the current verified {activeTab} registry from the database. The resulting payload is a clean CSV file utilizing proper column schemas, perfect for auditing or reporting.
          </p>
          
          <button 
            className="btn-outline export-action-btn"
            onClick={() => handleExport(activeTab)}
            disabled={isUploading}
          >
            {isUploading ? 'Generating Export...' : `Export All ${activeTab === 'assets' ? 'Assets' : 'Companies'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
