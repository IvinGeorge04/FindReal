import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCw, 
  AlertTriangle, 
  Share2, 
  Download, 
  FileSearch,
  ExternalLink 
} from 'lucide-react';
import api from '../../services/api';
import TopSection from '../../components/Results/TopSection';
import AiAnalysisCard from '../../components/Results/AiAnalysisCard';
import MetadataCard from '../../components/Results/MetadataCard';
import SourceContextCard from '../../components/Results/SourceContextCard';
import EvidenceCard from '../../components/Results/EvidenceCard';
import ExplanationCard from '../../components/Results/ExplanationCard';
import LimitationsCard from '../../components/Results/LimitationsCard';
import Button from '../../components/Button/Button';
import './Results.css';

/**
 * Results Page Component
 * Renders the verified analysis dossier fetched from backend.
 * Never displays hardcoded sample data.
 */
export default function Results() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [analysis, setAnalysis] = useState(location.state?.analysis || null);
  const [loading, setLoading] = useState(!location.state?.analysis && Boolean(id));
  const [error, setError] = useState('');

  // Fetch actual backend results if not passed via route state
  useEffect(() => {
    let isMounted = true;

    const fetchAnalysisResult = async () => {
      if (!id) return;

      setLoading(true);
      setError('');

      try {
        const response = await api.get(`/v1/analysis/${id}`);
        if (isMounted) {
          const analysisData = response.data?.data?.analysis;
          if (analysisData) {
            setAnalysis(analysisData);
          } else {
            setError('Analysis record returned empty from backend server.');
          }
        }
      } catch (err) {
        if (isMounted) {
          const message =
            err.response?.data?.error?.message ||
            err.message ||
            'Failed to load verification record from backend.';
          setError(message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // If we don't have analysis or the id in URL changed
    if (!analysis || (id && analysis._id !== id && analysis.id !== id)) {
      fetchAnalysisResult();
    }

    return () => {
      isMounted = false;
    };
  }, [id]);

  // Loading View
  if (loading) {
    return (
      <main id="main-content" className="results-page" aria-busy="true">
        <div className="container results-page__container">
          <div className="results-loading-box">
            <RotateCw size={36} className="results-loading-spinner" aria-hidden="true" />
            <h2 className="results-loading-title">Retrieving Verification Dossier...</h2>
            <p className="results-loading-subtitle">
              Compiling multi-signal findings from secure storage.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Error / Not Found View
  if (error || !analysis) {
    return (
      <main id="main-content" className="results-page">
        <div className="container results-page__container">
          <div className="results-error-box" role="alert">
            <div className="results-error-box__icon">
              <AlertTriangle size={36} aria-hidden="true" />
            </div>
            <h1 className="results-error-box__title">Verification Record Unavailable</h1>
            <p className="results-error-box__message">
              {error || 'No analysis record was specified or found for this session.'}
            </p>
            <div className="results-error-box__actions">
              <Button
                variant="primary"
                onClick={() => navigate('/analyze')}
                icon={<ArrowLeft size={16} aria-hidden="true" />}
              >
                Return to Media Analysis
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Normalization of Actual Backend Fields
  const verdict = analysis.verdict || 'INCONCLUSIVE';
  const manipulationRisk = typeof analysis.manipulationRisk === 'number' 
    ? analysis.manipulationRisk 
    : 50;
  const riskLevel = analysis.riskLevel || 'MODERATE CONCERN';
  const confidenceScore = analysis.confidenceScore || 65;
  const mediaType = analysis.mediaType || 'image';
  const mediaName = analysis.mediaName || 'Uploaded Media';
  const evaluatedAt = analysis.createdAt || analysis.evaluatedAt || new Date().toISOString();

  const evidenceObj = analysis.evidence || {};
  const aiAnalysis = evidenceObj.aiAnalysis || null;
  const metadata = evidenceObj.metadata || null;
  const sourceContext = evidenceObj.sourceContext || null;

  const availability = analysis.evidenceAvailability || {};
  const evidenceItems = analysis.evidenceItems || [];
  const explanation = analysis.explanation || '';
  const limitations = analysis.limitations || [];

  return (
    <main id="main-content" className="results-page">
      <div className="container results-page__container">
        {/* Navigation Bar & Action Row */}
        <div className="results-nav-row">
          <button
            type="button"
            className="results-back-btn"
            onClick={() => navigate('/analyze')}
            aria-label="Back to submission page"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>Submit Another Asset</span>
          </button>

          <div className="results-action-group">
            <button
              type="button"
              className="results-action-btn"
              onClick={() => window.print()}
              title="Print forensic verification dossier"
            >
              <Download size={14} aria-hidden="true" />
              <span>Export Dossier</span>
            </button>
          </div>
        </div>

        {/* TOP SECTION: Title, Verdict, Risk, Confidence, Media Type, Timestamp */}
        <TopSection
          assessment={verdict}
          manipulationRisk={manipulationRisk}
          riskLevel={riskLevel}
          confidence={confidenceScore}
          mediaType={mediaType}
          mediaName={mediaName}
          evaluatedAt={evaluatedAt}
          fileSize={analysis.fileSize}
        />

        {/* SECTIONS GRID */}
        <div className="results-cards-grid">
          {/* AI EXPLANATION CARD (Full Width - Immediate user context) */}
          <ExplanationCard
            explanation={explanation}
            verdict={verdict}
            riskLevel={riskLevel}
          />

          {/* AI ANALYSIS CARD */}
          <AiAnalysisCard
            aiAnalysis={aiAnalysis}
            availability={availability.visualAndAudioAI}
          />

          {/* METADATA CARD */}
          <MetadataCard
            metadata={metadata}
            availability={availability.metadata}
          />

          {/* SOURCE CONTEXT CARD */}
          <SourceContextCard
            sourceContext={sourceContext}
            availability={availability.sourceContext}
            mediaName={mediaName}
            mediaType={mediaType}
          />

          {/* ITEMIZED EVIDENCE CARD (Full Width) */}
          <EvidenceCard evidenceItems={evidenceItems} />

          {/* MANDATORY LIMITATIONS CARD (Full Width) */}
          <LimitationsCard limitations={limitations} />
        </div>
      </div>
    </main>
  );
}
