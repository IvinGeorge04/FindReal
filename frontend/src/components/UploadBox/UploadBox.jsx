import React, { useState, useRef } from 'react';
import { UploadCloud, FileType, AlertCircle, Image as ImageIcon, Mic, Video } from 'lucide-react';
import './UploadBox.css';

// Supported MIME types and extensions
const SUPPORTED_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'webp'],
  audio: ['mp3', 'wav', 'm4a'],
  video: ['mp4', 'mov', 'webm'],
};

const ACCEPT_STRING = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/mp4',
  'audio/x-m4a',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.mp3',
  '.wav',
  '.m4a',
  '.mp4',
  '.mov',
  '.webm',
].join(',');

export default function UploadBox({ onFileSelect }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState('');
  const fileInputRef = useRef(null);

  const validateAndPassFile = (file) => {
    setValidationError('');

    if (!file) return;

    // Extract extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isImage = SUPPORTED_EXTENSIONS.image.includes(ext) || file.type.startsWith('image/');
    const isAudio = SUPPORTED_EXTENSIONS.audio.includes(ext) || file.type.startsWith('audio/');
    const isVideo = SUPPORTED_EXTENSIONS.video.includes(ext) || file.type.startsWith('video/');

    const isSupportedExt = [
      ...SUPPORTED_EXTENSIONS.image,
      ...SUPPORTED_EXTENSIONS.audio,
      ...SUPPORTED_EXTENSIONS.video,
    ].includes(ext);

    if (!isSupportedExt && !isImage && !isAudio && !isVideo) {
      setValidationError(
        `Unsupported file type: ".${ext}". FindReal supports Images (JPG, JPEG, PNG, WEBP), Audio (MP3, WAV, M4A), and Video (MP4, MOV, WEBM).`
      );
      return;
    }

    // Pass validated file to parent
    onFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndPassFile(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      validateAndPassFile(selectedFile);
    }
  };

  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFileDialog();
    }
  };

  return (
    <div className="upload-box-wrapper">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_STRING}
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="Upload media file for verification"
      />

      {/* Drag and Drop Zone */}
      <div
        className={`upload-dropzone ${isDragOver ? 'upload-dropzone--drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label="Drag and drop media here or press Enter to browse files"
      >
        <div className="upload-dropzone__icon-wrapper" aria-hidden="true">
          <UploadCloud size={40} className="upload-dropzone__icon" />
        </div>

        <div className="upload-dropzone__content">
          <p className="upload-dropzone__primary-text">
            Drop your media here
          </p>
          <p className="upload-dropzone__secondary-text">
            or <span className="upload-dropzone__browse-highlight">browse files</span> from your device
          </p>
        </div>

        {/* Supported Media Types Badges */}
        <div className="upload-formats">
          <div className="upload-format-badge">
            <ImageIcon size={13} aria-hidden="true" />
            <span>Images: JPG, JPEG, PNG, WEBP</span>
          </div>
          <div className="upload-format-badge">
            <Mic size={13} aria-hidden="true" />
            <span>Audio: MP3, WAV, M4A</span>
          </div>
          <div className="upload-format-badge">
            <Video size={13} aria-hidden="true" />
            <span>Video: MP4, MOV, WEBM</span>
          </div>
        </div>
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="upload-error-alert" role="alert">
          <AlertCircle size={16} className="upload-error-icon" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
