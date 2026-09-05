import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectPath = location.state?.from || '/analyze';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(redirectPath, { replace: true });
    } else {
      setErrorMessage(result.error || 'Failed to sign in. Please check your credentials.');
    }
  };

  return (
    <main id="main-content" className="login-page">
      <div className="container login-page__container">
        <div className="login-card-wrap">
          <Card
            title="Sign In to FindReal"
            subtitle="Access authenticated forensic verification tools"
            icon={Lock}
            elevation="xl"
          >
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {/* Security Protocol Banner */}
              <div className="auth-security-notice">
                <ShieldCheck size={16} className="text-cyan" aria-hidden="true" />
                <span>Protected by HttpOnly JWT Cookie & Rate Limiting</span>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="auth-error-alert" role="alert">
                  <AlertCircle size={16} className="auth-error-icon" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Field */}
              <div className="form-field">
                <label htmlFor="login-email" className="form-label">
                  Email Address
                </label>
                <div className="form-input-wrap">
                  <Mail size={17} className="form-input-icon" aria-hidden="true" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="analyst@organization.org"
                    className="form-input"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-field">
                <div className="form-label-row">
                  <label htmlFor="login-password" className="form-label">
                    Password
                  </label>
                </div>
                <div className="form-input-wrap">
                  <Lock size={17} className="form-input-icon" aria-hidden="true" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="form-input"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="auth-submit-btn"
                ariaLabel="Sign in to your account"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="icon-spin" aria-hidden="true" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </Button>

              {/* Footer Switch */}
              <div className="auth-switch-link">
                <span>Don&apos;t have an analyst account yet?</span>{' '}
                <Link to="/register" className="switch-anchor">
                  Register for access
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
