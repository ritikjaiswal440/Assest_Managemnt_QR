import { useState, useRef } from 'react';
import { exportBulkData, importBulkData } from '../../services/apiClient';
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

  /**
   * RFC 4180 Compliant CSV string to 2D array parser
   */
  const parseCSVToMatrix = (text) => {
    const lines = [];
    let row = [];
    let val = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i+1];
      
      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          val += '"';
          i++; // Skip the second quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          val += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          row.push(val);
          val = '';
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(val);
          // Only push rows that have elements or non-empty first values
          if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
            lines.push(row);
          }
          row = [];
          val = '';
        } else {
          val += char;
        }
      }
    }
    
    if (row.length > 0 || val !== '') {
      row.push(val);
      if (row.length > 1 || (row.length === 1 && row[0] !== '')) {
        lines.push(row);
      }
    }
    
    return lines;
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
      const matrix = parseCSVToMatrix(text);
      if (matrix.length < 2) {
        alert("The uploaded CSV file is empty or missing data rows.");
        resetForm();
        return;
      }
      setParsedData(matrix);
      // Exclude header row for pre-flight stats
      setStats({ total: matrix.length - 1, valid: matrix.length - 1 });
    };
    reader.readAsText(fileObj);
  };

  const handleUpload = async () => {
    if (!parsedData || parsedData.length < 2) return;
    
    setIsUploading(true);
    setUploadResult(null);
    
    const selectedSheet = activeTab === 'assets' ? 'Asset_Master' : 'Company_Master';
    const dataMatrix = parsedData.slice(1); // Exclude headers for append
    
    try {
      const response = await importBulkData(selectedSheet, dataMatrix);
      
      if (response && response.success) {
        setUploadResult({
          type: 'success',
          message: response.message || response.data?.message || 'Import successful.',
          importedCount: response.data?.importedCount || dataMatrix.length
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
    const selectedSheet = type === 'assets' ? 'Asset_Master' : 'Company_Master';
    
    try {
      const response = await exportBulkData(selectedSheet);
      if (response && response.success && Array.isArray(response.data)) {
        const matrix = response.data;
        if (matrix.length === 0) {
          alert("No data to export.");
          setIsUploading(false);
          return;
        }

        // Convert the 2D array to CSV string
        const csvString = matrix.map(row => 
          row.map(val => {
            const strVal = val === null || val === undefined ? '' : String(val);
            const escaped = strVal.replace(/"/g, '""');
            if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
              return `"${escaped}"`;
            }
            return escaped;
          }).join(',')
        ).join('\n');

        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `${selectedSheet}_export_${new Date().toISOString().split('T')[0]}.csv`);
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
          <h3>📥 Bulk Import ({activeTab === 'assets' ? 'Asset_Master' : 'Company_Master'})</h3>
          
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
                <small>Requires specific column headers mapping to {activeTab === 'assets' ? 'Asset_Master' : 'Company_Master'}.</small>
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
                  <span className="stat-val">Append Mode</span>
                  <span className="stat-label">Will insert records to sheets</span>
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
              {uploadResult.importedCount !== undefined && (
                <ul className="error-list">
                  <li>Successfully Inserted: {uploadResult.importedCount} rows</li>
                </ul>
              )}
            </div>
          )}
        </div>

        {/* EXPORT ZONE */}
        <div className="operation-zone export-zone">
          <h3>📤 Data Export ({activeTab === 'assets' ? 'Asset_Master' : 'Company_Master'})</h3>
          <p className="export-desc">
            Download the current verified {activeTab === 'assets' ? 'Asset_Master' : 'Company_Master'} registry from the database. The resulting payload is a clean CSV file utilizing proper column schemas, perfect for auditing or reporting.
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
