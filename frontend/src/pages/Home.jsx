import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  FileSearch, 
  Cpu, 
  Sparkles, 
  Eye, 
  Image as ImageIcon, 
  Mic, 
  Video, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Fingerprint, 
  Globe, 
  HelpCircle,
  Clock,
  Compass,
  FileCheck
} from 'lucide-react';
import VerdictBadge from '../components/VerdictBadge/VerdictBadge';
import EvidenceMeter from '../components/EvidenceMeter/EvidenceMeter';
import Button from '../components/Button/Button';
import Card from '../components/Card/Card';
import './Home.css';

export default function Home() {
  return (
    <main id="main-content" className="home-page">
      {/* 1. HERO SECTION */}
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="container home-hero__container">
          <div className="home-hero__badge">
            <ShieldCheck size={15} className="home-hero__badge-icon" aria-hidden="true" />
            <span>FindReal Media Verification Platform</span>
          </div>

          <h1 id="hero-title" className="home-hero__title">
            Verify Before You Trust.
          </h1>

          <p className="home-hero__subtitle">
            Analyze images, audio, and video for signs of AI generation, manipulation, missing provenance, and other authenticity signals.
          </p>

          <div className="home-hero__cta-group">
            <Link to="/analyze" className="home-hero__primary-btn">
              <span>Analyze Media</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className="home-hero__secondary-btn">
              <span>How It Works</span>
            </a>
          </div>

          {/* 2. VISUAL VERIFICATION DASHBOARD PREVIEW (UI-Only & Illustrative) */}
          <div className="dashboard-preview" aria-label="Illustrative Media Verification Dashboard Preview">
            <div className="dashboard-preview__glass">
              {/* Preview Banner Header */}
              <div className="dashboard-preview__header">
                <div className="dashboard-preview__controls" aria-hidden="true">
                  <span className="dot dot-red"></span>
                  <span className="dot dot-yellow"></span>
                  <span className="dot dot-green"></span>
                </div>
                <div className="dashboard-preview__title">
                  <span className="sample-tag">Illustrative Sample Interface</span>
                  <span className="sample-id">ID: FR-2026-PREVIEW-01 &bull; (Non-live demonstration)</span>
                </div>
                <div className="dashboard-preview__verdict">
                  <VerdictBadge verdict="SUSPICIOUS" size="sm" />
                </div>
              </div>

              {/* Preview Content Grid */}
              <div className="dashboard-preview__grid">
                {/* Left: Media Preview Simulation */}
                <div className="preview-media-pane">
                  <div className="preview-media-pane__viewport">
                    <div className="preview-media-pane__grid-overlay" aria-hidden="true"></div>
                    <div className="preview-media-pane__focal-box" aria-hidden="true">
                      <span className="focal-tag">Region 01: Diffusion Pattern Anomaly</span>
                    </div>
                    <div className="preview-media-pane__placeholder">
                      <ImageIcon size={48} className="preview-media-icon" aria-hidden="true" />
                      <span className="preview-media-label">Simulated Visual Sample &bull; Multi-Spectrum Inspection</span>
                    </div>
                  </div>
                  <div className="preview-media-pane__meta">
                    <span>File: <code>sample_press_briefing.jpg</code></span>
                    <span>Resolution: 3840 &times; 2160</span>
                    <span>Container: JPEG / JFIF</span>
                  </div>
                </div>

                {/* Right: Forensic Inspection Panels */}
                <div className="preview-forensic-pane">
                  {/* Risk Probability Meter */}
                  <div className="preview-forensic-pane__card">
                    <EvidenceMeter
                      value={74}
                      label="Probabilistic Manipulation Risk"
                      description="Multiple synthetic diffusion markers detected; hardware provenance absent."
                      verdict="SUSPICIOUS"
                    />
                  </div>

                  {/* 4 Multi-Signal Evidence Cards */}
                  <div className="preview-signals-grid">
                    {/* Signal 1: AI Analysis */}
                    <div className="signal-mini-card">
                      <div className="signal-mini-card__header">
                        <Cpu size={15} className="signal-icon signal-icon--orange" aria-hidden="true" />
                        <span className="signal-title">AI Generative Analysis</span>
                      </div>
                      <p className="signal-desc">
                        Latent diffusion frequency harmonics detected across fine textures.
                      </p>
                      <span className="signal-status status-suspicious">Anomalies Detected</span>
                    </div>

                    {/* Signal 2: Provenance (C2PA) */}
                    <div className="signal-mini-card">
                      <div className="signal-mini-card__header">
                        <Fingerprint size={15} className="signal-icon signal-icon--amber" aria-hidden="true" />
                        <span className="signal-title">C2PA Provenance</span>
                      </div>
                      <p className="signal-desc">
                        No cryptographic Content Credentials manifest found in asset stream.
                      </p>
                      <span className="signal-status status-missing">Manifest Missing</span>
                    </div>

                    {/* Signal 3: Metadata Integrity */}
                    <div className="signal-mini-card">
                      <div className="signal-mini-card__header">
                        <FileSearch size={15} className="signal-icon signal-icon--blue" aria-hidden="true" />
                        <span className="signal-title">Metadata & EXIF</span>
                      </div>
                      <p className="signal-desc">
                        ExifTool indicates camera hardware serial tags were stripped prior to upload.
                      </p>
                      <span className="signal-status status-incomplete">Stripped Metadata</span>
                    </div>

                    {/* Signal 4: Context & Source */}
                    <div className="signal-mini-card">
                      <div className="signal-mini-card__header">
                        <Globe size={15} className="signal-icon signal-icon--emerald" aria-hidden="true" />
                        <span className="signal-title">Source Context</span>
                      </div>
                      <p className="signal-desc">
                        Earliest matching indexed appearance detected within the last 48 hours.
                      </p>
                      <span className="signal-status status-recent">Recent Propagation</span>
                    </div>
                  </div>

                  {/* Narrative Explanation */}
                  <div className="preview-narrative">
                    <h4 className="preview-narrative__title">Forensic Assessment Summary</h4>
                    <p className="preview-narrative__text">
                      Visual evidence exhibits high spectral density artifacts consistent with synthetic generative diffusion models. Combined with missing hardware EXIF provenance, the asset is assessed as <strong>SUSPICIOUS</strong>. This assessment is probabilistic; corroborate with primary context.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. SECTION: WHY FINDREAL? */}
      <section className="section section--alt" aria-labelledby="why-title">
        <div className="container">
          <div className="section-header">
            <span className="section-header__badge">Why FindReal?</span>
            <h2 id="why-title" className="section-header__title">
              In an Age of Generative AI, Sight Alone Is No Longer Proof
            </h2>
            <p className="section-header__desc">
              Synthetic media, deepfake voice clones, and subtle pixel manipulations are increasingly indistinguishable to the naked eye. FindReal brings scientific transparency to digital forensics.
            </p>
          </div>

          <div className="grid-3">
            <Card
              title="Beyond Human Perception"
              subtitle="Generative artifact analysis"
              icon={Eye}
              elevation="md"
            >
              <p className="card-text">
                Diffusion models and generative adversarial networks leave mathematical signatures in the frequency domain that humans cannot see. We analyze noise distributions and latent patterns.
              </p>
            </Card>

            <Card
              title="The Provenance Gap"
              subtitle="Cryptographic tracking"
              icon={Fingerprint}
              elevation="md"
            >
              <p className="card-text">
                Social media platforms strip camera EXIF data and timestamps upon upload. FindReal inspects C2PA cryptographic manifests to reconstruct the asset&apos;s digital chain of custody.
              </p>
            </Card>

            <Card
              title="Probabilistic Transparency"
              subtitle="Zero false 100% claims"
              icon={AlertTriangle}
              elevation="md"
            >
              <p className="card-text">
                We reject irresponsible &ldquo;100% REAL&rdquo; or &ldquo;100% FAKE&rdquo; marketing labels. Digital forensics is probabilistic; our platform details confidence levels, evidence signals, and limitations.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. SECTION: WHAT WE ANALYZE */}
      <section className="section" aria-labelledby="what-title">
        <div className="container">
          <div className="section-header">
            <span className="section-header__badge">Multi-Modal Scope</span>
            <h2 id="what-title" className="section-header__title">
              Comprehensive Multi-Format Media Verification
            </h2>
            <p className="section-header__desc">
              Manipulations rarely occur in isolation. FindReal is designed to support three core media modalities with dedicated forensic pipelines.
            </p>
          </div>

          <div className="grid-3">
            {/* Image Modality */}
            <div className="modality-card">
              <div className="modality-card__icon-wrap">
                <ImageIcon size={28} className="modality-icon" aria-hidden="true" />
              </div>
              <h3 className="modality-card__title">Image Verification</h3>
              <p className="modality-card__desc">
                Forensic inspection of still photographs, graphics, and digital artwork.
              </p>
              <ul className="modality-card__list" role="list">
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> EXIF & Camera Hardware Consistency</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Latent Diffusion Texture Artifacts</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Error Level & Compression Splicing</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> C2PA Content Credentials Manifests</li>
              </ul>
            </div>

            {/* Audio Modality */}
            <div className="modality-card">
              <div className="modality-card__icon-wrap">
                <Mic size={28} className="modality-icon" aria-hidden="true" />
              </div>
              <h3 className="modality-card__title">Audio & Voice Inspection</h3>
              <p className="modality-card__desc">
                Acoustic analysis for voice cloning, neural speech synthesis, and audio splices.
              </p>
              <ul className="modality-card__list" role="list">
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Neural Vocoder Spectral Signatures</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Unnatural Formant & Breathing Patterns</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Phase & Background Noise Discontinuity</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Temporal Audio Splicing Detection</li>
              </ul>
            </div>

            {/* Video Modality */}
            <div className="modality-card">
              <div className="modality-card__icon-wrap">
                <Video size={28} className="modality-icon" aria-hidden="true" />
              </div>
              <h3 className="modality-card__title">Video & Deepfake Analysis</h3>
              <p className="modality-card__desc">
                Frame-by-frame and stream-level evaluation of motion video recordings.
              </p>
              <ul className="modality-card__list" role="list">
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Facial Boundary & Warp Irregularities</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Temporal Frame-to-Frame Jitter</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Audio-Visual Phoneme Synchronization</li>
                <li><CheckCircle2 size={15} className="list-check" aria-hidden="true" /> Container & Stream Bitrate Inspection</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: HOW IT WORKS */}
      <section id="how-it-works" className="section section--alt" aria-labelledby="how-title">
        <div className="container">
          <div className="section-header">
            <span className="section-header__badge">Workflow Pipeline</span>
            <h2 id="how-title" className="section-header__title">
              From Upload to Multi-Signal Evidence
            </h2>
            <p className="section-header__desc">
              A 5-stage sequential architecture engineered for forensic rigor, security, and user clarity.
            </p>
          </div>

          <div className="steps-flow">
            {/* Step 1 */}
            <div className="step-item">
              <div className="step-item__number">01</div>
              <div className="step-item__content">
                <h3 className="step-item__title">Upload</h3>
                <p className="step-item__desc">
                  Submit image, audio, or video files securely through our client uploader. Files are handled in isolated, ephemeral processing spaces.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="step-item">
              <div className="step-item__number">02</div>
              <div className="step-item__content">
                <h3 className="step-item__title">Validate</h3>
                <p className="step-item__desc">
                  Server-side magic byte inspection validates true container types and checks for malformed payload structures or embedded exploits.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="step-item">
              <div className="step-item__number">03</div>
              <div className="step-item__content">
                <h3 className="step-item__title">Analyze</h3>
                <p className="step-item__desc">
                  ExifTool extracts metadata, FFmpeg inspects stream structures, and cryptographic libraries probe for C2PA provenance manifests.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="step-item">
              <div className="step-item__number">04</div>
              <div className="step-item__content">
                <h3 className="step-item__title">Verify</h3>
                <p className="step-item__desc">
                  The backend reasoning engine correlates multi-signal data, identifying conflicts between visual markers, timestamps, and claims.
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="step-item">
              <div className="step-item__number">05</div>
              <div className="step-item__content">
                <h3 className="step-item__title">Understand</h3>
                <p className="step-item__desc">
                  Review an evidence-grounded report with probabilistic confidence scores, specific anomaly locations, and explicit limitations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION: EVIDENCE-BASED VERIFICATION */}
      <section className="section" aria-labelledby="evidence-title">
        <div className="container">
          <div className="section-header">
            <span className="section-header__badge">Forensic Pillars</span>
            <h2 id="evidence-title" className="section-header__title">
              Evidence-Based Verification
            </h2>
            <p className="section-header__desc">
              Authenticity cannot be reduced to a single score. FindReal synthesizes five distinct evidentiary layers before formulating an assessment.
            </p>
          </div>

          <div className="pillars-grid">
            {/* Pillar 1 */}
            <div className="pillar-card">
              <div className="pillar-card__icon pillar-icon--violet">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <h3 className="pillar-card__title">1. AI Pattern Analysis</h3>
              <p className="pillar-card__desc">
                Neural heuristics inspect frequency-domain distributions, generative texture smoothing, and facial geometry inconsistencies characteristic of synthetic media models.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="pillar-card">
              <div className="pillar-card__icon pillar-icon--cyan">
                <FileSearch size={22} aria-hidden="true" />
              </div>
              <h3 className="pillar-card__title">2. Technical Metadata</h3>
              <p className="pillar-card__desc">
                ExifTool deep inspection evaluates device make, camera lens profiles, exposure tags, editing software fingerprints, and historical revision markers.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="pillar-card">
              <div className="pillar-card__icon pillar-icon--emerald">
                <Fingerprint size={22} aria-hidden="true" />
              </div>
              <h3 className="pillar-card__title">3. Provenance & C2PA</h3>
              <p className="pillar-card__desc">
                Cryptographic manifest verification verifies whether the asset carries certified Content Credentials from cameras, editors, or accredited publishers.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="pillar-card">
              <div className="pillar-card__icon pillar-icon--amber">
                <Clock size={22} aria-hidden="true" />
              </div>
              <h3 className="pillar-card__title">4. Source & Temporal Context</h3>
              <p className="pillar-card__desc">
                Timeline tracking assesses when the media first surfaced online, detecting re-captioned historical assets circulated out of context as breaking news.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className="pillar-card">
              <div className="pillar-card__icon pillar-icon--blue">
                <FileCheck size={22} aria-hidden="true" />
              </div>
              <h3 className="pillar-card__title">5. Fact-Checking Integration</h3>
              <p className="pillar-card__desc">
                Correlation against verified public claim registries helps uncover previously debunked hoaxes, false claims, and manipulated viral narratives.
              </p>
            </div>
          </div>

          {/* Critical Non-Certainty Callout Box */}
          <div className="core-rule-box" role="region" aria-label="Core Principle: No Single Signal Proves Authenticity">
            <AlertTriangle size={24} className="core-rule-icon" aria-hidden="true" />
            <div className="core-rule-content">
              <h4 className="core-rule-title">Core Principle: No Single Signal Proves Authenticity</h4>
              <p className="core-rule-text">
                An image with valid EXIF metadata can still contain generative elements. An asset lacking C2PA provenance may simply have been shared through a social platform that strips headers. FindReal always evaluates the totality of evidence and communicates uncertainty honestly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="section section--final-cta" aria-labelledby="cta-title">
        <div className="container final-cta__container">
          <div className="final-cta__content">
            <span className="final-cta__badge">Start Verifying</span>
            <h2 id="cta-title" className="final-cta__title">
              Don&apos;t just look. Verify.
            </h2>
            <p className="final-cta__subtitle">
              Join researchers, journalists, and everyday digital citizens who verify media evidence before sharing or trusting.
            </p>
            <div className="final-cta__buttons">
              <Link to="/analyze" className="final-cta__primary-btn">
                <span>Analyze Media Now</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link to="/about" className="final-cta__secondary-btn">
                <span>Read Our Methodology</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
