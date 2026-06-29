/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../../services/apiClient';
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
    dlpAssets: 0,             // NEW
    expiredAssets: 0,         // NEW
    openComplaints: 0,
    avgResolutionTimeHours: 0, // NEW
    slaComplianceRate: 100     // NEW
  });
  const [branchHeatmap, setBranchHeatmap] = useState([]); // NEW
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
        setBranchHeatmap(kpiRes.data.branchHeatmap || []); // NEW
        setExpiringAssets(kpiRes.data.expiringSoon || []);
        if (kpiRes.data.filterOptions) {
           setFilterOptions({
             companies: kpiRes.data.filterOptions.companies || [],
             locations: kpiRes.data.filterOptions.locations || [],
             rooms: kpiRes.data.filterOptions.rooms || []
           });
        } else if (filterOptions.companies.length === 0) {
           // Fallback to mock options if backend hasn't been updated yet
           setFilterOptions({
             companies: ['Apex Innovations Ltd', 'Vertex Solutions Corp'],
             locations: ['Conference Room Alpha', 'Executive Boardroom'],
             rooms: ['Alpha', 'Boardroom', 'Training B']
           });
        }
      }

      if (trendsRes && trendsRes.success && trendsRes.data) {
        setFailureTrends(trendsRes.data || []);
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

      {/* EXECUTIVE KPI ROW */}
      <div className="kpi-grid">
        <div className="kpi-card card-primary">
          <span className="kpi-title">Total Managed Assets</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.totalAssets}</span>
        </div>
        <div className="kpi-card card-success">
          <span className="kpi-title">SLA Compliance Rate</span>
          <span className="kpi-value">{loading ? '...' : `${kpiMetrics.slaComplianceRate}%`}</span>
        </div>
        <div className="kpi-card card-info">
          <span className="kpi-title">Avg. MTTR (Hours)</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.avgResolutionTimeHours}</span>
        </div>
        <div className="kpi-card card-error">
          <span className="kpi-title">Active Support Tickets</span>
          <span className="kpi-value">{loading ? '...' : kpiMetrics.openComplaints}</span>
        </div>
      </div>

      <div className="analytics-layout-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', marginBottom: '24px' }}>
        
        {/* PANEL 1: Hardware Failure Trends */}
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

        {/* PANEL 2: Branch Incident Heatmap (NEW) */}
        <div className="chart-panel md3-surface">
          <h3>Branch Incident Heatmap</h3>
          <p className="chart-subtitle">Locations generating the most support volume</p>
          <div className="custom-bar-chart">
            {loading ? (
              <div className="loading-state">Analyzing branches...</div>
            ) : branchHeatmap.length === 0 ? (
              <div className="empty-state">No branch data available.</div>
            ) : (
              branchHeatmap.map((b, index) => {
                const max = Math.max(...branchHeatmap.map(x => x.count));
                const percentage = (b.count / max) * 100;
                return (
                  <div className="bar-row" key={index}>
                    <div className="bar-label" title={b.branch}>{b.branch}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${percentage}%`, backgroundColor: '#f59e0b' }}></div>
                    </div>
                    <div className="bar-value" style={{ color: '#b45309', fontWeight: 'bold' }}>{b.count}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 3: Contract Health Portfolio (NEW) */}
        <div className="chart-panel md3-surface">
          <h3>Contract Health Portfolio</h3>
          <p className="chart-subtitle">Overall status of managed infrastructure</p>
          
          <div className="contract-health-list">
            <div className="health-item">
              <div className="health-label">Active DLP (New Projects)</div>
              <div className="health-count">{kpiMetrics.dlpAssets}</div>
            </div>
            <div className="health-item">
              <div className="health-label">Comprehensive AMC</div>
              <div className="health-count" style={{color: '#15803d'}}>{kpiMetrics.comprehensiveAmcAssets}</div>
            </div>
            <div className="health-item">
              <div className="health-label">Standard Warranty</div>
              <div className="health-count" style={{color: '#1d4ed8'}}>{kpiMetrics.activeWarrantyAssets}</div>
            </div>
            <div className="health-item warning">
              <div className="health-label">Expired / Uncovered</div>
              <div className="health-count" style={{color: '#b91c1c'}}>{kpiMetrics.expiredAssets}</div>
            </div>
          </div>
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
  );
}
