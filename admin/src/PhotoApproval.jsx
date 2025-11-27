import { useState, useEffect } from 'react';
import './PhotoApproval.css';

const API_BASE_URL = 'http://localhost:8080/api';

const PhotoApproval = () => {
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Get initial page from URL query parameter
  const getInitialPage = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get('page')) || 1;
    return page;
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage);
  const [pagination, setPagination] = useState(null);
  const [pageSize] = useState(10); // 10 temples per page

  useEffect(() => {
    fetchTemples(currentPage);
  }, [currentPage]);

  const fetchTemples = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/temples_with_unapproved_photos.ts?page=${page}&limit=${pageSize}`);
      if (response.ok) {
        const data = await response.json();
        setTemples(data.temples || []);
        setPagination(data.pagination);
      } else {
        setMessage('Failed to load temples');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error fetching temples:', error);
      setMessage('Error loading temples');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const openPhotoModal = (temple) => {
    setSelectedTemple(temple);
    setModalOpen(true);
  };

  const closePhotoModal = () => {
    setSelectedTemple(null);
    setModalOpen(false);
  };

  const approvePhoto = async (photoUrl) => {
    if (!selectedTemple) return;

    try {
      setApproving(true);
      setMessage('');

      const response = await fetch(`${API_BASE_URL}/approve_photo.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templeId: selectedTemple.id,
          photoUrl: photoUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Photo approved successfully');
        setMessageType('success');

        // Update the selected temple's data
        setSelectedTemple(data.temple);

        // Refresh the temples list
        fetchTemples(currentPage);

        // Close modal if no more unapproved photos
        if (data.temple.unapproved_photos.length === 0) {
          setTimeout(() => {
            closePhotoModal();
          }, 1500);
        }
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to approve photo');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error approving photo:', error);
      setMessage('Error approving photo');
      setMessageType('error');
    } finally {
      setApproving(false);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      setCurrentPage(page);
      const url = new URL(window.location);
      url.searchParams.set('page', page.toString());
      window.history.pushState({}, '', url);
    }
  };

  const goToPreviousPage = () => {
    if (pagination?.hasPrev) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      const url = new URL(window.location);
      url.searchParams.set('page', newPage.toString());
      window.history.pushState({}, '', url);
    }
  };

  const goToNextPage = () => {
    if (pagination?.hasNext) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      const url = new URL(window.location);
      url.searchParams.set('page', newPage.toString());
      window.history.pushState({}, '', url);
    }
  };

  const generatePageNumbers = () => {
    if (!pagination) return [];

    const { currentPage, totalPages } = pagination;
    const pages = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  if (loading) {
    return <div className="loading">Loading temples with unapproved photos...</div>;
  }

  return (
    <div className="photo-approval">
      <h1>Photo Approval</h1>
      <p className="description">
        Review and approve photos for temples. Only temples with unapproved photos are shown.
      </p>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="table-container">
        <table className="temples-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Temple Name</th>
              <th>Location</th>
              <th>District</th>
              <th>Unapproved Photos</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {temples.map((temple) => (
              <tr key={temple.id}>
                <td>{temple.name || 'N/A'}</td>
                <td>{temple.temple_name || 'N/A'}</td>
                <td>{temple.location || 'N/A'}</td>
                <td>{temple.district || 'N/A'}</td>
                <td>
                  <span className="photo-count">
                    {temple.unapproved_photos?.length || 0} photos
                  </span>
                </td>
                <td>
                  <button
                    className="review-photos-button"
                    onClick={() => openPhotoModal(temple)}
                    disabled={!temple.unapproved_photos || temple.unapproved_photos.length === 0}
                  >
                    📸 Review Photos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {temples.length === 0 && (
        <div className="no-data">
          <p>No temples with unapproved photos found.</p>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={goToPreviousPage}
            disabled={!pagination.hasPrev}
          >
            Previous
          </button>

          <div className="page-numbers">
            {generatePageNumbers().map((page, index) => (
              <button
                key={index}
                className={`page-number ${page === pagination.currentPage ? 'active' : ''} ${page === '...' ? 'ellipsis' : ''}`}
                onClick={() => typeof page === 'number' && goToPage(page)}
                disabled={page === '...'}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            className="pagination-button"
            onClick={goToNextPage}
            disabled={!pagination.hasNext}
          >
            Next
          </button>
        </div>
      )}

      <div className="stats">
        <p>
          Showing {temples.length} temples
          {pagination && ` (Page ${pagination.currentPage} of ${pagination.totalPages}, Total: ${pagination.totalCount})`}
        </p>
      </div>

      {/* Photo Approval Modal */}
      {modalOpen && selectedTemple && (
        <div className="modal-overlay" onClick={closePhotoModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Review Photos - {selectedTemple.name || selectedTemple.temple_name || 'Unnamed Temple'}</h2>
              <button className="close-button" onClick={closePhotoModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="photo-grid">
                {selectedTemple.unapproved_photos?.map((photoUrl, index) => (
                  <div key={index} className="photo-item">
                    <img
                      src={photoUrl}
                      alt={`Temple photo ${index + 1}`}
                      className="photo-image"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                    <div className="photo-error" style={{ display: 'none' }}>
                      Failed to load image
                    </div>
                    <div className="photo-actions">
                      <button
                        className="approve-button"
                        onClick={() => approvePhoto(photoUrl)}
                        disabled={approving}
                      >
                        {approving ? 'Approving...' : '✅ Approve'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {(!selectedTemple.unapproved_photos || selectedTemple.unapproved_photos.length === 0) && (
                <div className="no-photos">
                  <p>No unapproved photos to review.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoApproval;
