import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react';
import './NotFound.css';

export default function NotFound() {
  return (
    <main id="main-content" className="not-found-page">
      <div className="container not-found__container">
        <div className="not-found__card">
          <div className="not-found__icon-wrapper" aria-hidden="true">
            <FileQuestion size={48} className="not-found__icon" />
          </div>

          <div className="not-found__badge">
            Error 404 &bull; Missing Record
          </div>

          <h1 className="not-found__title">
            Page or Asset Not Found
          </h1>

          <p className="not-found__desc">
            The verification route, document, or investigative record you requested does not exist or has been relocated.
          </p>

          <div className="not-found__actions">
            <Link to="/" className="not-found__btn-primary">
              <Home size={16} aria-hidden="true" />
              <span>Return to Overview</span>
            </Link>
            <Link to="/analyze" className="not-found__btn-secondary">
              <Search size={16} aria-hidden="true" />
              <span>Analyze Media</span>
            </Link>
          </div>

          <div className="not-found__meta">
            <span>Diagnostic code: <code>STATUS_404_ROUTE_UNDEFINED</code></span>
            <span>Origin: FindReal Forensic Client</span>
          </div>
        </div>
      </div>
    </main>
  );
}
