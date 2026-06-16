import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './GlobalNavbar.css';

const GlobalNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu on resize to desktop dimensions
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <nav className="global-navbar">
      <div className="navbar-container">
        <div className="nav-logo" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}>
          <img src="/logo-1.png" alt="AV Dynamic" className="nav-logo-img" />
          <span className="logo-sub">ProSupport</span>
        </div>

        <button 
          className={`hamburger-menu ${isMobileMenuOpen ? 'open' : ''}`} 
          onClick={toggleMobileMenu}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? '✕' : '≡'}
        </button>

        <div className={`nav-menu-wrapper ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setIsMobileMenuOpen(false)}>
              Home
            </NavLink>
            <NavLink to="/request" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setIsMobileMenuOpen(false)}>
              Submit Request
            </NavLink>
            <NavLink to="/track" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setIsMobileMenuOpen(false)}>
              Track Ticket
            </NavLink>
            {user && (
              <>
                <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setIsMobileMenuOpen(false)}>
                  Ticket Dashboard
                </NavLink>
                <NavLink to="/asset-admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} onClick={() => setIsMobileMenuOpen(false)}>
                  Asset Dashboard
                </NavLink>
              </>
            )}
          </div>
          <div className="nav-auth">
            {user ? (
              <div className="user-profile">
                <span className="user-info">
                  {user.name} <span className="user-role">({user.role})</span>
                </span>
                <button className="btn-logout" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            ) : (
              <button className="btn-login" onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}>
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default GlobalNavbar;
