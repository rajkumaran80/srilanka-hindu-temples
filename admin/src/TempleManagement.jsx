import { useState, useEffect } from 'react';
import './TempleManagement.css';

const API_BASE_URL = 'http://localhost:8080/api';

const TempleManagement = () => {
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
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
      // Fetch temples with pagination
      const response = await fetch(`${API_BASE_URL}/temples_all.ts?page=${page}&limit=${pageSize}`);
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

  const startEditing = (temple) => {
    setEditingRow(temple.id);
    setEditData({
      id: temple.id,
      osm_id: temple.osm_id || '',
      level: temple.level || '',
      latitude: temple.latitude || '',
      longitude: temple.longitude || '',
      name: temple.name || '',
      temple_name: temple.temple_name || '',
      deity: temple.deity || '',
      description: temple.description || '',
      location: temple.location || '',
      district: temple.district || '',
      suburb: temple.suburb || '',
      village: temple.village || '',
      disabled: temple.disabled || false
    });
  };

  const cancelEditing = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };



  const saveTemple = async () => {
    try {
      setSaving(true);
      setMessage('');

      const response = await fetch(`${API_BASE_URL}/update_temple.ts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setMessage('Temple updated successfully');
        setMessageType('success');
        setEditingRow(null);
        setEditData({});
        fetchTemples(currentPage); // Refresh the current page
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to update temple');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error updating temple:', error);
      setMessage('Error updating temple');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const toggleDisabled = async (templeId, disabled) => {
    try {
      const updateData = {
        id: templeId,
        disabled: disabled
      };

      const response = await fetch(`${API_BASE_URL}/update_temple.ts`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setMessage(`Temple ${disabled ? 'disabled' : 'enabled'} successfully`);
        setMessageType('success');
        fetchTemples(currentPage); // Refresh the current page
      } else {
        const error = await response.json();
        setMessage(error.error || `Failed to ${disabled ? 'disable' : 'enable'} temple`);
        setMessageType('error');
      }
    } catch (error) {
      console.error('Error toggling temple disabled status:', error);
      setMessage(`Error ${disabled ? 'disabling' : 'enabling'} temple`);
      setMessageType('error');
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= (pagination?.totalPages || 1)) {
      setCurrentPage(page);
      // Update URL with page parameter
      const url = new URL(window.location);
      url.searchParams.set('page', page.toString());
      window.history.pushState({}, '', url);
    }
  };

  const goToPreviousPage = () => {
    if (pagination?.hasPrev) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      // Update URL with page parameter
      const url = new URL(window.location);
      url.searchParams.set('page', newPage.toString());
      window.history.pushState({}, '', url);
    }
  };

  const goToNextPage = () => {
    if (pagination?.hasNext) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
      // Update URL with page parameter
      const url = new URL(window.location);
      url.searchParams.set('page', newPage.toString());
      window.history.pushState({}, '', url);
    }
  };

  const openInGoogleMaps = (latitude, longitude, name) => {
    if (latitude && longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}&ll=${latitude},${longitude}&z=15`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  // Translation using MyMemory API (free, no API key required)
  const translateTamilToEnglish = async (text) => {
    if (!text) return text;

    try {
      // Using MyMemory translation API (free tier)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=ta|en&de=your-email@example.com`
      );

      if (response.ok) {
        const data = await response.json();
        return data.responseData.translatedText || text;
      } else {
        console.warn('Translation API failed, falling back to original text');
        return text;
      }
    } catch (error) {
      console.warn('Translation error:', error);
      return text; // Fallback to original text
    }
  };

  const copyTempleNameToName = async (templeId) => {
    // Find the temple in the current data
    const temple = temples.find(t => t.id === templeId);
    if (temple && temple.temple_name) {
      // Remove Tamil characters and "|" symbol before copying, keep English
      const cleanedName = temple.temple_name
        .replace(/[\u0B80-\u0BFF]/g, '')  // Remove Tamil Unicode range
        .replace(/\|/g, '')               // Remove "|" symbols
        .trim();                          // Remove leading/trailing whitespace

      // Prepare the update data directly
      const updateData = {
        id: temple.id,
        osm_id: temple.osm_id || '',
        level: temple.level || '',
        latitude: temple.latitude || '',
        longitude: temple.longitude || '',
        name: cleanedName,  // Set cleaned name
        temple_name: '',    // Clear temple_name field
        deity: temple.deity || '',
        description: temple.description || '',
        location: temple.location || '',
        district: temple.district || '',
        suburb: temple.suburb || '',
        village: temple.village || '',
        disabled: temple.disabled || false
      };

      // Directly save the changes to backend
      try {
        setSaving(true);
        setMessage('');

        const response = await fetch(`${API_BASE_URL}/update_temple.ts`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          setMessage('Temple updated successfully');
          setMessageType('success');
          // Refresh the current page data
          fetchTemples(currentPage);
        } else {
          const error = await response.json();
          setMessage(error.error || 'Failed to update temple');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setMessage('Error updating temple');
        setMessageType('error');
      } finally {
        setSaving(false);
      }
    }
  };

  const copyAndTranslateTempleNameToName = async (templeId) => {
    // Find the temple in the current data
    const temple = temples.find(t => t.id === templeId);
    if (temple && temple.temple_name) {
      try {
        // Show loading state during translation
        setSaving(true);
        setMessage('Translating...');

        // Get translated text
        const translatedName = await translateTamilToEnglish(temple.temple_name);

        // Prepare the update data directly
        const updateData = {
          id: temple.id,
          osm_id: temple.osm_id || '',
          level: temple.level || '',
          latitude: temple.latitude || '',
          longitude: temple.longitude || '',
          name: translatedName,  // Set translated name
          temple_name: '',       // Clear temple_name field
          deity: temple.deity || '',
          description: temple.description || '',
          location: temple.location || '',
          district: temple.district || '',
          suburb: temple.suburb || '',
          village: temple.village || '',
          disabled: temple.disabled || false
        };

        // Directly save the changes to backend
        const response = await fetch(`${API_BASE_URL}/update_temple.ts`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          setMessage('Temple translated and updated successfully');
          setMessageType('success');
          // Refresh the current page data
          fetchTemples(currentPage);
        } else {
          const error = await response.json();
          setMessage(error.error || 'Failed to update temple');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Translation or save failed:', error);
        setMessage('Error translating or updating temple');
        setMessageType('error');
      } finally {
        setSaving(false);
      }
    }
  };

  const setHinduTempleName = async (templeId) => {
    // Find the temple in the current data
    const temple = temples.find(t => t.id === templeId);
    if (temple) {
      // Prepare the update data directly
      const updateData = {
        id: temple.id,
        osm_id: temple.osm_id || '',
        level: temple.level || '',
        latitude: temple.latitude || '',
        longitude: temple.longitude || '',
        name: 'Hindu Temple',  // Set standardized name
        temple_name: '',       // Clear temple_name field
        deity: temple.deity || '',
        description: temple.description || '',
        location: temple.location || '',
        district: temple.district || '',
        suburb: temple.suburb || '',
        village: temple.village || '',
        disabled: temple.disabled || false
      };

      // Directly save the changes to backend
      try {
        setSaving(true);
        setMessage('');

        const response = await fetch(`${API_BASE_URL}/update_temple.ts`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          setMessage('Temple updated successfully');
          setMessageType('success');
          // Refresh the current page data
          fetchTemples(currentPage);
        } else {
          const error = await response.json();
          setMessage(error.error || 'Failed to update temple');
          setMessageType('error');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        setMessage('Error updating temple');
        setMessageType('error');
      } finally {
        setSaving(false);
      }
    }
  };

  const deleteTemple = async (templeId) => {
    // Show confirmation dialog
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this temple? This action cannot be undone.'
    );

    if (!confirmDelete) {
      return; // User cancelled
    }

    try {
      setSaving(true);
      setMessage('');

      const response = await fetch(`${API_BASE_URL}/delete_temple.ts?id=${templeId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setMessage('Temple deleted successfully');
        setMessageType('success');
        // Refresh the current page data
        fetchTemples(currentPage);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to delete temple');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      setMessage('Error deleting temple');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const generatePageNumbers = () => {
    if (!pagination) return [];

    const { currentPage, totalPages } = pagination;
    const pages = [];
    const maxVisiblePages = 7; // Show max 7 page numbers

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination with ellipsis
      if (currentPage <= 4) {
        // Near the beginning
        pages.push(1, 2, 3, 4, 5, '...', totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // In the middle
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const renderCell = (temple, field) => {
    if (editingRow === temple.id) {
      if (field === 'description') {
        return (
          <textarea
            value={editData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="edit-textarea"
            rows={3}
          />
        );
      } else {
        return (
          <input
            type={field === 'latitude' || field === 'longitude' || field === 'level' ? 'number' : 'text'}
            value={editData[field] || ''}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className="edit-input"
            step={field === 'latitude' || field === 'longitude' ? 'any' : undefined}
          />
        );
      }
    } else {
      return temple[field] || '';
    }
  };

  if (loading) {
    return <div className="loading">Loading temples...</div>;
  }

  return (
    <div className="temple-management">
      <h1>Temple Management</h1>

      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      <div className="table-container">
        <table className="temples-table">
          <thead>
            <tr>
              <th>OSM ID</th>
              <th>Level</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Name</th>
              <th>Copy</th>
              <th>Temple Name</th>
              <th>Deity</th>
              <th>Description</th>
              <th>Location</th>
              <th>District</th>
              <th>Suburb</th>
              <th>Village</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {temples.map((temple) => (
              <tr key={temple.id}>
                <td>{renderCell(temple, 'osm_id')}</td>
                <td>{renderCell(temple, 'level')}</td>
                <td>{renderCell(temple, 'latitude')}</td>
                <td>{renderCell(temple, 'longitude')}</td>
                <td>{renderCell(temple, 'name')}</td>
                <td>
                  <div className="copy-buttons">
                    {(editingRow === temple.id ? editData.temple_name : temple.temple_name) ? (
                      <>
                        <button
                          className="copy-name-button"
                          onClick={() => copyTempleNameToName(temple.id)}
                          title="Copy Temple Name to Name field"
                        >
                          📋
                        </button>
                        <button
                          className="translate-button"
                          onClick={() => copyAndTranslateTempleNameToName(temple.id)}
                          title="Translate & Copy Temple Name to Name field"
                        >
                          🌐
                        </button>
                      </>
                    ) : null}
                    <button
                      className="hindu-temple-button"
                      onClick={() => setHinduTempleName(temple.id)}
                      title="Set Name to 'Hindu Temple'"
                    >
                      🕉️
                    </button>
                  </div>
                </td>
                <td>{renderCell(temple, 'temple_name')}</td>
                <td>{renderCell(temple, 'deity')}</td>
                <td>{renderCell(temple, 'description')}</td>
                <td>{renderCell(temple, 'location')}</td>
                <td>{renderCell(temple, 'district')}</td>
                <td>{renderCell(temple, 'suburb')}</td>
                <td>{renderCell(temple, 'village')}</td>
                <td>
                  <div className="action-buttons">
                    {editingRow === temple.id ? (
                      <>
                        <button
                          className="save-button"
                          onClick={saveTemple}
                          disabled={saving}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          className="cancel-button"
                          onClick={cancelEditing}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="edit-button"
                          onClick={() => startEditing(temple)}
                        >
                          Edit
                        </button>
                        <button
                          className="maps-button"
                          onClick={() => openInGoogleMaps(temple.latitude, temple.longitude, temple.name)}
                          disabled={!temple.latitude || !temple.longitude}
                          title="View on Google Maps"
                        >
                          🗺️ Maps
                        </button>
                        {temple.disabled ? (
                          <button
                            className="enable-button"
                            onClick={() => toggleDisabled(temple.id, false)}
                          >
                            Enable
                          </button>
                        ) : (
                          <button
                            className="disable-button"
                            onClick={() => toggleDisabled(temple.id, true)}
                          >
                            Disable
                          </button>
                        )}
                        <button
                          className="delete-button"
                          onClick={() => deleteTemple(temple.id)}
                          title="Delete this temple"
                        >
                          🗑️ Delete
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    </div>
  );
};

export default TempleManagement;
