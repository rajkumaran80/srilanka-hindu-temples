import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import OfflineTileLayer from './OfflineTileLayer';
import 'leaflet/dist/leaflet.css';

// Import marker icons for mobile compatibility
import markerIcon from '/images/marker-icon-green.png';
import markerIconSelected from '/images/marker-icon-red.png';
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [cachedTilesCount, setCachedTilesCount] = useState(0);
  const [showOfflineControls, setShowOfflineControls] = useState(false);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Offline functionality
  const downloadMapArea = async () => {
    if (!mapRef.current || !tileLayerRef.current) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const bounds = mapRef.current.getBounds();
      const minZoom = Math.max(8, currentZoom - 2); // Download from current zoom - 2
      const maxZoom = Math.min(16, currentZoom + 2); // Up to current zoom + 2

      await tileLayerRef.current.preloadTiles(bounds, minZoom, maxZoom);

      // Update cached tiles count
      const count = await tileLayerRef.current.getCacheSize();
      setCachedTilesCount(count);

      setDownloadProgress(100);
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Error downloading map area:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const clearCache = async () => {
    if (!tileLayerRef.current) return;

    try {
      await tileLayerRef.current.clearCache();
      setCachedTilesCount(0);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  const updateOnlineStatus = () => {
    const wasOffline = !isOnline;
    setIsOnline(navigator.onLine);

    // If we just came back online and haven't loaded data yet, try to load it
    if (navigator.onLine && wasOffline && hasAttemptedInitialLoad && temples.length === 0) {
      console.log('Came back online, retrying to load temple data...');
      setLoading(true);
      setHasAttemptedInitialLoad(false);
      fetchInitialTemples();
    }
  };

  const handleLayerReady = (layer) => {
    tileLayerRef.current = layer;
    // Update cache size on layer ready
    if (layer.getCacheSize) {
      layer.getCacheSize().then(count => setCachedTilesCount(count));
    }
  };

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

  // Online/offline status monitoring
  useEffect(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);



  const sriLankaCenter = [7.8731, 80.7718];

  console.log('Rendering MapComponent, temples:', temples, 'loading:', loading);

  const idFor = (temple) => String(temple.id ?? '');

    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <style>
          {`
            .selected-marker img {
              box-shadow: 0 0 10px 3px rgba(255, 0, 0, 0.8);
              border-radius: 50%;
            }
            .leaflet-container {
              height: 100% !important;
              width: 100% !important;
            }
          `}
        </style>
      {!loading && (
        <>
          {/* Status bar */}
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            zIndex: 1000,
            display: 'flex',
            gap: '5px',
            alignItems: 'center'
          }}>
            <div style={{
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              backgroundColor: isOnline ? '#d4edda' : '#f8d7da',
              color: isOnline ? '#155724' : '#721c24',
              border: `1px solid ${isOnline ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {isOnline ? 'Online' : 'Offline'}
            </div>
            {temples.length > 0 && (
              <div style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                backgroundColor: '#e9ecef',
                color: '#495057',
                border: '1px solid #ced4da'
              }}>
                {cachedTilesCount} tiles cached
              </div>
            )}
            {temples.length > 0 && (
              <button
                onClick={() => setShowOfflineControls(!showOfflineControls)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Offline
              </button>
            )}
          </div>

          {/* Offline message when no data and offline */}
          {!loading && hasAttemptedInitialLoad && temples.length === 0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              maxWidth: '300px',
              zIndex: 1000
            }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>No Internet Connection</h3>
              <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>
                Unable to load temple data. Please check your connection and try again.
              </p>
              <button
                onClick={refreshData}
                disabled={!isOnline || isRefreshing}
                style={{
                  padding: '10px 20px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: (!isOnline || isRefreshing) ? '#6c757d' : '#007bff',
                  color: 'white',
                  border: 'none',
                  cursor: (!isOnline || isRefreshing) ? 'not-allowed' : 'pointer',
                  opacity: (!isOnline || isRefreshing) ? 0.6 : 1
                }}
              >
                {isRefreshing ? 'Refreshing...' : isOnline ? 'Refresh' : 'Waiting for connection...'}
              </button>
            </div>
          )}

          {/* Show map only when we have data */}
          {temples.length > 0 && (
            <>
              {/* Offline controls panel */}
              {showOfflineControls && (
                <div style={{
                  position: 'absolute',
                  top: '50px',
                  right: '5px',
                  zIndex: 1000,
                  backgroundColor: 'white',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  padding: '10px',
                  minWidth: '200px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Offline Map Controls</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <button
                      onClick={downloadMapArea}
                      disabled={isDownloading || !isOnline}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: isDownloading ? '#ffc107' : '#28a745',
                        color: 'white',
                        border: 'none',
                        cursor: isDownloading || !isOnline ? 'not-allowed' : 'pointer',
                        opacity: isDownloading || !isOnline ? 0.6 : 1
                      }}
                    >
                      {isDownloading ? `Downloading... ${downloadProgress}%` : 'Download Current Area'}
                    </button>
                    <button
                      onClick={clearCache}
                      style={{
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Clear Cache ({cachedTilesCount} tiles)
                    </button>
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                    Downloads tiles for zoom levels {Math.max(8, currentZoom - 2)}-{Math.min(16, currentZoom + 2)}
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder="Search temples by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ margin: '5px', padding: '8px', fontSize: '14px' }}
              />
              {showDropdown && (
                <ul style={{ margin: '0 5px', padding: 0, listStyle: 'none', background: 'white', border: '1px solid #ccc', maxHeight: '200px', overflowY: 'auto', position: 'absolute', zIndex: 1000, width: 'calc(100% - 10px)', top: '40px' }}>
                  {searchResults.map((temple) => (
                    <li key={temple.id} onClick={() => selectTemple(temple)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold' }}>{temple.name}</div>
                      {temple.location && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{temple.location}</div>}
                    </li>
                  ))}
                </ul>
              )}
              <MapContainer center={sriLankaCenter} zoom={7} zoomControl={false} style={{ height: '100%', width: '100%', flex: 1 }}>
                <OfflineTileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  onLayerReady={handleLayerReady}
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
                    <div style={{ fontSize: '12px' }}>
                      <h3 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{temple.name}</h3>
                      <p style={{ margin: '0 0 5px 0' }}>{temple.location}</p>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                        <button onClick={async () => {
                          // Fetch fresh temple data before opening details
                          const freshTemple = await fetchTempleById(idFor(temple));
                          setSelectedTemple(freshTemple || temple);
                        }} style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}>View Details</button>
                        <button onClick={() => {
                          setShowCommentForm(true);
                          setCommentText('');
                        }} style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}>Add Comment</button>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '5px' }}>
                        <button onClick={() => {
                          setShowSuggestNameForm(true);
                          setSuggestedNameText('');
                        }} style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}>Suggest Name</button>
                      </div>
                      {showCommentForm && selectedMarkerId === idFor(temple) && (
                        <div style={{ border: '1px solid #ccc', padding: '8px', marginTop: '5px', backgroundColor: '#f9f9f9' }}>
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Enter your comment..."
                            rows={3}
                            style={{ width: '100%', fontSize: '11px', padding: '4px', marginBottom: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                            disabled={submittingComment}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => submitComment(idFor(temple), commentText)}
                              disabled={submittingComment || !commentText.trim()}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                flex: 1,
                                backgroundColor: submittingComment ? '#ccc' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: submittingComment ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {submittingComment ? 'Submitting...' : 'Submit'}
                            </button>
                            <button
                              onClick={() => {
                                setShowCommentForm(false);
                                setCommentText('');
                              }}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                flex: 1,
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {showSuggestNameForm && selectedMarkerId === idFor(temple) && (
                        <div style={{ border: '1px solid #ccc', padding: '8px', marginTop: '5px', backgroundColor: '#f9f9f9' }}>
                          <input
                            type="text"
                            value={suggestedNameText}
                            onChange={(e) => setSuggestedNameText(e.target.value)}
                            placeholder="Enter suggested temple name..."
                            style={{ width: '100%', fontSize: '11px', padding: '4px', marginBottom: '5px', border: '1px solid #ccc', borderRadius: '3px' }}
                            disabled={submittingSuggestedName}
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => submitSuggestedName(idFor(temple), suggestedNameText)}
                              disabled={submittingSuggestedName || !suggestedNameText.trim()}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                flex: 1,
                                backgroundColor: submittingSuggestedName ? '#ccc' : '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: submittingSuggestedName ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {submittingSuggestedName ? 'Submitting...' : 'Submit'}
                            </button>
                            <button
                              onClick={() => {
                                setShowSuggestNameForm(false);
                                setSuggestedNameText('');
                              }}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                flex: 1,
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '3px',
                                cursor: 'pointer'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      {commentMessage && selectedMarkerId === idFor(temple) && (
                        <div style={{
                          padding: '6px',
                          marginTop: '5px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          backgroundColor: commentMessageType === 'success' ? '#d4edda' : '#f8d7da',
                          color: commentMessageType === 'success' ? '#155724' : '#721c24',
                          border: `1px solid ${commentMessageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                        }}>
                          {commentMessage}
                        </div>
                      )}
                      {suggestNameMessage && selectedMarkerId === idFor(temple) && (
                        <div style={{
                          padding: '6px',
                          marginTop: '5px',
                          borderRadius: '3px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          backgroundColor: suggestNameMessageType === 'success' ? '#d4edda' : '#f8d7da',
                          color: suggestNameMessageType === 'success' ? '#155724' : '#721c24',
                          border: `1px solid ${suggestNameMessageType === 'success' ? '#c3e6cb' : '#f5c6cb'}`
                        }}>
                          {suggestNameMessage}
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </>
        )}
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
