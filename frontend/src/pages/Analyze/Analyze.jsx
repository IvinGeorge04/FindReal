import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  UploadCloud, 
  Link as LinkIcon, 
  ShieldCheck, 
  AlertCircle, 
  Search, 
  RefreshCw,
  Info,
  CheckCircle2,
  Lock
} from 'lucide-react';
import api from '../../services/api';
import UploadBox from '../../components/UploadBox/UploadBox';
import MediaPreview from '../../components/MediaPreview/MediaPreview';
import AnalysisProgress, { PIPELINE_STAGES } from '../../components/AnalysisProgress/AnalysisProgress';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import './Analyze.css';

/**
 * Safely cache recent analyses locally so they immediately appear
 * in the History page even when browsing without signing in.
 */
const saveAnalysisToGuestHistory = (analysis) => {
  if (!analysis) return;
  try {
    const existing = JSON.parse(localStorage.getItem('findreal_guest_history') || '[]');
    const id = (analysis._id || analysis.id || '').toString();
    if (!id) return;
    const entry = {
      _id: id,
      id: id,
      mediaName: analysis.mediaName || 'Uploaded Media',
      mediaType: analysis.mediaType || 'image',
      verdict: analysis.verdict || 'INCONCLUSIVE',
      riskLevel: analysis.riskLevel || 'MODERATE CONCERN',
      manipulationRisk: analysis.manipulationRisk ?? 50,
      confidenceScore: analysis.confidenceScore ?? 50,
      createdAt: analysis.createdAt || new Date().toISOString(),
      status: analysis.status || 'completed',
    };
    const safeExisting = Array.isArray(existing) ? existing : [];
    const filtered = safeExisting.filter(e => (e._id || e.id || '').toString() !== id);
    localStorage.setItem('findreal_guest_history', JSON.stringify([entry, ...filtered].slice(0, 50)));
  } catch (e) {}
};

export default function Analyze() {
  const navigate = useNavigate();

  // Navigation Tabs: 'upload' | 'url'
  const [activeTab, setActiveTab] = useState('upload');

  // File Upload State
  const [selectedFile, setSelectedFile] = useState(null);

  // URL Input State
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');

  // Analysis Progress State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('idle'); // 'idle' | 'running' | 'completed' | 'error'
  const [targetMediaInfo, setTargetMediaInfo] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const timerRef = useRef(null);

  // Handle File Selected from UploadBox
  const handleFileSelect = (file) => {
    setSelectedFile(file);
    setTargetMediaInfo({
      name: file.name,
      size: file.size,
      type: file.type || 'Media Asset',
    });
  };

  // Remove File
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setTargetMediaInfo(null);
  };

  // Trigger Analysis for Uploaded File
  const handleStartFileAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisStatus('running');
    setActiveStageIndex(0); // Stage 1: Uploading
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('media', selectedFile);

      // Step 1: Perform secure upload to backend
      const res = await api.post('/v1/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const mediaData = res.data?.data;
      if (mediaData) {
        setTargetMediaInfo({
          name: mediaData.originalName,
          size: mediaData.size,
          type: `${mediaData.type.toUpperCase()} (${mediaData.mimeType})`,
          identifier: mediaData.identifier,
        });
      }

      // Step 2: Binary signature validated by server
      setActiveStageIndex(1);

      // Advance through verification pipeline stages while executing
      let currentStage = 2;
      setActiveStageIndex(currentStage);
      timerRef.current = setInterval(() => {
        setActiveStageIndex((prev) => (prev < 7 ? prev + 1 : prev));
      }, 700);

      // Step 3: Run full forensic pipeline
      const analysisRes = await api.post(
        '/v1/analysis',
        {
          mediaId: mediaData?.mediaId,
          identifier: mediaData?.identifier,
        },
        {
          timeout: 120000, // 120s bounded timeout for multimodal AI pipeline
        }
      );

      clearInterval(timerRef.current);

      const analysis = analysisRes.data?.data?.analysis;
      setActiveStageIndex(8); // Completed stage
      setAnalysisStatus('completed');

      // Cache analysis in guest history so it appears on History page
      saveAnalysisToGuestHistory(analysis);

      // Seamlessly navigate to Results Dashboard
      setTimeout(() => {
        if (analysis) {
          const targetId = analysis._id || analysis.id;
          navigate(`/results/${targetId}`, { state: { analysis } });
        }
      }, 800);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setAnalysisStatus('error');
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Media analysis failed';
      setUploadError(msg);
    }
  };

  // URL Validation
  const validateUrl = (url) => {
    if (!url || !url.trim()) {
      return 'Please enter a valid media URL to analyze.';
    }

    const trimmed = url.trim();

    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must begin with a secure protocol (http:// or https://).';
      }

      // Check if domain is present
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return 'Please enter a fully qualified web domain.';
      }

      return '';
    } catch (e) {
      return 'The specified URL is malformed or invalid.';
    }
  };

  // Trigger Analysis for URL
  const handleStartUrlAnalysis = async (e) => {
    e.preventDefault();
    const error = validateUrl(urlInput);

    if (error) {
      setUrlError(error);
      return;
    }

    setUrlError('');
    setIsAnalyzing(true);
    setAnalysisStatus('running');
    setActiveStageIndex(0); // Stage 1: Ingestion
    setUploadError('');

    setTargetMediaInfo({
      name: urlInput.trim(),
      type: 'External URL Source',
    });

    try {
      // Step 1: Remote SSRF-safe ingestion
      const res = await api.post('/v1/media/url', { url: urlInput.trim() });
      const mediaData = res.data?.data;

      if (mediaData) {
        setTargetMediaInfo({
          name: mediaData.originalName,
          size: mediaData.size,
          type: `${mediaData.type.toUpperCase()} (${mediaData.mimeType})`,
          identifier: mediaData.identifier,
        });
      }

      // Step 2: Binary magic bytes validated
      setActiveStageIndex(1);

      // Advance through stages
      setActiveStageIndex(2);
      timerRef.current = setInterval(() => {
        setActiveStageIndex((prev) => (prev < 7 ? prev + 1 : prev));
      }, 700);

      // Step 3: Run full forensic pipeline with sourceContext
      const analysisRes = await api.post(
        '/v1/analysis',
        {
          mediaId: mediaData?.mediaId,
          identifier: mediaData?.identifier,
          sourceContext: { url: urlInput.trim() },
        },
        {
          timeout: 120000, // 120s bounded timeout for multimodal AI pipeline
        }
      );

      clearInterval(timerRef.current);

      const analysis = analysisRes.data?.data?.analysis;
      setActiveStageIndex(8);
      setAnalysisStatus('completed');

      // Cache analysis in guest history so it appears on History page
      saveAnalysisToGuestHistory(analysis);

      setTimeout(() => {
        if (analysis) {
          const targetId = analysis._id || analysis.id;
          navigate(`/results/${targetId}`, { state: { analysis } });
        }
      }, 800);
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setAnalysisStatus('error');
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'URL ingestion and analysis failed';
      setUploadError(msg);
    }
  };

  // Cancel or Reset Analysis
  const handleCancelAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisStatus('idle');
    setActiveStageIndex(0);
  };

  return (
    <main id="main-content" className="analyze-page">
      <div className="container analyze-page__container">
        {/* Page Header */}
        <section className="analyze-header" aria-labelledby="analyze-heading">
          <div className="analyze-header__badge">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Forensic Submission Gateway</span>
          </div>
          <h1 id="analyze-heading" className="analyze-header__title">
            Analyze Media Authenticity
          </h1>
          <p className="analyze-header__lead">
            Submit media for multi-signal verification. Inspect EXIF metadata, C2PA cryptographic provenance, latent generative diffusion signatures, and source context.
          </p>
        </section>

        {/* IF ANALYSIS IS ACTIVE -> SHOW PROGRESS COMPONENT */}
        {isAnalyzing ? (
          <div className="analyze-progress-wrapper" aria-live="polite">
            <AnalysisProgress
              activeStageIndex={activeStageIndex}
              status={analysisStatus}
              mediaInfo={targetMediaInfo}
              onCancel={handleCancelAnalysis}
              errorMessage={uploadError}
            />

            {/* Non-Fabrication Notice */}
            <div className="analyze-pipeline-notice">
              <Info size={18} className="analyze-pipeline-notice__icon" aria-hidden="true" />
              <div className="analyze-pipeline-notice__text">
                <strong>Forensic Pipeline Architecture Notice:</strong>
                <p>
                  This interface presents the 9 verification stages of FindReal. In accordance with our core engineering rules, <strong>no simulated AI scores or mock results are fabricated</strong>. Full backend multi-engine execution (ExifTool, C2PA, FFmpeg, Gemini) connects in the upcoming pipeline phase.
                </p>
              </div>
            </div>

            <div className="analyze-progress-actions">
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={handleCancelAnalysis}
                ariaLabel="Return to submission options"
              >
                Return to Submission
              </Button>
            </div>
          </div>
        ) : (
          /* SUBMISSION TABS: UPLOAD FILE vs ANALYZE URL */
          <div className="analyze-tabs-card">
            {/* Tab Navigation */}
            <div className="analyze-tabs-nav" role="tablist" aria-label="Media submission methods">
              <button
                type="button"
                role="tab"
                id="tab-upload"
                aria-selected={activeTab === 'upload'}
                aria-controls="panel-upload"
                className={`tab-btn ${activeTab === 'upload' ? 'tab-btn--active' : ''}`}
                onClick={() => {
                  setActiveTab('upload');
                  setUrlError('');
                }}
              >
                <UploadCloud size={18} aria-hidden="true" />
                <span>Upload File</span>
              </button>

              <button
                type="button"
                role="tab"
                id="tab-url"
                aria-selected={activeTab === 'url'}
                aria-controls="panel-url"
                className={`tab-btn ${activeTab === 'url' ? 'tab-btn--active' : ''}`}
                onClick={() => {
                  setActiveTab('url');
                  setUrlError('');
                }}
              >
                <LinkIcon size={18} aria-hidden="true" />
                <span>Analyze From URL</span>
              </button>
            </div>

            {/* TAB PANEL 1: UPLOAD FILE */}
            {activeTab === 'upload' && (
              <div 
                id="panel-upload" 
                role="tabpanel" 
                aria-labelledby="tab-upload"
                className="tab-panel"
              >
                {!selectedFile ? (
                  <UploadBox onFileSelect={handleFileSelect} />
                ) : (
                  <MediaPreview
                    file={selectedFile}
                    onRemove={handleRemoveFile}
                    onAnalyze={handleStartFileAnalysis}
                    isAnalyzing={isAnalyzing}
                  />
                )}
              </div>
            )}

            {/* TAB PANEL 2: ANALYZE FROM URL */}
            {activeTab === 'url' && (
              <div 
                id="panel-url" 
                role="tabpanel" 
                aria-labelledby="tab-url"
                className="tab-panel"
              >
                <form 
                  className="url-form" 
                  onSubmit={handleStartUrlAnalysis} 
                  noValidate
                  aria-label="Submit media URL for analysis"
                >
                  <div className="url-form__field-group">
                    <label htmlFor="media-url-input" className="url-form__label">
                      Media Source URL
                    </label>
                    <p className="url-form__hint">
                      Enter the direct web URL of an image, audio clip, or video recording to inspect.
                    </p>

                    <div className="url-input-wrap">
                      <div className="url-input-icon" aria-hidden="true">
                        <LinkIcon size={18} />
                      </div>
                      <input
                        id="media-url-input"
                        type="url"
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          if (urlError) setUrlError('');
                        }}
                        placeholder="https://example.com/evidence/sample-recording.mp4"
                        className={`url-input ${urlError ? 'url-input--error' : ''}`}
                        aria-invalid={urlError ? 'true' : 'false'}
                        aria-describedby={urlError ? 'url-error-msg' : undefined}
                      />
                    </div>

                    {urlError && (
                      <div id="url-error-msg" className="url-validation-error" role="alert">
                        <AlertCircle size={15} aria-hidden="true" />
                        <span>{urlError}</span>
                      </div>
                    )}
                  </div>

                  {/* Format Notice */}
                  <div className="url-form__info-banner">
                    <Lock size={15} className="info-banner-icon" aria-hidden="true" />
                    <span>
                      URL submission will validate remote response headers, content types, and TLS certificates before ingesting stream bytes.
                    </span>
                  </div>

                  <div className="url-form__actions">
                    <Button
                      type="submit"
                      variant="primary"
                      icon={Search}
                      disabled={isAnalyzing}
                      ariaLabel="Analyze media from URL"
                      className="url-submit-btn"
                    >
                      Analyze URL
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Security & Verification Principles Note */}
        <section className="analyze-footer-info" aria-label="Security and Verification Notice">
          <div className="grid-3">
            <div className="analyze-info-item">
              <CheckCircle2 size={16} className="text-cyan" aria-hidden="true" />
              <span><strong>Client Validation:</strong> Format & extension checking for instant UX guidance.</span>
            </div>
            <div className="analyze-info-item">
              <CheckCircle2 size={16} className="text-cyan" aria-hidden="true" />
              <span><strong>Isolated Ingestion:</strong> Safe container parsing without running active content.</span>
            </div>
            <div className="analyze-info-item">
              <CheckCircle2 size={16} className="text-cyan" aria-hidden="true" />
              <span><strong>Probabilistic Reporting:</strong> Evidence-grounded assessments without false certainty.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
