import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { 
  ShieldCheck, 
  Menu, 
  X, 
  ArrowRight, 
  LogIn, 
  LogOut, 
  User 
} from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Handle Escape key to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
  };

  return (
    <header className="navbar" role="banner">
      <div className="container navbar__container">
        {/* Brand Link */}
        <Link 
          to="/" 
          className="navbar__brand" 
          onClick={closeMobileMenu}
          aria-label="FindReal Home - Media Verification Platform"
        >
          <div className="navbar__brand-badge" aria-hidden="true">
            <ShieldCheck size={20} className="navbar__brand-icon" />
          </div>
          <div className="navbar__brand-meta">
            <span className="navbar__brand-name">FindReal</span>
            <span className="navbar__brand-tagline">Verify Before You Trust</span>
          </div>
        </Link>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className="navbar__mobile-toggle"
          onClick={toggleMobileMenu}
          aria-expanded={mobileMenuOpen}
          aria-controls="primary-navigation"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>

        {/* Main Navigation (Desktop & Mobile Drawer) */}
        <nav 
          id="primary-navigation"
          className={`navbar__nav ${mobileMenuOpen ? 'navbar__nav--open' : ''}`}
          aria-label="Main Navigation"
        >
          <ul className="navbar__list" role="list">
            <li>
              <Link 
                to="/" 
                className={`navbar__link ${location.pathname === '/' ? 'navbar__link--active' : ''}`}
                onClick={closeMobileMenu}
                aria-current={location.pathname === '/' ? 'page' : undefined}
              >
                Home
              </Link>
            </li>
            <li>
              <Link 
                to="/analyze" 
                className={`navbar__link ${location.pathname === '/analyze' ? 'navbar__link--active' : ''}`}
                onClick={closeMobileMenu}
                aria-current={location.pathname === '/analyze' ? 'page' : undefined}
              >
                Analyze
              </Link>
            </li>
            {isAuthenticated && (
              <li>
                <Link 
                  to="/history" 
                  className={`navbar__link ${location.pathname === '/history' ? 'navbar__link--active' : ''}`}
                  onClick={closeMobileMenu}
                  aria-current={location.pathname === '/history' ? 'page' : undefined}
                >
                  History
                </Link>
              </li>
            )}
            <li>
              <Link 
                to="/about" 
                className={`navbar__link ${location.pathname === '/about' ? 'navbar__link--active' : ''}`}
                onClick={closeMobileMenu}
                aria-current={location.pathname === '/about' ? 'page' : undefined}
              >
                About
              </Link>
            </li>
          </ul>

          {/* Action / Auth Buttons */}
          <div className="navbar__actions">
            {isAuthenticated ? (
              <div className="navbar__user-group">
                <div className="navbar__user-badge">
                  <User size={14} className="user-icon" aria-hidden="true" />
                  <span className="user-name">{user?.name || 'Analyst'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="navbar__action-logout"
                  aria-label="Log out of FindReal"
                >
                  <LogOut size={15} aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="navbar__action-login"
                  onClick={closeMobileMenu}
                >
                  <LogIn size={15} aria-hidden="true" />
                  <span>Login</span>
                </Link>
                <Link 
                  to="/register" 
                  className="navbar__action-cta"
                  onClick={closeMobileMenu}
                >
                  <span>Get Started</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
