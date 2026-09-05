import React from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Circle, 
  AlertCircle, 
  ShieldCheck, 
  XCircle,
  FileSearch,
  Cpu
} from 'lucide-react';
import Button from '../Button/Button';
import './AnalysisProgress.css';

export const PIPELINE_STAGES = [
  {
    id: 'uploading',
    title: 'Uploading',
    description: 'Transferring media asset to isolated ephemeral processing space',
  },
  {
    id: 'validating',
    title: 'Validating media',
    description: 'Inspecting container magic bytes, file integrity, and MIME headers',
  },
  {
    id: 'reading_metadata',
    title: 'Reading metadata',
    description: 'Extracting EXIF tags, camera hardware serials, and revision history',
  },
  {
    id: 'checking_provenance',
    title: 'Checking provenance',
    description: 'Auditing cryptographic C2PA Content Credentials and author certificates',
  },
  {
    id: 'preparing_media',
    title: 'Preparing media',
    description: 'Decompressing streams, extracting focal keyframes, and normalizing audio channels',
  },
  {
    id: 'analyzing_media',
    title: 'Analyzing media',
    description: 'Inspecting spectral distributions, vocoder continuity, and diffusion patterns',
  },
  {
    id: 'checking_source_context',
    title: 'Checking source context',
    description: 'Correlating first known appearance timeline and external claim registries',
  },
  {
    id: 'generating_explanation',
    title: 'Generating explanation',
    description: 'Synthesizing multi-signal evidence, confidence boundaries, and limitations',
  },
  {
    id: 'finalizing_report',
    title: 'Finalizing report',
    description: 'Assembling structured probabilistic assessment and audit log',
  },
];

export default function AnalysisProgress({
  activeStageIndex = 0,
  status = 'running', // 'running' | 'completed' | 'error' | 'idle'
  mediaInfo = null,
  onCancel = null,
  errorMessage = '',
}) {
  const currentStage = PIPELINE_STAGES[activeStageIndex] || PIPELINE_STAGES[0];

  return (
    <div className="analysis-progress-card" role="region" aria-label="Media Verification Pipeline Progress">
      {/* Header Bar */}
      <div className="analysis-progress__header">
        <div className="analysis-progress__title-wrap">
          <div className="analysis-progress__status-icon" aria-hidden="true">
            {status === 'running' ? (
              <Loader2 size={20} className="icon-spin text-cyan" />
            ) : status === 'completed' ? (
              <CheckCircle2 size={20} className="text-emerald" />
            ) : status === 'error' ? (
              <AlertCircle size={20} className="text-red" />
            ) : (
              <ShieldCheck size={20} className="text-cyan" />
            )}
          </div>
          <div>
            <h3 className="analysis-progress__heading">
              {status === 'completed' 
                ? 'Analysis Pipeline Completed' 
                : status === 'error'
                ? 'Pipeline Interrupted'
                : `Stage ${activeStageIndex + 1} of 9: ${currentStage.title}`}
            </h3>
            {mediaInfo && (
              <span className="analysis-progress__subhead">
                Target: <code>{mediaInfo.name}</code> ({mediaInfo.type || 'Media asset'})
              </span>
            )}
          </div>
        </div>

        {onCancel && status === 'running' && (
          <Button
            variant="ghost"
            size="sm"
            icon={XCircle}
            onClick={onCancel}
            ariaLabel="Cancel analysis pipeline"
          >
            Cancel
          </Button>
        )}
      </div>

      {/* Pipeline Stages Stepper List */}
      <div className="pipeline-stepper" role="list">
        {PIPELINE_STAGES.map((stage, index) => {
          let stageState = 'pending';
          if (index < activeStageIndex) {
            stageState = 'completed';
          } else if (index === activeStageIndex) {
            stageState = status === 'error' ? 'failed' : 'active';
          }

          return (
            <div 
              key={stage.id} 
              className={`pipeline-step pipeline-step--${stageState}`}
              role="listitem"
            >
              {/* Stepper Connector Line */}
              {index < PIPELINE_STAGES.length - 1 && (
                <div 
                  className={`pipeline-step__line ${index < activeStageIndex ? 'pipeline-step__line--completed' : ''}`}
                  aria-hidden="true"
                />
              )}

              {/* State Indicator Icon */}
              <div className="pipeline-step__indicator" aria-hidden="true">
                {stageState === 'completed' && (
                  <CheckCircle2 size={18} className="step-icon step-icon--completed" />
                )}
                {stageState === 'active' && (
                  <Loader2 size={18} className="step-icon step-icon--active icon-spin" />
                )}
                {stageState === 'failed' && (
                  <AlertCircle size={18} className="step-icon step-icon--failed" />
                )}
                {stageState === 'pending' && (
                  <Circle size={18} className="step-icon step-icon--pending" />
                )}
              </div>

              {/* Stage Text */}
              <div className="pipeline-step__content">
                <div className="pipeline-step__header">
                  <span className="pipeline-step__number">0{index + 1}</span>
                  <span className="pipeline-step__title">{stage.title}</span>
                  {stageState === 'active' && (
                    <span className="pipeline-step__badge-active">In Progress</span>
                  )}
                  {stageState === 'completed' && (
                    <span className="pipeline-step__badge-done">Done</span>
                  )}
                </div>
                <p className="pipeline-step__desc">{stage.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message Alert */}
      {status === 'error' && errorMessage && (
        <div className="pipeline-error-box" role="alert">
          <AlertCircle size={18} className="text-red" aria-hidden="true" />
          <div>
            <strong>Verification Error:</strong> {errorMessage}
          </div>
        </div>
      )}

      {/* Non-Fabrication Notice */}
      <div className="pipeline-footer-notice">
        <p>
          FindReal runs sequential forensic verification across multi-modal heuristics. We never display synthetic &ldquo;AI is thinking&rdquo; delays or fabricate completion percentages.
        </p>
      </div>
    </div>
  );
}
