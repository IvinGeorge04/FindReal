import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { User, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import './Register.css';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Password rule checks
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumber;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('Please fill in all required registration fields.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMessage('Password does not meet the specified security criteria.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(name, email, password);
    setIsSubmitting(false);

    if (result.success) {
      navigate('/analyze', { replace: true });
    } else {
      setErrorMessage(result.error || 'Registration failed. Please try again.');
    }
  };

  return (
    <main id="main-content" className="register-page">
      <div className="container register-page__container">
        <div className="register-card-wrap">
          <Card
            title="Create Analyst Account"
            subtitle="Register for authenticated media verification access"
            icon={ShieldCheck}
            elevation="xl"
          >
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {/* Security Protocol Banner */}
              <div className="auth-security-notice">
                <ShieldCheck size={16} className="text-cyan" aria-hidden="true" />
                <span>Protected by Bcryptjs Password Hashing & Rate Limiting</span>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="auth-error-alert" role="alert">
                  <AlertCircle size={16} className="auth-error-icon" aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Full Name Field */}
              <div className="form-field">
                <label htmlFor="reg-name" className="form-label">
                  Full Name
                </label>
                <div className="form-input-wrap">
                  <User size={17} className="form-input-icon" aria-hidden="true" />
                  <input
                    id="reg-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Jane Doe"
                    className="form-input"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="form-field">
                <label htmlFor="reg-email" className="form-label">
                  Work / Personal Email
                </label>
                <div className="form-input-wrap">
                  <Mail size={17} className="form-input-icon" aria-hidden="true" />
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@research.org"
                    className="form-input"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-field">
                <label htmlFor="reg-password" className="form-label">
                  Password
                </label>
                <div className="form-input-wrap">
                  <Lock size={17} className="form-input-icon" aria-hidden="true" />
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters with mix of cases & numbers"
                    className="form-input"
                    autoComplete="new-password"
                    required
                  />
                </div>

                {/* Password Criteria Checklist */}
                <div className="password-criteria" aria-live="polite">
                  <span className={`criteria-tag ${hasMinLength ? 'criteria-tag--met' : ''}`}>
                    <CheckCircle2 size={12} aria-hidden="true" /> 8+ chars
                  </span>
                  <span className={`criteria-tag ${hasUppercase ? 'criteria-tag--met' : ''}`}>
                    <CheckCircle2 size={12} aria-hidden="true" /> Uppercase
                  </span>
                  <span className={`criteria-tag ${hasLowercase ? 'criteria-tag--met' : ''}`}>
                    <CheckCircle2 size={12} aria-hidden="true" /> Lowercase
                  </span>
                  <span className={`criteria-tag ${hasNumber ? 'criteria-tag--met' : ''}`}>
                    <CheckCircle2 size={12} aria-hidden="true" /> Number
                  </span>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="form-field">
                <label htmlFor="reg-confirm-password" className="form-label">
                  Confirm Password
                </label>
                <div className="form-input-wrap">
                  <Lock size={17} className="form-input-icon" aria-hidden="true" />
                  <input
                    id="reg-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat chosen password"
                    className="form-input"
                    autoComplete="new-password"
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
                ariaLabel="Complete analyst registration"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="icon-spin" aria-hidden="true" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </>
                )}
              </Button>

              {/* Footer Switch */}
              <div className="auth-switch-link">
                <span>Already have an account?</span>{' '}
                <Link to="/login" className="switch-anchor">
                  Sign in here
                </Link>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
  );
}
