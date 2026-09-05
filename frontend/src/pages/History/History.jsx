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
  Layers,
  Percent
} from 'lucide-react';
import api from '../../services/api';
import VerdictBadge from '../../components/VerdictBadge/VerdictBadge';
import Button from '../../components/Button/Button';
import './History.css';

export default function History() {
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Fetch authenticated user's analysis history from backend
  const fetchHistory = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get('/v1/analysis/history');
      const items = response.data?.data?.history || [];
      setHistory(items);
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.message ||
        'Unable to load your analysis history. Please try again later.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Handle Delete Analysis Record
  const handleDelete = async (id) => {
    setDeletingId(id);

    try {
      await api.delete(`/v1/analysis/${id}`);
      setHistory((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirmId(null);
    } catch (err) {
      alert('Failed to delete analysis record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper to render media icon / placeholder thumbnail
  const renderMediaTypeIcon = (type) => {
    switch (String(type).toLowerCase()) {
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

  // Filtered History
  const filteredHistory = history.filter((item) => {
    const matchesSearch =
      item.mediaName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.verdict?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.mediaType === filterType;
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
              icon={<ArrowRight size={16} aria-hidden="true" />}
            >
              New Analysis
            </Button>
          </div>
        </header>

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
        {!loading && !error && history.length === 0 && (
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
              icon={<ArrowRight size={18} aria-hidden="true" />}
            >
              Analyze Your First Media
            </Button>
          </div>
        )}

        {/* Populated History View */}
        {!loading && !error && history.length > 0 && (
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
                const isConfirmingDelete = deleteConfirmId === item.id;
                const isDeleting = deletingId === item.id;
                const formattedDate = new Date(item.date).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <article key={item.id} className="history-card">
                    <div className="history-card__main">
                      {/* Media Thumbnail Placeholder */}
                      <div className="history-card__thumbnail">
                        {renderMediaTypeIcon(item.mediaType)}
                      </div>

                      {/* Info */}
                      <div className="history-card__details">
                        <div className="history-card__meta-top">
                          <span className="history-card__type-tag">
                            {item.mediaType.toUpperCase()}
                          </span>
                          <span className="history-card__date">
                            <Calendar size={13} aria-hidden="true" />
                            <time dateTime={item.date}>{formattedDate}</time>
                          </span>
                        </div>

                        <h2 className="history-card__filename" title={item.mediaName}>
                          {item.mediaName}
                        </h2>

                        <div className="history-card__indicators">
                          <div className="history-card__verdict">
                            <VerdictBadge verdict={item.verdict} size="sm" />
                          </div>

                          <div className="history-card__risk-chip">
                            <span className="history-card__risk-label">Manipulation Risk:</span>
                            <strong className="history-card__risk-value">
                              {item.manipulationRisk}%
                            </strong>
                            <span className="history-card__risk-tier">
                              ({item.riskLevel})
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
                        onClick={() => navigate(`/results/${item.id}`)}
                        icon={<ExternalLink size={14} aria-hidden="true" />}
                      >
                        View Report
                      </Button>

                      {isConfirmingDelete ? (
                        <div className="history-card__confirm-delete">
                          <span className="confirm-prompt">Confirm?</span>
                          <button
                            type="button"
                            className="btn-confirm-delete"
                            onClick={() => handleDelete(item.id)}
                            disabled={isDeleting}
                            aria-label={`Confirm delete of ${item.mediaName}`}
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
                          onClick={() => setDeleteConfirmId(item.id)}
                          title="Delete verification record"
                          aria-label={`Delete record for ${item.mediaName}`}
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
