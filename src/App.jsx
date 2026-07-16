import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import GlobalNavbar from './components/GlobalNavbar';

// Page Imports
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketRequest from './pages/TicketRequest';
import TrackTicket from './pages/TrackTicket';
import GeneralRequest from './pages/GeneralRequest';

// Standalone Asset & Complaint System Page Imports
import PublicComplaintPortal from './asset-module/pages/PublicComplaintPortal';
import AdminDashboardWrapper from './asset-module/pages/AdminDashboardWrapper';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// Public Route Wrapper (If logged in, skips to Dashboard)
const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  const { isAuthLoading } = useAuth();

  if (isAuthLoading) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Loading System...</div>;
  }

  return (
    <Router>
      <GlobalNavbar />
      <div className="app-content-wrapper" style={{ paddingTop: '64px' }}>
        <Routes>
          {/* The New Unified Homepage */}
          <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
          
          {/* Public / Open Ticket Routes */}
          <Route path="/request" element={<TicketRequest />} />
          <Route path="/track" element={<TrackTicket />} />
          <Route path="/general-request" element={<GeneralRequest />} />
          
          {/* Standalone Asset System: Public QR Complaint Portal */}
          <Route path="/asset/*" element={<PublicComplaintPortal />} />
          
          {/* Auth Gates */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          
          {/* Standalone Asset System: Admin Hub */}
          <Route path="/asset-admin" element={<ProtectedRoute><AdminDashboardWrapper /></ProtectedRoute>} />
          
          {/* Fallback to Home instead of Login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;