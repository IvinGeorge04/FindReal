import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  Cpu, 
  Fingerprint, 
  Lock, 
  EyeOff, 
  ArrowRight,
  Scale,
  Sparkles,
  Info
} from 'lucide-react';
import Card from '../components/Card/Card';
import './About.css';

export default function About() {
  return (
    <main id="main-content" className="about-page">
      <div className="container">
        {/* Header */}
        <section className="about-header" aria-labelledby="about-title">
          <div className="about-header__badge">
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Transparency & Methodology</span>
          </div>
          <h1 id="about-title" className="about-header__title">
            About FindReal
          </h1>
          <p className="about-header__lead">
            FindReal was founded on a simple principle: in an age of generative synthesis, media authenticity requires transparent evidence, probabilistic reasoning, and scientific honesty.
          </p>
        </section>

        {/* Section 1: Purpose */}
        <section className="about-section" aria-labelledby="purpose-title">
          <div className="about-section__header">
            <h2 id="purpose-title" className="about-section__title">
              Our Purpose
            </h2>
            <p className="about-section__desc">
              Addressing the trust crisis in digital media.
            </p>
          </div>

          <div className="about-grid-2">
            <div className="about-prose">
              <p>
                The rapid proliferation of synthetic media—from photorealistic text-to-image diffusion models to real-time neural voice cloning and deepfake video generation—has broken the historical heuristic that &ldquo;seeing is believing.&rdquo;
              </p>
              <p>
                Too often, online debates collapse into polarized claims: one side insists an authentic photograph is an &ldquo;AI deepfake,&rdquo; while another accepts a fabricated recording as fact. Generic AI detection widgets exacerbate the problem by offering opaque percentage scores without evidentiary proof or scientific methodology.
              </p>
              <p>
                <strong>FindReal exists to restore evidentiary rigor.</strong> We equip researchers, journalists, fact-checkers, and digital citizens with an open, multi-signal verification pipeline that reveals what is detectable, what is missing, and what remains unknown.
              </p>
            </div>

            <div className="about-callout-card">
              <div className="about-callout-card__header">
                <Scale size={22} className="about-callout-icon" aria-hidden="true" />
                <h3 className="about-callout-title">The Non-Fabrication Guarantee</h3>
              </div>
              <p className="about-callout-text">
                FindReal operates under a strict principle of non-fabrication. If an external metadata service, reverse index, or C2PA manifest reader is unreachable or missing, the platform displays <strong>&ldquo;Unavailable&rdquo;</strong> rather than fabricating or estimating results.
              </p>
              <div className="about-callout-footer">
                <span>Core Engineering Standard</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Methodology */}
        <section className="about-section" aria-labelledby="methodology-title">
          <div className="about-section__header">
            <h2 id="methodology-title" className="about-section__title">
              Our Methodology
            </h2>
            <p className="about-section__desc">
              Multi-signal evidentiary synthesis instead of a single black box.
            </p>
          </div>

          <div className="methodology-cards">
            <Card
              title="1. Container & Stream Validation"
              subtitle="Deep file header verification"
              icon={Lock}
              elevation="sm"
            >
              <p className="card-prose">
                Every file begins with server-side MIME type verification and magic-byte structural inspection. We deconstruct containers (JPEG, WebP, MP3, MP4) into raw audio-visual streams to detect hidden scripts, corrupted frames, or payload manipulation.
              </p>
            </Card>

            <Card
              title="2. Metadata & EXIF Forensics"
              subtitle="Hardware and revision auditing"
              icon={FileText}
              elevation="sm"
            >
              <p className="card-prose">
                Using tools like ExifTool, we inspect hardware tags, camera serial numbers, lens profiles, exposure parameters, and software revision histories (e.g. Photoshop, Stable Diffusion WebUI). We audit for timestamp conflicts and tag alterations.
              </p>
            </Card>

            <Card
              title="3. C2PA Cryptographic Provenance"
              subtitle="Coalition for Content Provenance and Authenticity"
              icon={Fingerprint}
              elevation="sm"
            >
              <p className="card-prose">
                We inspect embedded Content Credentials (C2PA JUMBF manifests). When present, cryptographic certificates confirm the original author, camera device, and complete edit history. When absent, the limitation is clearly noted.
              </p>
            </Card>

            <Card
              title="4. Generative Pattern Analysis"
              subtitle="Multi-modal synthetic detection heuristics"
              icon={Cpu}
              elevation="sm"
            >
              <p className="card-prose">
                Synthetic generative pipelines leave distinctive frequency-domain fingerprints. For images, we evaluate latent noise distributions; for audio, neural vocoder phase artifacts; for video, facial warp boundary jitter and phoneme synchronization.
              </p>
            </Card>
          </div>
        </section>

        {/* Section 3: Scientific Uncertainty */}
        <section className="about-section" aria-labelledby="uncertainty-title">
          <div className="about-section__header">
            <h2 id="uncertainty-title" className="about-section__title">
              Scientific Uncertainty & Probabilistic Reality
            </h2>
            <p className="about-section__desc">
              Why absolute claims like &ldquo;100% Real&rdquo; or &ldquo;100% Fake&rdquo; are scientifically invalid.
            </p>
          </div>

          <div className="uncertainty-box">
            <div className="uncertainty-box__banner">
              <AlertTriangle size={24} className="uncertainty-icon" aria-hidden="true" />
              <div>
                <h3 className="uncertainty-box__title">The Fallacy of Absolute Certainty</h3>
                <p className="uncertainty-box__text">
                  Any tool that guarantees &ldquo;100% Real&rdquo; or &ldquo;100% Fake&rdquo; is engaging in pseudoscience. Media verification is inherently probabilistic.
                </p>
              </div>
            </div>

            <div className="uncertainty-grid">
              <div className="uncertainty-point">
                <h4>Evolving Generative Architectures</h4>
                <p>
                  Generative models improve constantly. Artifacts present in today&apos;s models may be eliminated in next-generation architectures. Forensic detectors must continuously update, and scores remain likelihoods.
                </p>
              </div>

              <div className="uncertainty-point">
                <h4>Adversarial Countermeasures</h4>
                <p>
                  Malicious actors can deliberately add noise, blur boundaries, or re-encode video at lower bitrates to degrade forensic signals. A low manipulation score does not equal absolute proof of authenticity.
                </p>
              </div>

              <div className="uncertainty-point">
                <h4>Platform Re-compression</h4>
                <p>
                  Major social networks strip EXIF headers and re-compress files upon upload. A lack of metadata indicates only that headers are missing—it does not prove malicious intent or AI generation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Known Limitations */}
        <section className="about-section" aria-labelledby="limitations-title">
          <div className="about-section__header">
            <h2 id="limitations-title" className="about-section__title">
              Platform Limitations
            </h2>
            <p className="about-section__desc">
              Every verification technology has boundaries. Here are FindReal&apos;s:
            </p>
          </div>

          <div className="limitations-list" role="list">
            <div className="limitation-item" role="listitem">
              <div className="limitation-item__badge">Limitation 01</div>
              <div className="limitation-item__content">
                <h4>Screenshots and Re-Photographed Displays</h4>
                <p>
                  Screenshots of images create brand new metadata belonging to the screenshotting device and introduce pixel compression grids that destroy subtle latent diffusion patterns.
                </p>
              </div>
            </div>

            <div className="limitation-item" role="listitem">
              <div className="limitation-item__badge">Limitation 02</div>
              <div className="limitation-item__content">
                <h4>Short Audio Clips (&lt; 2 Seconds)</h4>
                <p>
                  High-confidence vocoder spectral analysis requires sufficient acoustic continuity. Audio samples under two seconds frequently yield &ldquo;INCONCLUSIVE&rdquo; assessments.
                </p>
              </div>
            </div>

            <div className="limitation-item" role="listitem">
              <div className="limitation-item__badge">Limitation 03</div>
              <div className="limitation-item__content">
                <h4>Heavily Spliced or Composite Media</h4>
                <p>
                  When a single frame combines authentic photojournalism with localized generative replacement (inpainting), global classification scores can be diluted without localized segmentation.
                </p>
              </div>
            </div>

            <div className="limitation-item" role="listitem">
              <div className="limitation-item__badge">Limitation 04</div>
              <div className="limitation-item__content">
                <h4>Context Is External to Files</h4>
                <p>
                  A completely authentic photograph can be deployed maliciously with a fabricated caption or out-of-context date. Technical forensic tools verify file integrity, not the truthfulness of human text around it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="about-cta">
          <div className="about-cta__card">
            <h2>Experience Evidence-Driven Verification</h2>
            <p>Upload a file to inspect metadata, provenance manifests, and multi-signal probabilistic indicators.</p>
            <div className="about-cta__actions">
              <Link to="/analyze" className="home-hero__primary-btn">
                <span>Go to Media Analysis</span>
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
