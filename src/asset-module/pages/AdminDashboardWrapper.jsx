import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from "../../context/AuthContext";
import './AdminDashboardWrapper.css';
import AssetDashboard from './AssetDashboard';
import CompanyDashboard from './CompanyDashboard';
import BulkDataPanel from '../components/BulkDataPanel';
import ReportingDashboard from './ReportingDashboard';

function AdminDashboardWrapper() {
  const { user, logout } = useAuth();
  
  // Tab/View Navigation state: 'assets' | 'companies' | 'complaints'
  const [activeTab, setActiveTab] = useState('assets');

  const [complaints] = useState([
    {
      id: 'CMP-2026-000001',
      assetId: 'AVD/PD/000001',
      clientName: 'Sarah Connor',
      clientEmail: 'sconnor@apex.com',
      description: 'Projector turns off automatically after 10 minutes with a red indicator flashing.',
      timestamp: '2026-06-16 10:30',
      syncStatus: 'Success', // Cross-system handshake status
      serviceRequestNo: 'SR-PRO-984210',
      billingFlag: 'In Support'
    },
    {
      id: 'CMP-2026-000002',
      assetId: 'AVD/PD/000002',
      clientName: 'John Doe',
      clientEmail: 'jdoe@apex.com',
      description: 'Microphone array not picking up audio during Teams calls.',
      timestamp: '2026-06-16 11:15',
      syncStatus: 'Pending', // Action required / API retry
      serviceRequestNo: 'SR-PRO-PENDING',
      billingFlag: 'Pending Quote' // Flagged Out of Support
    }
  ]);

  // Auth Guard: If not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">🛡️</div>
          <div className="brand-info">
            <h2>AV Asset Admin</h2>
            <p>{user.email || 'Administrator'}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            <span>📦</span> Asset Master
          </button>
          <button
            className={`nav-item ${activeTab === 'companies' ? 'active' : ''}`}
            onClick={() => setActiveTab('companies')}
          >
            <span>🏢</span> Company Master
          </button>
          <button
            className={`nav-item ${activeTab === 'complaints' ? 'active' : ''}`}
            onClick={() => setActiveTab('complaints')}
          >
            <span>🎫</span> Complaint Logs
          </button>
          <button
            className={`nav-item ${activeTab === 'bulk' ? 'active' : ''}`}
            onClick={() => setActiveTab('bulk')}
          >
            <span>🗃️</span> Data Operations
          </button>
          <button
            className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <span>📈</span> Analytics & KPIs
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-content">
        <header className="content-header">
          <h1>
            {activeTab === 'assets' && 'Asset Master Inventory'}
            {activeTab === 'companies' && 'Company Master Registry'}
            {activeTab === 'complaints' && 'QR Complaint Synchronization Hub'}
            {activeTab === 'bulk' && 'Bulk Operations & Migration'}
            {activeTab === 'analytics' && 'Executive Reporting Engine'}
          </h1>
          <p className="subtitle-date">System Context Time: 2026-06-16</p>
        </header>

        {/* View switching logic */}
        {activeTab === 'assets' && <AssetDashboard />}
        {activeTab === 'companies' && <CompanyDashboard />}
        {activeTab === 'bulk' && <BulkDataPanel />}
        {activeTab === 'analytics' && <ReportingDashboard />}

        {activeTab === 'complaints' && (
          <section className="table-card">
            <div className="table-actions-info">
              <div className="info-bar">
                <span>🔄 <strong>Cross-System Integration Mode:</strong> Server-to-server POST triggers automatically to dispatch tickets on verified support coverage.</span>
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="material-table">
                <thead>
                  <tr>
                    <th>Complaint ID</th>
                    <th>Asset Ref</th>
                    <th>Raised By</th>
                    <th>Issue Summary</th>
                    <th>Registered At</th>
                    <th>Triage Dispatch</th>
                    <th>Sync Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id}>
                      <td className="bold-cell">{c.id}</td>
                      <td>{c.assetId}</td>
                      <td>
                        <div className="reporter-cell">
                          <strong>{c.clientName}</strong>
                          <span>{c.clientEmail}</span>
                        </div>
                      </td>
                      <td className="desc-cell">{c.description}</td>
                      <td>{c.timestamp}</td>
                      <td>
                        <span className={`billing-flag ${c.billingFlag.toLowerCase().replace(' ', '-')}`}>
                          {c.billingFlag}
                        </span>
                      </td>
                      <td>
                        <span className={`sync-status ${c.syncStatus.toLowerCase()}`}>
                          {c.syncStatus === 'Success' ? `Synced (${c.serviceRequestNo})` : 'Sync Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboardWrapper;
