import React from 'react';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container footer__container">
        {/* Mandatory Probabilistic & Limitations Notice */}
        <div 
          className="footer__notice" 
          role="region" 
          aria-label="Platform Probabilistic Verification Limitations Notice"
        >
          <div className="footer__notice-icon-wrapper" aria-hidden="true">
            <AlertTriangle size={20} className="footer__notice-icon" />
          </div>
          <div className="footer__notice-content">
            <h4 className="footer__notice-title">
              Probabilistic Assessment Notice &bull; Limitations
            </h4>
            <p className="footer__notice-text">
              FindReal media verification assessments are <strong>probabilistic</strong> and derived from forensic metadata, generative artifact heuristics, and cryptographic provenance checks. Assessments are never 100% certain and do not constitute absolute legal proof. Always inspect corroborating context.
            </p>
          </div>
        </div>

        {/* Footer Navigation & Standards Info */}
        <div className="footer__grid">
          <div className="footer__col">
            <div className="footer__brand">
              <Shield size={18} className="footer__brand-icon" aria-hidden="true" />
              <span className="footer__brand-title">FindReal Platform</span>
            </div>
            <p className="footer__col-desc">
              Open standards-aligned media verification platform. Supporting C2PA provenance, ExifTool metadata inspection, and AI synthetic pattern detection.
            </p>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Principles</h4>
            <ul className="footer__list" role="list">
              <li><CheckCircle size={14} className="footer__check" aria-hidden="true" /> Evidence-Based Reasoning</li>
              <li><CheckCircle size={14} className="footer__check" aria-hidden="true" /> Non-Fabrication Rule</li>
              <li><CheckCircle size={14} className="footer__check" aria-hidden="true" /> WCAG AA Accessibility</li>
              <li><CheckCircle size={14} className="footer__check" aria-hidden="true" /> Multi-Modal Support</li>
            </ul>
          </div>

          <div className="footer__col">
            <h4 className="footer__col-title">Taxonomy</h4>
            <ul className="footer__list" role="list">
              <li>VERIFIED PROVENANCE</li>
              <li>LIKELY AUTHENTIC</li>
              <li>INCONCLUSIVE</li>
              <li>SUSPICIOUS</li>
              <li>HIGH MANIPULATION RISK</li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p className="footer__copyright">
            &copy; {new Date().getFullYear()} FindReal. Built with React & Plain CSS. All rights reserved.
          </p>
          <div className="footer__badges">
            <span className="footer__status-badge">Design System v1.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
