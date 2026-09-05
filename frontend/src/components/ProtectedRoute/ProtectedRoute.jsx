import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import './ProtectedRoute.css';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading-screen" role="status" aria-label="Verifying authentication session">
        <div className="auth-loading-box">
          <Loader2 size={32} className="auth-loading-spinner" aria-hidden="true" />
          <p className="auth-loading-text">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve intended destination for seamless post-login redirect
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return children;
}
