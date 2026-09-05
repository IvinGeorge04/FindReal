import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';
import Card from '../components/Card/Card';
import './AuthPlaceholder.css';

export default function AuthPlaceholder() {
  const location = useLocation();
  const isRegister = location.pathname === '/register';

  return (
    <main id="main-content" className="auth-placeholder-page">
      <div className="container auth-placeholder__container">
        <div className="auth-placeholder__card-wrap">
          <Card
            title={isRegister ? 'Get Started with FindReal' : 'Sign in to FindReal'}
            subtitle={isRegister ? 'Create an analyst account' : 'Access your verification dashboard'}
            icon={Lock}
            elevation="lg"
          >
            <div className="auth-placeholder__body">
              <div className="auth-status-badge">
                <Shield size={16} aria-hidden="true" />
                <span>Authentication Module (JWT & HttpOnly Cookies)</span>
              </div>

              <p className="auth-placeholder__desc">
                User registration, authentication with bcryptjs password hashing, JWT session management via HttpOnly cookies, and rate-limited endpoints are scheduled for the dedicated Authentication phase.
              </p>

              <div className="auth-features-preview">
                <h4>Security Protocols Prepared:</h4>
                <ul className="auth-checklist" role="list">
                  <li><CheckCircle2 size={15} className="auth-check" aria-hidden="true" /> HttpOnly, SameSite, Secure Cookie transport</li>
                  <li><CheckCircle2 size={15} className="auth-check" aria-hidden="true" /> Server-side Zod payload schema validation</li>
                  <li><CheckCircle2 size={15} className="auth-check" aria-hidden="true" /> Express rate-limiting to prevent brute force</li>
                  <li><CheckCircle2 size={15} className="auth-check" aria-hidden="true" /> No client-side storage of sensitive credentials</li>
                </ul>
              </div>

              <div className="auth-actions">
                <Link to="/" className="home-hero__primary-btn">
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Return to Home</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
