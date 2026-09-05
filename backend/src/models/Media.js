require('../config/resolveModules');
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    type: {
      type: String,
      enum: ['image', 'audio', 'video'],
      required: [true, 'Media type classification is required'],
    },
    originalName: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
      maxlength: 150,
    },
    storedIdentifier: {
      type: String,
      required: [true, 'Stored server identifier is required'],
      unique: true,
      index: true,
    },
    filePath: {
      type: String,
      required: [true, 'Isolated file path is required'],
      select: false, // Internal filesystem path is shielded from default client queries
    },
    mimeType: {
      type: String,
      required: [true, 'Verified MIME type is required'],
    },
    extension: {
      type: String,
      required: [true, 'Verified extension is required'],
    },
    size: {
      type: Number,
      required: [true, 'File size in bytes is required'],
      min: 1,
      max: 50 * 1024 * 1024, // 50MB ceiling
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'analyzed', 'deleted'],
      default: 'uploaded',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure internal filesystem path is excluded from toJSON serialization
mediaSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.filePath;
  delete obj.__v;
  return obj;
};

const Media = mongoose.models.Media || mongoose.model('Media', mediaSchema);

module.exports = Media;
