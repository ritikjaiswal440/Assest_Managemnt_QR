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
  const isClient = user?.role === 'Client';
  const clientCompany = user?.companyName || user?.company;
  
  // Tab/View Navigation state: 'assets' | 'companies' | 'bulk' | 'analytics'
  const [activeTab, setActiveTab] = useState('assets');

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
          {!isClient && (
            <button
              className={`nav-item ${activeTab === 'companies' ? 'active' : ''}`}
              onClick={() => setActiveTab('companies')}
            >
              <span>🏢</span> Company Master
            </button>
          )}
          {!isClient && (
            <button
              className={`nav-item ${activeTab === 'bulk' ? 'active' : ''}`}
              onClick={() => setActiveTab('bulk')}
            >
              <span>🗃️</span> Data Operations
            </button>
          )}
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
            {activeTab === 'bulk' && 'Bulk Operations & Migration'}
            {activeTab === 'analytics' && 'Executive Reporting Engine'}
          </h1>
          <p className="subtitle-date">System Context Time: 2026-06-16</p>
        </header>

        {/* View switching logic */}
        {activeTab === 'assets' && <AssetDashboard isClient={isClient} clientCompany={clientCompany} />}
        {activeTab === 'companies' && !isClient && <CompanyDashboard />}
        {activeTab === 'bulk' && !isClient && <BulkDataPanel />}
        {activeTab === 'analytics' && <ReportingDashboard isClient={isClient} clientCompany={clientCompany} />}
      </main>
    </div>
  );
}

export default AdminDashboardWrapper;
