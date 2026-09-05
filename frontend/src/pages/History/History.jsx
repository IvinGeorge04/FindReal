import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video, 
  RotateCw, 
  AlertTriangle, 
  Search, 
  Filter, 
  ArrowRight, 
  ShieldAlert, 
  Calendar, 
  ShieldCheck,
  Info
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import VerdictBadge from '../../components/VerdictBadge/VerdictBadge';
import Button from '../../components/Button/Button';
import './History.css';

function HistoryContent() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch authenticated user's analysis history from backend or localStorage
  const fetchHistory = async () => {
    setLoading(true);
    setError('');

    try {
      let serverItems = [];
      try {
        const response = await api.get('/v1/analysis/history');
        serverItems = response.data?.data?.history || response.data?.history || [];
        if (!Array.isArray(serverItems)) {
          serverItems = [];
        }
      } catch (apiErr) {
        // Backend history endpoint may return empty or error if unauthenticated / offline
        serverItems = [];
      }

      // Also merge any local guest history stored in this browser
      let localItems = [];
      try {
        localItems = JSON.parse(localStorage.getItem('findreal_guest_history') || '[]');
        if (!Array.isArray(localItems)) {
          localItems = [];
        }
      } catch (e) {
        localItems = [];
      }

      // Merge and deduplicate by ID
      const seenIds = new Set();
      const combined = [];

      for (const rec of [...serverItems, ...localItems]) {
        if (!rec) continue;
        const id = (rec._id || rec.id || '').toString();
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          combined.push({
            ...rec,
            id,
            _id: id,
          });
        }
      }

      setHistory(combined);
    } catch (err) {
      // Safe fallback to local guest items on unexpected error
      try {
        const localItems = JSON.parse(localStorage.getItem('findreal_guest_history') || '[]');
        setHistory(Array.isArray(localItems) ? localItems : []);
      } catch (e) {
        setHistory([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isAuthenticated]);

  // Handle Delete Analysis Record
  const handleDelete = async (rawId) => {
    if (!rawId) return;
    const targetId = rawId.toString();
    setDeletingId(targetId);

    try {
      // Try backend deletion if authenticated
      if (isAuthenticated) {
        try {
          await api.delete(`/v1/analysis/${targetId}`);
        } catch (apiErr) {
          // Ignore backend delete error for guest items
        }
      }

      // Also remove from local guest history storage
      try {
        const local = JSON.parse(localStorage.getItem('findreal_guest_history') || '[]');
        if (Array.isArray(local)) {
          const updated = local.filter((item) => {
            const id = (item._id || item.id || '').toString();
            return id !== targetId;
          });
          localStorage.setItem('findreal_guest_history', JSON.stringify(updated));
        }
      } catch (e) {}

      // Update in-memory state
      setHistory((prev) => prev.filter((item) => {
        const id = (item._id || item.id || '').toString();
        return id !== targetId;
      }));
      setDeleteConfirmId(null);
    } catch (err) {
      alert('Failed to delete analysis record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to render media icon / placeholder thumbnail safely
  const renderMediaTypeIcon = (type) => {
    const safeType = String(type || '').toLowerCase();
    switch (safeType) {
      case 'image':
        return <ImageIcon size={20} className="media-thumb-icon media-thumb-icon--image" aria-hidden="true" />;
      case 'audio':
        return <Music size={20} className="media-thumb-icon media-thumb-icon--audio" aria-hidden="true" />;
      case 'video':
        return <Video size={20} className="media-thumb-icon media-thumb-icon--video" aria-hidden="true" />;
      default:
        return <FileText size={20} className="media-thumb-icon media-thumb-icon--generic" aria-hidden="true" />;
    }
  };

  // Safely filtered history
  const safeHistoryList = Array.isArray(history) ? history : [];
  const filteredHistory = safeHistoryList.filter((item) => {
    if (!item) return false;
    const name = String(item.mediaName || '').toLowerCase();
    const verdict = String(item.verdict || '').toLowerCase();
    const query = String(searchQuery || '').toLowerCase();
    const matchesSearch = !query || name.includes(query) || verdict.includes(query);
    const itemType = String(item.mediaType || '').toLowerCase();
    const matchesType = filterType === 'all' || itemType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <main id="main-content" className="history-page">
      <div className="container history-page__container">
        {/* Header */}
        <header className="history-header">
          <div className="history-header__badge">
            <HistoryIcon size={16} aria-hidden="true" />
            <span>Audit Trail & Record History</span>
          </div>
          <div className="history-header__title-row">
            <div>
              <h1 className="history-header__title">Analysis History</h1>
              <p className="history-header__subtitle">
                Inspect past media verification dossiers, view granular evidence reports, or manage stored records.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/analyze')}
              icon={ArrowRight}
            >
              New Analysis
            </Button>
          </div>
        </header>

        {/* Guest mode notice banner */}
        {!isAuthenticated && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.85rem 1.25rem',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              borderRadius: '10px',
              fontSize: '0.875rem',
              color: '#93c5fd',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Info size={18} style={{ color: '#60a5fa', flexShrink: 0 }} aria-hidden="true" />
              <span>
                <strong>Browsing as Guest:</strong> Your recent analyses on this device are displayed below. Sign in to save records permanently across devices.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                to="/login"
                style={{
                  color: '#60a5fa',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  fontSize: '0.85rem',
                }}
              >
                Sign In
              </Link>
              <span style={{ opacity: 0.5 }}>|</span>
              <Link
                to="/register"
                style={{
                  color: '#60a5fa',
                  fontWeight: '600',
                  textDecoration: 'underline',
                  fontSize: '0.85rem',
                }}
              >
                Register
              </Link>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="history-loading-state" aria-busy="true">
            <RotateCw size={32} className="history-spinner" aria-hidden="true" />
            <p className="history-loading-text">Loading your verification records...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="history-error-state" role="alert">
            <AlertTriangle size={32} className="history-error-icon" aria-hidden="true" />
            <h2 className="history-error-title">Failed to Load History</h2>
            <p className="history-error-text">{error}</p>
            <Button variant="secondary" onClick={fetchHistory}>
              Retry Connection
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && safeHistoryList.length === 0 && (
          <div className="history-empty-state">
            <div className="history-empty-state__icon-box">
              <ShieldAlert size={48} aria-hidden="true" />
            </div>
            <h2 className="history-empty-state__title">No analyses yet.</h2>
            <p className="history-empty-state__desc">
              You haven't submitted any media assets for forensic verification yet. 
              Upload an image, audio track, or video clip to evaluate digital authenticity.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/analyze')}
              icon={ArrowRight}
            >
              Analyze Your First Media
            </Button>
          </div>
        )}

        {/* Populated History View */}
        {!loading && !error && safeHistoryList.length > 0 && (
          <div className="history-content">
            {/* Filter and Search Bar */}
            <div className="history-controls">
              <div className="history-search-wrap">
                <Search size={16} className="history-search-icon" aria-hidden="true" />
                <input
                  type="text"
                  className="history-search-input"
                  placeholder="Search by filename or assessment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter analyses by keyword"
                />
              </div>

              <div className="history-filter-wrap">
                <Filter size={15} className="history-filter-icon" aria-hidden="true" />
                <select
                  className="history-filter-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  aria-label="Filter by media type"
                >
                  <option value="all">All Media Types</option>
                  <option value="image">Images</option>
                  <option value="audio">Audio</option>
                  <option value="video">Videos</option>
                </select>
              </div>
            </div>

            {/* Records List / Grid */}
            <div className="history-list" role="feed" aria-label="Past analyses">
              {filteredHistory.map((item) => {
                const itemId = (item._id || item.id || '').toString();
                const isConfirmingDelete = deleteConfirmId === itemId;
                const isDeleting = deletingId === itemId;

                let formattedDate = 'Recent';
                const dateVal = item.createdAt || item.date || item.timestamp;
                if (dateVal) {
                  try {
                    const parsedDate = new Date(dateVal);
                    if (!isNaN(parsedDate.getTime())) {
                      formattedDate = parsedDate.toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      });
                    }
                  } catch (e) {
                    formattedDate = 'Recent';
                  }
                }

                const mediaName = item.mediaName || 'Uploaded Media';
                const mediaTypeStr = String(item.mediaType || 'MEDIA').toUpperCase();
                const verdict = item.verdict || 'INCONCLUSIVE';
                const manipulationRisk = item.manipulationRisk ?? item.riskScore ?? 50;
                const riskLevel = item.riskLevel || 'MODERATE CONCERN';

                return (
                  <article key={itemId || Math.random()} className="history-card">
                    <div className="history-card__main">
                      {/* Media Thumbnail Placeholder */}
                      <div className="history-card__thumbnail">
                        {renderMediaTypeIcon(item.mediaType)}
                      </div>

                      {/* Info */}
                      <div className="history-card__details">
                        <div className="history-card__meta-top">
                          <span className="history-card__type-tag">
                            {mediaTypeStr}
                          </span>
                          <span className="history-card__date">
                            <Calendar size={13} aria-hidden="true" />
                            <time dateTime={dateVal ? String(dateVal) : ''}>{formattedDate}</time>
                          </span>
                        </div>

                        <h2 className="history-card__filename" title={mediaName}>
                          {mediaName}
                        </h2>

                        <div className="history-card__indicators">
                          <div className="history-card__verdict">
                            <VerdictBadge verdict={verdict} size="sm" />
                          </div>

                          <div className="history-card__risk-chip">
                            <span className="history-card__risk-label">Manipulation Risk:</span>
                            <strong className="history-card__risk-value">
                              {manipulationRisk}%
                            </strong>
                            <span className="history-card__risk-tier">
                              ({riskLevel})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="history-card__actions">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate(`/results/${itemId}`)}
                        icon={ExternalLink}
                      >
                        View Report
                      </Button>

                      {isConfirmingDelete ? (
                        <div className="history-card__confirm-delete">
                          <span className="confirm-prompt">Confirm?</span>
                          <button
                            type="button"
                            className="btn-confirm-delete"
                            onClick={() => handleDelete(itemId)}
                            disabled={isDeleting}
                            aria-label={`Confirm delete of ${mediaName}`}
                          >
                            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                          </button>
                          <button
                            type="button"
                            className="btn-cancel-delete"
                            onClick={() => setDeleteConfirmId(null)}
                            disabled={isDeleting}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="history-card__btn-delete"
                          onClick={() => setDeleteConfirmId(itemId)}
                          title="Delete verification record"
                          aria-label={`Delete record for ${mediaName}`}
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {filteredHistory.length === 0 && (
                <div className="history-no-matches">
                  <p>No verification records matched your search filters.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

class HistoryErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[History Page Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main id="main-content" className="history-page">
          <div className="container history-page__container">
            <div className="history-error-state" role="alert">
              <AlertTriangle size={36} className="history-error-icon" aria-hidden="true" />
              <h2 className="history-error-title">Unable to Load History</h2>
              <p className="history-error-text">
                An unexpected display issue occurred while loading verification records.
              </p>
              <button
                type="button"
                className="btn btn--primary btn--md"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

export default function History() {
  return (
    <HistoryErrorBoundary>
      <HistoryContent />
    </HistoryErrorBoundary>
  );
}
