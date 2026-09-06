import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Search, 
  FileCheck, 
  Image as ImageIcon, 
  Mic, 
  Video, 
  Info,
  Calendar,
  HardDrive
} from 'lucide-react';
import Button from '../Button/Button';
import './MediaPreview.css';

// Helper to format bytes into readable units
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to determine media classification
function getMediaCategory(file) {
  if (!file) return 'unknown';
  const mime = file.type.toLowerCase();
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return 'image';
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'm4a'].includes(ext)) {
    return 'audio';
  }
  if (mime.startsWith('video/') || ['mp4', 'mov', 'webm'].includes(ext)) {
    return 'video';
  }
  return 'unknown';
}

export default function MediaPreview({ file, onRemove, onAnalyze, isAnalyzing = false }) {
  const [objectUrl, setObjectUrl] = useState('');
  const category = getMediaCategory(file);

  // Safe object URL lifecycle management
  useEffect(() => {
    if (!file) return;

    const url = URL.createObjectURL(file);
    setObjectUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!file) return null;

  return (
    <div className="media-preview-card" role="region" aria-label="Selected Media Inspection Preview">
      <div className="media-preview-card__header">
        <div className="media-preview-card__header-meta">
          <div className="media-type-pill">
            {category === 'image' && <ImageIcon size={14} aria-hidden="true" />}
            {category === 'audio' && <Mic size={14} aria-hidden="true" />}
            {category === 'video' && <Video size={14} aria-hidden="true" />}
            <span>{category.toUpperCase()} READY FOR INSPECTION</span>
          </div>
          <span className="media-status-ready">Ready for Pipeline</span>
        </div>
      </div>

      <div className="media-preview-card__grid">
        {/* Visual / Audio / Video Display */}
        <div className="media-preview-viewport">
          {category === 'image' && objectUrl && (
            <div className="preview-image-container">
              <img 
                src={objectUrl} 
                alt={`Preview of ${file.name}`} 
                className="preview-image" 
              />
              <div className="preview-image__grid-lines" aria-hidden="true"></div>
            </div>
          )}

          {category === 'audio' && objectUrl && (
            <div className="preview-audio-container">
              <div className="audio-waveform-simulation" aria-hidden="true">
                <span className="wave-bar bar-1"></span>
                <span className="wave-bar bar-2"></span>
                <span className="wave-bar bar-3"></span>
                <span className="wave-bar bar-4"></span>
                <span className="wave-bar bar-5"></span>
                <span className="wave-bar bar-6"></span>
                <span className="wave-bar bar-7"></span>
                <span className="wave-bar bar-8"></span>
                <span className="wave-bar bar-9"></span>
                <span className="wave-bar bar-10"></span>
              </div>
              <audio 
                controls 
                src={objectUrl} 
                className="preview-audio-element"
                aria-label={`Audio player for ${file.name}`}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {category === 'video' && objectUrl && (
            <div className="preview-video-container">
              <video 
                controls 
                src={objectUrl} 
                className="preview-video-element"
                aria-label={`Video player for ${file.name}`}
              >
                Your browser does not support the video element.
              </video>
            </div>
          )}
        </div>

        {/* File Details & Inspector Pane */}
        <div className="media-preview-details">
          <div className="details-block">
            <h3 className="file-name-heading" title={file.name}>
              {file.name}
            </h3>

            <div className="file-attributes-list">
              <div className="attribute-row">
                <HardDrive size={15} className="attribute-icon" aria-hidden="true" />
                <span className="attribute-label">File Size:</span>
                <span className="attribute-value">{formatFileSize(file.size)}</span>
              </div>

              <div className="attribute-row">
                <FileCheck size={15} className="attribute-icon" aria-hidden="true" />
                <span className="attribute-label">MIME Type:</span>
                <span className="attribute-value"><code>{file.type || 'Inferred from extension'}</code></span>
              </div>

              <div className="attribute-row">
                <Calendar size={15} className="attribute-icon" aria-hidden="true" />
                <span className="attribute-label">Last Modified:</span>
                <span className="attribute-value">
                  {file.lastModified ? new Date(file.lastModified).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="pipeline-notice">
            <Info size={14} className="pipeline-notice-icon" aria-hidden="true" />
            <p>
              Submitting this file initiates metadata extraction, stream processing, and generative pattern detection.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="media-preview-actions">
            <Button
              variant="danger"
              icon={Trash2}
              onClick={onRemove}
              disabled={isAnalyzing}
              ariaLabel="Remove selected file"
            >
              Remove File
            </Button>

            <Button
              variant="primary"
              icon={Search}
              onClick={onAnalyze}
              disabled={isAnalyzing}
              ariaLabel="Analyze media file"
              className="analyze-cta-btn"
            >
              Analyze Media
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
