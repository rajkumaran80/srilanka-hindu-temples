import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
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

// Helper function to get the correct API base URL based on platform
const getApiBaseUrl = async () => {
  if (!Capacitor.isNativePlatform()) {
    // Web platform - use localhost
    return 'http://localhost:8080';
  }

  const deviceInfo = await Device.getInfo();
  if (deviceInfo.platform === 'android') {
    // Android emulator special IP to reach host machine
    return 'http://10.0.2.2:8080';
  } else if (deviceInfo.platform === 'ios') {
    // iOS simulator - need to get host machine IP
    return 'http://192.168.1.159:8080';
  }

  // Fallback
  return 'https://srilanka-hindu-temples-mobile.vercel.app';

};

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

  const markersRef = useRef({});
  const mapRef = useRef(null);
  const isFlyingRef = useRef(false);
  const minZoomForBoundsLoading = 10; // Only load temples by bounds when zoomed in enough

  const fetchInitialTemples = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/temples_initial.ts`);
      if (response.ok) {
        const data = await response.json();
        setTemples(data);
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      console.error('Error fetching initial temples:', error);
    } finally {
      setLoading(false);
    }
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
        `${apiBaseUrl}/api/temples_search.ts?north=${north}&south=${south}&east=${east}&west=${west}&limit=20`
      );

      if (response.ok) {
        const data = await response.json();

        // Merge with existing temples, avoiding duplicates
        setTemples(prevTemples => {
          const existingIds = new Set(prevTemples.map(t => t._id || t.id));
          const newTemples = data.filter(temple => !existingIds.has(temple._id || temple.id));
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

  const selectTemple = (temple) => {
    const templeId = temple._id || temple.id;
    setSelectedMarkerId(templeId);
    isFlyingRef.current = true;
    setFlyToPosition([temple.latitude, temple.longitude]);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
    setMapInteractionByUser(false);
    // Ensure the temple is in the temples list for marker rendering
    setTemples(prev => {
      const exists = prev.some(t => (t._id || t.id) === templeId);
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

  try {
    console.log('Rendering MapComponent, temples:', temples, 'loading:', loading);

    const idFor = (temple) => String(temple._id ?? temple.id ?? '');

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <style>
          {`
            .selected-marker img {
              box-shadow: 0 0 10px 3px rgba(255, 0, 0, 0.8);
              border-radius: 50%;
            }
          `}
        </style>
        {!loading && temples.length > 0 && (
          <>
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
                  <li key={temple._id} onClick={() => selectTemple(temple)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold' }}>{temple.name}</div>
                    {temple.location && <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{temple.location}</div>}
                  </li>
                ))}
              </ul>
            )}
            <MapContainer center={sriLankaCenter} zoom={7} zoomControl={false} style={{ height: '100%', width: '100%', flex: 1 }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                key={temple._id || temple.id}
                position={[temple.latitude, temple.longitude]}
                ref={(el) => { markersRef.current[temple._id || temple.id] = el; }}
                className={selectedMarkerId === (temple._id || temple.id) ? 'selected-marker' : ''}
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
                      <button onClick={() => {
                        setSelectedTemple(temple);
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
      </div>
    );
  } catch (error) {
    console.error('Error rendering MapComponent:', error);
    return <div>Error loading map: {error.message}</div>;
  }
};

export default MapComponent;
