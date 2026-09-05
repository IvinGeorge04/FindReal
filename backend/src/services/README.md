# Backend Services Directory

This directory holds business logic and third-party integrations:
- `gemini.service.js`: Secure backend-only integration with Google Gemini reasoning API.
- `metadata.service.js`: ExifTool, file header, and stream inspection (falls back to "Unavailable").
- `c2pa.service.js`: Provenance and cryptographic manifest inspection (falls back to "Unavailable").
- `ffmpeg.service.js`: Media frame extraction and audio stream analysis (falls back to "Unavailable").
