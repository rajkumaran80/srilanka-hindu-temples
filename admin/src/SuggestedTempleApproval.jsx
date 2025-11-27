import { useState, useEffect } from 'react';
import './SuggestedTempleApproval.css';

const API_BASE_URL = 'http://localhost:8080/api';

const SuggestedTempleApproval = () => {
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
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
      const response = await fetch(`${API_BASE_URL}/get_suggested_temples.ts?page=${page}&limit=${pageSize}`);
      if (response.ok) {
        const data = await response.json();
        setTemples(data.temples || []);
        setPagination(data.pagination);
      } else {
        setMessage('Failed to load suggested temples');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error fetching suggested temples:', error);
      setMessage('Error loading suggested temples');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const approveTemple = async (templeId) => {
    try {
      setApproving(true);
      setMessage('');

      const response = await fetch(`${API_BASE_URL}/approve_suggested_temple.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templeId: templeId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessage('Temple approved successfully');
        setMessageType('success');

        // Remove the approved temple from the list
        setTemples(prevTemples => prevTemples.filter(temple => temple.id !== templeId));

        // Refresh the list to get updated pagination
        fetchTemples(currentPage);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to approve temple');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error approving temple:', error);
      setMessage('Error approving temple');
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return <div className="loading">Loading suggested temples...</div>;
  }

  return (
    <div className="suggested-temple-approval">
      <h1>Suggested Temple Approval</h1>
      <p className="description">
        Review and approve temples suggested by users. Only suggested temples are shown.
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
              <th>Suggested By</th>
              <th>Suggestion Date</th>
              <th>Photos</th>
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
                <td>{temple.suggested_by || 'Anonymous'}</td>
                <td>{formatDate(temple.suggestion_date)}</td>
                <td>
                  <span className="photo-count">
                    {temple.photos?.length || 0} photos
                  </span>
                </td>
                <td>
                  <button
                    className="approve-temple-button"
                    onClick={() => approveTemple(temple.id)}
                    disabled={approving}
                  >
                    {approving ? 'Approving...' : '✅ Approve Temple'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {temples.length === 0 && (
        <div className="no-data">
          <p>No suggested temples found.</p>
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
          Showing {temples.length} suggested temples
          {pagination && ` (Page ${pagination.currentPage} of ${pagination.totalPages}, Total: ${pagination.totalCount})`}
        </p>
      </div>
    </div>
  );
};

export default SuggestedTempleApproval;
