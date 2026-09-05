import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';
import Card from '../components/Card/Card';
import './AnalyzePlaceholder.css';

export default function AnalyzePlaceholder() {
  return (
    <main id="main-content" className="analyze-placeholder-page">
      <div className="container">
        <div className="analyze-placeholder__hero">
          <div className="analyze-placeholder__badge">
            <UploadCloud size={16} aria-hidden="true" />
            <span>Analysis Gateway</span>
          </div>
          <h1 className="analyze-placeholder__title">
            Media Analysis Pipeline
          </h1>
          <p className="analyze-placeholder__subtitle">
            Upload images, audio, and video for multi-engine forensics, metadata extraction, C2PA manifest verification, and probabilistic AI evaluation.
          </p>
        </div>

        <div className="analyze-placeholder__card-wrap">
          <Card
            title="Analysis Engine Preparedness"
            subtitle="Client interface ready for upload pipeline integration"
            icon={Shield}
            elevation="lg"
          >
            <div className="analyze-placeholder__content">
              <div className="dropzone-mock">
                <UploadCloud size={44} className="dropzone-mock__icon" aria-hidden="true" />
                <h3>Media Uploader Interface</h3>
                <p>Drag and drop image (JPEG, PNG, WebP), audio (MP3, WAV), or video (MP4, WebM)</p>
                <span className="dropzone-mock__hint">Upload engine activation scheduled for next phase</span>
              </div>

              <div className="pipeline-steps-preview">
                <h4>Scheduled Multi-Engine Verification Flow</h4>
                <ul className="pipeline-list" role="list">
                  <li><CheckCircle2 size={16} className="check-icon" aria-hidden="true" /> ExifTool metadata & hardware serial extraction</li>
                  <li><CheckCircle2 size={16} className="check-icon" aria-hidden="true" /> C2PA cryptographic provenance manifest inspection</li>
                  <li><CheckCircle2 size={16} className="check-icon" aria-hidden="true" /> FFmpeg audio-visual stream decomposition</li>
                  <li><CheckCircle2 size={16} className="check-icon" aria-hidden="true" /> Gemini reasoning engine cross-corroboration</li>
                </ul>
              </div>

              <div className="placeholder-actions">
                <Link to="/" className="home-hero__primary-btn">
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Return to Home Overview</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
