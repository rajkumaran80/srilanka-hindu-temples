import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, Tooltip, useMapEvents, useMap, TileLayer } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './MapComponent.css';

// Import marker icons for mobile compatibility
import markerIcon from '/images/marker-icon-green.png';
import markerIconRetina from '/images/marker-icon-2x-green.png';
import markerShadow from '/images/marker-shadow.png';

// Use default marker icons with imported assets
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [0, -32],
  shadowSize: [32, 32],
});

// Create icons for markers
const greenIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [20, 32],
  iconAnchor: [10, 32],
  popupAnchor: [0, -32],
  shadowSize: [32, 32],
});

const selectedIcon = new L.Icon({
  iconUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [30, 48], // Larger size for selected
  iconAnchor: [15, 48],
  popupAnchor: [0, -48],
  shadowSize: [48, 48],
});

import TempleDetail from './TempleDetail';
import { API_BASE_URL } from '../Constants';

// Component to handle map flying
const MapController = ({ flyToPosition, onMapReady, onFlyToComplete, isFlyingRef }) => {
  const map = useMap();

  useEffect(() => {
    if (flyToPosition) {
      map.flyTo(flyToPosition, 15);
      // Listen for moveend to know when flyTo completes
      const handleMoveEnd = () => {
        if (onFlyToComplete) {
          onFlyToComplete();
        }
        isFlyingRef.current = false;
        map.off('moveend', handleMoveEnd);
      };
      map.on('moveend', handleMoveEnd);
    }
  }, [flyToPosition, onFlyToComplete, isFlyingRef]);

  useEffect(() => {
    if (onMapReady) {
      onMapReady(map);
    }
  }, [map, onMapReady]);

  return null;
};

// Component to handle map events
const MapEventHandler = ({ onBoundsChange, onZoomChange, onMapInteraction, onMapClick, isFlyingRef }) => {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
      // Also trigger bounds change when zoom ends
      const bounds = map.getBounds();
      onBoundsChange(bounds);
      // Close popups on zoom if not flying
      if (!isFlyingRef.current) {
        onMapInteraction();
      }
    },
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
      // Close popups on move if not flying
      if (!isFlyingRef.current) {
        onMapInteraction();
      }
    },
    click: () => {
      // Reset search and selected marker on map click
      onMapClick();
    }
  });
  return null;
};

const MapComponent = () => {
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedBounds, setLoadedBounds] = useState(new Set()); // Track loaded geographic areas
  const [currentZoom, setCurrentZoom] = useState(7);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [mapInteractionByUser, setMapInteractionByUser] = useState(true);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentMessage, setCommentMessage] = useState('');
  const [commentMessageType, setCommentMessageType] = useState(''); // 'success' or 'error'
  const [showSuggestNameForm, setShowSuggestNameForm] = useState(false);
  const [suggestedNameText, setSuggestedNameText] = useState('');
  const [submittingSuggestedName, setSubmittingSuggestedName] = useState(false);
  const [suggestNameMessage, setSuggestNameMessage] = useState('');
  const [suggestNameMessageType, setSuggestNameMessageType] = useState(''); // 'success' or 'error'
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflinePopup, setShowOfflinePopup] = useState(!navigator.onLine);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);

  const markersRef = useRef({});
  const mapRef = useRef(null);
  const isFlyingRef = useRef(false);
  const tileLayerRef = useRef(null);
  const minZoomForBoundsLoading = 10; // Only load temples by bounds when zoomed in enough

  const fetchInitialTemples = async (isRetry = false) => {
    if (isRetry) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(`${apiBaseUrl}/api/temples_initial.ts`);
      if (response.ok) {
        const data = await response.json();
        setTemples(data);
        setHasAttemptedInitialLoad(true);
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.error('Error fetching initial temples:', error);
      setHasAttemptedInitialLoad(true);
    } finally {
      setLoading(false);
      if (isRetry) {
        setIsRefreshing(false);
      }
    }
  };

  const refreshData = () => {
    if (!isOnline) return;
    setLoading(true);
    setHasAttemptedInitialLoad(false);
    fetchInitialTemples(true);
  };

  const fetchTemplesByBounds = async (bounds) => {
    try {
      const { _northEast, _southWest } = bounds;
      const north = _northEast.lat;
      const south = _southWest.lat;
      const east = _northEast.lng;
      const west = _southWest.lng;

      const boundsKey = `${north}-${south}-${east}-${west}`;

      // Check if we've already loaded temples for this area
      if (loadedBounds.has(boundsKey)) {
        return;
      }

      const response = await fetch(
        `${apiBaseUrl}/api/temples_load.ts?north=${north}&south=${south}&east=${east}&west=${west}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();

        // Merge with existing temples, avoiding duplicates
        setTemples(prevTemples => {
          const existingIds = new Set(prevTemples.map(t => t.id));
          const newTemples = data.filter(temple => !existingIds.has(temple.id));
          return [...prevTemples, ...newTemples];
        });

        // Mark this bounds area as loaded
        setLoadedBounds(prev => new Set([...prev, boundsKey]));
      }
    } catch (error) {
      console.error('Error fetching temples by bounds:', error);
    }
  };

  const handleBoundsChange = (bounds) => {
    // Only load additional temples if zoomed in enough
    if (currentZoom >= minZoomForBoundsLoading) {
      fetchTemplesByBounds(bounds);
    }
  };

  const handleZoomChange = (zoom) => {
    setCurrentZoom(zoom);
  };

  const searchTemplesByName = async (name) => {
    if (!name.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    try {
      const response = await fetch(`${apiBaseUrl}/api/temples_search_by_name.ts?name=${encodeURIComponent(name)}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      }
    } catch (error) {
      console.error('Error searching temples:', error);
    }
  };

  const fetchTempleById = async (templeId) => {
    try {
      // Use the search by name API with the temple ID as name to get fresh data
      // Since we want exact match, we'll search and find the temple with matching ID
      const response = await fetch(`${apiBaseUrl}/api/temples_search_by_id.ts?id=${encodeURIComponent(templeId)}`);
      if (response.ok) {
        const results = await response.json();
        // Find the temple with matching ID
        const temple = results.find(t => (t.id) === templeId);
        return temple;
      }
    } catch (error) {
      console.error('Error fetching temple by ID:', error);
    }
    return null;
  };

  const selectTemple = (temple) => {
    const templeId = temple.id;
    setSelectedMarkerId(templeId);
    isFlyingRef.current = true;
    setFlyToPosition([temple.latitude, temple.longitude]);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
    setMapInteractionByUser(false);
    // Ensure the temple is in the temples list for marker rendering
    setTemples(prev => {
      const exists = prev.some(t => t.id === templeId);
      if (!exists) {
        return [...prev, temple];
      }
      return prev;
    });
    // Open the popup immediately
    setTimeout(() => {
      const marker = markersRef.current[templeId];
      if (marker && marker._map) {
        marker.openPopup();
      }
    }, 100); // Small delay to ensure marker is rendered
  };

  const handleMapReady = (map) => {
    mapRef.current = map;
  };

  const handleFlyToComplete = () => {
    setFlyToPosition(null);
    setMapInteractionByUser(true);
  };

  const handleMapInteraction = () => {
    // Close all popups
    if (mapInteractionByUser && mapRef.current) {
      mapRef.current.closePopup();
    }
    // Reset search
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const handleMapClick = () => {
    handleMapInteraction();
    // Reset selected marker on map click
    setSelectedMarkerId(null);
  };

  const submitComment = async (templeId, comment) => {
    if (!comment.trim()) return;

    setSubmittingComment(true);
    setCommentMessage('');
    setCommentMessageType('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/add_temple_comment.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templeId: templeId,
          comment: comment.trim(),
        }),
      });

      if (response.ok) {
        setCommentMessage('Comment added successfully!');
        setCommentMessageType('success');
        setCommentText('');
        setShowCommentForm(false);
      } else {
        setCommentMessage('Failed to add comment. Please try again.');
        setCommentMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      setCommentMessage('Error submitting comment. Please try again.');
      setCommentMessageType('error');
    } finally {
      setSubmittingComment(false);
    }
  };

  const submitSuggestedName = async (templeId, suggestedName) => {
    if (!suggestedName.trim()) return;

    setSubmittingSuggestedName(true);
    setSuggestNameMessage('');
    setSuggestNameMessageType('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/add_suggested_temple_name.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templeId: templeId,
          suggestedName: suggestedName.trim(),
        }),
      });

      if (response.ok) {
        setSuggestNameMessage('Suggested name submitted successfully!');
        setSuggestNameMessageType('success');
        setSuggestedNameText('');
        setShowSuggestNameForm(false);
      } else {
        setSuggestNameMessage('Failed to submit suggested name. Please try again.');
        setSuggestNameMessageType('error');
      }
    } catch (error) {
      console.error('Error submitting suggested name:', error);
      setSuggestNameMessage('Error submitting suggested name. Please try again.');
      setSuggestNameMessageType('error');
    } finally {
      setSubmittingSuggestedName(false);
    }
  };

  const cacheSriLankaTiles = async () => {
    // Cache function removed - using standard tiles only
  };

  const clearCache = async () => {
    // Cache function removed - using standard tiles only
  };

  const updateOnlineStatus = () => {
    const wasOffline = !isOnline;
    setIsOnline(navigator.onLine);
    
    // Show/hide offline popup
    if (navigator.onLine) {
      // Coming back online - hide popup and reload data
      setShowOfflinePopup(false);
      console.log('Came back online, reloading data...');
      setLoading(true);
      setHasAttemptedInitialLoad(false);
      fetchInitialTemples();
    } else {
      // Going offline - show popup
      setShowOfflinePopup(true);
    }
  };

  // Online/offline status monitoring
  useEffect(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const initializeApi = async () => {
      setApiBaseUrl(API_BASE_URL);
    };
    initializeApi();
  }, []);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchInitialTemples();
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (apiBaseUrl) {
      searchTemplesByName(searchTerm);
    }
  }, [searchTerm, apiBaseUrl]);

  // Close popups when temple details are opened
  useEffect(() => {
    if (selectedTemple && mapRef.current) {
      mapRef.current.closePopup();
      setSelectedMarkerId(null);
    }
  }, [selectedTemple]);

  // Update marker icons when selection changes
  useEffect(() => {
    Object.keys(markersRef.current).forEach(templeId => {
      const marker = markersRef.current[templeId];
      if (marker) {
        if (templeId === selectedMarkerId) {
          marker.setIcon(selectedIcon);
        } else {
          marker.setIcon(greenIcon);
        }
      }
    });
  }, [selectedMarkerId]);

  // Auto-hide comment messages after 3 seconds
  useEffect(() => {
    if (commentMessage) {
      const timer = setTimeout(() => {
        setCommentMessage('');
        setCommentMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [commentMessage]);

  // Auto-hide suggest name messages after 3 seconds
  useEffect(() => {
    if (suggestNameMessage) {
      const timer = setTimeout(() => {
        setSuggestNameMessage('');
        setSuggestNameMessageType('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [suggestNameMessage]);



  const sriLankaCenter = [7.8731, 80.7718];

  console.log('Rendering MapComponent, temples:', temples, 'loading:', loading);

  const idFor = (temple) => String(temple.id ?? '');

    return (
      <div className="map-component">
        {/* Offline Status Bar */}
        {!isOnline && (
          <div className="offline-status-bar">
            📡 Offline - Limited functionality
          </div>
        )}

        {/* Always show map and search functionality */}
      {!loading && (
        <>
          {/* Always show map and search functionality */}
          <>
            <input
              type="text"
              className="search-input"
              placeholder="Search temples by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {showDropdown && (
              <ul className="search-dropdown">
                {searchResults.map((temple) => (
                  <li key={temple.id} onClick={() => selectTemple(temple)}>
                    <div>{temple.name}</div>
                    {temple.location && <div>{temple.location}</div>}
                  </li>
                ))}
              </ul>
            )}
            <MapContainer
              center={sriLankaCenter}
              zoom={7}
              zoomControl={isOnline}
              scrollWheelZoom={isOnline}
              doubleClickZoom={isOnline}
              boxZoom={isOnline}
              touchZoom={isOnline}
              dragging={true}
              keyboard={isOnline}
              className="map-container"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                maxZoom={19}
                minZoom={3}
                crossOrigin="anonymous"
              />
              <MapController flyToPosition={flyToPosition} onMapReady={handleMapReady} onFlyToComplete={handleFlyToComplete} isFlyingRef={isFlyingRef} />
              <MapEventHandler
                onBoundsChange={handleBoundsChange}
                onZoomChange={handleZoomChange}
                onMapInteraction={handleMapInteraction}
                onMapClick={handleMapClick}
                isFlyingRef={isFlyingRef}
              />
              {temples.map((temple) => (
              <Marker
                key={temple.id}
                position={[temple.latitude, temple.longitude]}
                ref={(el) => { markersRef.current[temple.id] = el; }}
                className={selectedMarkerId === (temple.id) ? 'selected-marker' : ''}
                eventHandlers={{
                  click: () => setSelectedMarkerId(idFor(temple)),
                }}
              >
                <Tooltip>{temple.name}</Tooltip>
                <Popup maxWidth={250} minWidth={200} autoPan={false}>
                  <div className="popup-content">
                    <h3 className="popup-heading">{temple.name}</h3>
                    <p className="popup-location">{temple.location}</p>
                    <div className="popup-button-group">
                      <button className="popup-button" onClick={async () => {
                        // Fetch fresh temple data before opening details
                        const freshTemple = await fetchTempleById(idFor(temple));
                        setSelectedTemple(freshTemple || temple);
                      }}>View Details</button>
                      <button className="popup-button" onClick={() => {
                        setShowCommentForm(true);
                        setCommentText('');
                      }}>Add Comment</button>
                    </div>
                    <div className="popup-button-group">
                      <button className="popup-button" onClick={() => {
                        setShowSuggestNameForm(true);
                        setSuggestedNameText('');
                      }}>Suggest Name</button>
                    </div>
                    {showCommentForm && selectedMarkerId === idFor(temple) && (
                      <div className="popup-form-container">
                        <textarea
                          className="popup-textarea"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="Enter your comment..."
                          rows={3}
                          disabled={submittingComment}
                        />
                        <div className="form-button-group">
                          <button
                            className="form-submit-button"
                            onClick={() => submitComment(idFor(temple), commentText)}
                            disabled={submittingComment || !commentText.trim()}
                          >
                            {submittingComment ? 'Submitting...' : 'Submit'}
                          </button>
                          <button
                            className="form-cancel-button"
                            onClick={() => {
                              setShowCommentForm(false);
                              setCommentText('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {showSuggestNameForm && selectedMarkerId === idFor(temple) && (
                      <div className="popup-form-container">
                        <input
                          type="text"
                          className="popup-input"
                          value={suggestedNameText}
                          onChange={(e) => setSuggestedNameText(e.target.value)}
                          placeholder="Enter suggested temple name..."
                          disabled={submittingSuggestedName}
                        />
                        <div className="form-button-group">
                          <button
                            className="form-submit-button"
                            onClick={() => submitSuggestedName(idFor(temple), suggestedNameText)}
                            disabled={submittingSuggestedName || !suggestedNameText.trim()}
                          >
                            {submittingSuggestedName ? 'Submitting...' : 'Submit'}
                          </button>
                          <button
                            className="form-cancel-button"
                            onClick={() => {
                              setShowSuggestNameForm(false);
                              setSuggestedNameText('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                    {commentMessage && selectedMarkerId === idFor(temple) && (
                      <div className={`message-box ${commentMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                        {commentMessage}
                      </div>
                    )}
                    {suggestNameMessage && selectedMarkerId === idFor(temple) && (
                      <div className={`message-box ${suggestNameMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                        {suggestNameMessage}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </>
        {selectedTemple && (
          <TempleDetail
            temple={selectedTemple}
            onClose={() => setSelectedTemple(null)}
          />
        )}
      </>
    )}
  </div>
  );
};

export default MapComponent;
