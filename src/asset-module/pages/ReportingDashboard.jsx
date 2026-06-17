/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../services/assetApi';
import './ReportingDashboard.css';

export default function ReportingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Data State
  const [kpiMetrics, setKpiMetrics] = useState({
    totalAssets: 0,
    activeWarrantyAssets: 0,
    comprehensiveAmcAssets: 0,
    nonComprehensiveAmcAssets: 0,
    expiredWarrantyAssets: 0,
    openComplaints: 0
  });
  const [failureTrends, setFailureTrends] = useState([]);
  const [expiringAssets, setExpiringAssets] = useState([]);

  // Filter State
  const [filters, setFilters] = useState({
    companyName: '',
    location: '',
    roomName: ''
  });

  // Unique options for filters (mocked/extracted)
  const [filterOptions, setFilterOptions] = useState({
    companies: [],
    locations: [],
    rooms: []
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, trendsRes] = await Promise.all([
        assetApi('getDashboardKPIs', filters),
        assetApi('getFailureTrends', filters)
      ]);

      if (kpiRes && kpiRes.success && kpiRes.data) {
        setKpiMetrics(kpiRes.data.metrics || {});
        setExpiringAssets(kpiRes.data.expiringSoon || []);
      }

      if (trendsRes && trendsRes.success && trendsRes.data) {
        setFailureTrends(trendsRes.data || []);
      }
      
      // Ideally fetch unique companies, locations, rooms separately for the dropdowns. 
      // Mocking options since we don't have a distinct endpoint for them right now.
      if (filterOptions.companies.length === 0) {
        setFilterOptions({
          companies: ['Apex Innovations Ltd', 'Vertex Solutions Corp'],
          locations: ['Conference Room Alpha', 'Executive Boardroom'],
          rooms: ['Alpha', 'Boardroom', 'Training B']
        });
      }

    } catch (err) {
      console.error(err);
      setError("Failed to aggregate analytics. Backend sync error.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Re-fetch when filters change

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ companyName: '', location: '', roomName: '' });
  };

  // Calculate max failure for chart scaling
  const maxFailures = failureTrends.length > 0 ? Math.max(...failureTrends.map(t => t.failures)) : 1;

  // Determine an "extreme" failure threshold (e.g. > 50% of the max, or > arbitrary number)
  const extremeThreshold = Math.max(3, maxFailures * 0.7);

  return (
    <div className="reporting-dashboard">
      <div className="dashboard-header">
        <h2>Analytics & Reporting Engine</h2>
      </div>

      {/* Advanced Filters */}
      <div className="filter-controls md3-surface">
        <div className="filter-group">
          <label>Company</label>
          <select className="md3-input" name="companyName" value={filters.companyName} onChange={handleFilterChange}>
            <option value="">All Companies</option>
            {filterOptions.companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Location</label>
          <select className="md3-input" name="location" value={filters.location} onChange={handleFilterChange}>
            <option value="">All Locations</option>
            {filterOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Room</label>
          <select className="md3-input" name="roomName" value={filters.roomName} onChange={handleFilterChange}>
            <option value="">All Rooms</option>
            {filterOptions.rooms.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="filter-actions">
          <button className="btn-text" onClick={clearFilters} disabled={loading}>Clear Filters</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* KPI Cards Row */}
      <div className="kpi-grid">
        <div className="kpi-card card-primary">
          <span className="kpi-title">Total Assets</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.totalAssets}</span>
        </div>
        <div className="kpi-card card-success">
          <span className="kpi-title">Active Warranty</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.activeWarrantyAssets}</span>
        </div>
        <div className="kpi-card card-info">
          <span className="kpi-title">Comprehensive AMC</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.comprehensiveAmcAssets}</span>
        </div>
        <div className="kpi-card card-warning">
          <span className="kpi-title">Expired Warranty</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.expiredWarrantyAssets}</span>
        </div>
        <div className="kpi-card card-error">
          <span className="kpi-title">Open Complaints</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.openComplaints}</span>
        </div>
      </div>

      <div className="analytics-layout-grid">
        {/* Custom Chart Component: Failure Trends */}
        <div className="chart-panel md3-surface">
          <h3>Hardware Failure Trends</h3>
          <p className="chart-subtitle">Frequency of reported incidents by Make/Model</p>
          
          <div className="custom-bar-chart">
            {loading ? (
              <div className="loading-state">Aggregating trends...</div>
            ) : failureTrends.length === 0 ? (
              <div className="empty-state">No failure data available for the current filters.</div>
            ) : (
              failureTrends.map((trend, index) => {
                const percentage = (trend.failures / maxFailures) * 100;
                const isExtreme = trend.failures >= extremeThreshold;
                const barColor = isExtreme ? '#d93025' : '#1a73e8';

                return (
                  <div className="bar-row" key={index}>
                    <div className="bar-label" title={trend.model}>{trend.model}</div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill" 
                        style={{ width: `${percentage}%`, backgroundColor: barColor }}
                      ></div>
                    </div>
                    <div className="bar-value" style={{ color: barColor }}>
                      {trend.failures} {trend.failures === 1 ? 'incident' : 'incidents'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Deep-Dive List: AMC / Warranty Warning */}
        <div className="deep-dive-panel md3-surface">
          <h3>Action Required: AMC / Warranty Expiring</h3>
          <p className="panel-subtitle">Assets with &lt; 30 days remaining</p>
          
          <div className="table-responsive">
            <table className="material-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Hardware</th>
                  <th>Client</th>
                  <th>Urgency</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{textAlign: 'center'}}>Loading...</td></tr>
                ) : expiringAssets.length === 0 ? (
                  <tr><td colSpan="4" style={{textAlign: 'center'}}>No assets expiring soon.</td></tr>
                ) : (
                  expiringAssets.map((asset) => (
                    <tr key={asset.assetId}>
                      <td className="bold-cell">{asset.assetId}</td>
                      <td>{asset.productMake} {asset.productModel}</td>
                      <td>{asset.companyName}</td>
                      <td>
                        <span className={`urgency-badge ${asset.daysRemaining <= 7 ? 'critical' : 'warning'}`}>
                          {asset.daysRemaining} days
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
