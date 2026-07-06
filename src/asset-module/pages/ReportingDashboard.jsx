/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { assetApi } from '../../services/apiClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import './ReportingDashboard.css';

export default function ReportingDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [kpiMetrics, setKpiMetrics] = useState({
    totalAssets: 0, activeWarrantyAssets: 0, comprehensiveAmcAssets: 0,
    dlpAssets: 0, expiredAssets: 0, openComplaints: 0
  });
  
  const [categoryTrends, setCategoryTrends] = useState([]);
  const [brandData, setBrandData] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ brands: [], companies: [], locations: [], rooms: [] });

  // Comprehensive Filter State
  const [filters, setFilters] = useState({
    startDate: '', endDate: '', brand: '',
    companyName: '', location: '', roomName: ''
  });

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await assetApi('getDashboardKPIs', filters);
      if (res && res.success && res.data) {
        setKpiMetrics(res.data.metrics || {});
        setCategoryTrends(res.data.categoryFailures || []);
        setBrandData(res.data.brandDistribution || []);
        setFilterOptions(res.data.filterOptions || { brands: [], companies: [], locations: [], rooms: [] });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({ startDate: '', endDate: '', brand: '', companyName: '', location: '', roomName: '' });
  };

  // Recharts Color Palette for Pie Chart
  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea', '#475569', '#0891b2', '#ea580c'];

  return (
    <div className="reporting-dashboard">
      <div className="dashboard-header">
        <h2>Analytics & Reporting Engine</h2>
      </div>

      {/* ADVANCED GLOBAL FILTERS */}
      <div className="filter-controls md3-surface" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        <div className="filter-group"><label>Start Date</label><input type="date" className="md3-input" name="startDate" value={filters.startDate} onChange={handleFilterChange} /></div>
        <div className="filter-group"><label>End Date</label><input type="date" className="md3-input" name="endDate" value={filters.endDate} onChange={handleFilterChange} /></div>
        
        <div className="filter-group">
          <label>Brand / Make</label>
          <select className="md3-input" name="brand" value={filters.brand} onChange={handleFilterChange}>
            <option value="">All Brands</option>
            {(filterOptions.brands || []).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Company</label>
          <select className="md3-input" name="companyName" value={filters.companyName} onChange={handleFilterChange}>
            <option value="">All Companies</option>
            {(filterOptions.companies || []).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Location</label>
          <select className="md3-input" name="location" value={filters.location} onChange={handleFilterChange}>
            <option value="">All Locations</option>
            {(filterOptions.locations || []).map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Room Name</label>
          <select className="md3-input" name="roomName" value={filters.roomName} onChange={handleFilterChange}>
            <option value="">All Rooms</option>
            {(filterOptions.rooms || []).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-actions" style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}>
          <button className="btn-text" onClick={clearFilters} disabled={loading}>Clear Filters</button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {/* REFINED KPI CARDS */}
      <div className="kpi-grid">
        <div className="kpi-card card-primary"><span className="kpi-title">Total Managed Assets</span><span className="kpi-value">{loading ? '...' : kpiMetrics.totalAssets}</span></div>
        <div className="kpi-card card-error"><span className="kpi-title">Active Complaints</span><span className="kpi-value">{loading ? '...' : kpiMetrics.openComplaints}</span></div>
        <div className="kpi-card card-success"><span className="kpi-title">Active Warranty</span><span className="kpi-value">{loading ? '...' : kpiMetrics.activeWarrantyAssets}</span></div>
        <div className="kpi-card card-warning"><span className="kpi-title">Expired Assets</span><span className="kpi-value">{loading ? '...' : kpiMetrics.expiredAssets}</span></div>
      </div>

      <div className="analytics-layout-grid">
        
        {/* RECHARTS: BAR CHART (Failures by Category) */}
        <div className="chart-panel md3-surface">
          <h3>Hardware Failure Trends</h3>
          <p className="chart-subtitle">Volume of tickets grouped by category</p>
          <div className="recharts-container-box" style={{ marginTop: '20px' }}>
            {loading ? <div className="loading-state">Loading...</div> : categoryTrends.length === 0 ? <div className="empty-state">No data</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryTrends} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} angle={-25} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} allowDecimals={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Incidents" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* RECHARTS: PIE CHART (Asset Distribution by Brand) */}
        <div className="chart-panel md3-surface">
          <h3>Asset Distribution by Brand</h3>
          <p className="chart-subtitle">Proportion of managed hardware makes</p>
          <div className="recharts-container-box" style={{ marginTop: '10px' }}>
            {loading ? <div className="loading-state">Loading...</div> : brandData.length === 0 ? <div className="empty-state">No data</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={brandData} cx="50%" cy="45%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" nameKey="name">
                    {brandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Contract Health Portfolio (Unchanged) */}
        <div className="chart-panel md3-surface">
          <h3>Contract Health Portfolio</h3>
          <p className="chart-subtitle">Overall status of managed infrastructure</p>
          <div className="contract-health-list">
            <div className="health-item"><div className="health-label">Active DLP (New Projects)</div><div className="health-count">{kpiMetrics.dlpAssets}</div></div>
            <div className="health-item"><div className="health-label">Comprehensive AMC</div><div className="health-count" style={{color: '#15803d'}}>{kpiMetrics.comprehensiveAmcAssets}</div></div>
            <div className="health-item warning"><div className="health-label">Expired / Uncovered</div><div className="health-count" style={{color: '#b91c1c'}}>{kpiMetrics.expiredAssets}</div></div>
          </div>
        </div>

      </div>
    </div>
  );
}
