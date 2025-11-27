import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, Tooltip, useMapEvents, useMap, TileLayer } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './MapComponent.css';

// Try to use default Leaflet markers first - they should work on mobile
// If custom icons fail to load, the map will still show with default markers
let greenIcon, redIcon, goldIcon, selectedIcon;

try {
  // Import marker icons for mobile compatibility
  const markerIconGreen = '/images/marker-icon-green.png';
  const markerIconRed = '/images/marker-icon-red.png';
  const markerIconGold = '/images/marker-icon-gold.png';
  const markerIconRetina = '/images/marker-icon-2x-green.png';
  const markerShadow = '/images/marker-shadow.png';

  // Create icons for markers
  greenIcon = new L.Icon({
    iconUrl: markerIconGreen,
    shadowUrl: markerShadow,
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    popupAnchor: [0, -32],
    shadowSize: [32, 32],
  });

  redIcon = new L.Icon({
    iconUrl: markerIconRed,
    shadowUrl: markerShadow,
    iconSize: [20, 32],
    iconAnchor: [10, 32],
    popupAnchor: [0, -32],
    shadowSize: [32, 32],
  });

  goldIcon = new L.Icon({
    iconUrl: markerIconGold,
    shadowUrl: markerShadow,
    iconSize: [30, 48], // Larger size for selected
    iconAnchor: [15, 48],
    popupAnchor: [0, -48],
    shadowSize: [48, 48],
  });

  selectedIcon = new L.Icon({
    iconUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [30, 48], // Larger size for selected
    iconAnchor: [15, 48],
    popupAnchor: [0, -48],
    shadowSize: [48, 48],
  });

  console.log('✅ Custom marker icons loaded successfully');
} catch (error) {
  console.warn('⚠️ Custom marker icons failed to load, using defaults:', error);
  // Use default Leaflet icons if custom ones fail
  greenIcon = new L.Icon.Default();
  redIcon = new L.Icon.Default();
  goldIcon = new L.Icon.Default();
  selectedIcon = new L.Icon.Default();
}

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
const MapEventHandler = ({ onBoundsChange, onZoomChange, onMapInteraction, onMapClick, onMapClickInAddMode, addTempleMode, isFlyingRef }) => {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
      // Also trigger bounds change when zoom ends - pass zoom level directly to avoid async state issues
      const bounds = map.getBounds();
      onBoundsChange(bounds, zoom);
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
    click: (event) => {
      if (addTempleMode) {
        onMapClickInAddMode(event);
      } else {
        // Reset search and selected marker on map click
        onMapClick();
      }
    }
  });
  return null;
};

const MapComponent = () => {
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [temples, setTemples] = useState([]);
  const [zoom, setZoom] = useState(7);
  const [loading, setLoading] = useState(true);
  const [loadedBounds, setLoadedBounds] = useState(new Set()); // Track loaded geographic areas
  const [currentZoom, setCurrentZoom] = useState(7);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flyToPosition, setFlyToPosition] = useState(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [mapInteractionByUser, setMapInteractionByUser] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflinePopup, setShowOfflinePopup] = useState(!navigator.onLine);
  const [hasAttemptedInitialLoad, setHasAttemptedInitialLoad] = useState(false);
  const [addTempleMode, setAddTempleMode] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showAddTempleForm, setShowAddTempleForm] = useState(false);
  const [newTempleData, setNewTempleData] = useState({
    name: '',
    location: '',
    description: '',
    deity: '',
    temple_type: '',
    district: '',
    photos: []
  });
  const [selectedPhotoFiles, setSelectedPhotoFiles] = useState([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submittingTemple, setSubmittingTemple] = useState(false);
  const [addTempleMessage, setAddTempleMessage] = useState('');
  const [addTempleMessageType, setAddTempleMessageType] = useState('');
  const [hotelSearchResults, setHotelSearchResults] = useState([]);
  const [showHotelResults, setShowHotelResults] = useState(false);
  const [searchingHotels, setSearchingHotels] = useState(false);
  const [hotelSearchError, setHotelSearchError] = useState('');

  const markersRef = useRef({});
  const mapRef = useRef(null);
  const isFlyingRef = useRef(false);
  const tileLayerRef = useRef(null);
  const minZoomForBoundsLoading = 7; // Only load temples by bounds when zoomed in enough

  const fetchInitialTemples = async (isRetry = false) => {
    console.log('🔄 Fetching initial temples from:', `${API_BASE_URL}/api/temples_initial.ts`);

    try {
      const response = await fetch(`${API_BASE_URL}/api/temples_initial.ts`);
      console.log('📡 API Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Temples loaded:', data.length);
        setTemples(data);
        setHasAttemptedInitialLoad(true);
      } else {
        console.error('❌ API Response not OK:', response.status, response.statusText);
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching initial temples:', error);
      setHasAttemptedInitialLoad(true);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    if (!isOnline) return;
    setLoading(true);
    setHasAttemptedInitialLoad(false);
    fetchInitialTemples(true);
  };

  const fetchTemplesByBounds = async (bounds, zoom) => {
    try {
      const { _northEast, _southWest } = bounds;
      const north = _northEast.lat;
      const south = _southWest.lat;
      const east = _northEast.lng;
      const west = _southWest.lng;

      const boundsKey = `${north}-${south}-${east}-${west}-${zoom}`;

      // Check if we've already loaded temples for this area at this zoom level
      if (loadedBounds.has(boundsKey)) {
        return;
      }

      const allowedLevels = getTempleLevelsForZoom(zoom).join(",");

      const response = await fetch(
        `${API_BASE_URL}/api/temples_load.ts?north=${north}&south=${south}&east=${east}&west=${west}&levels=${allowedLevels}&limit=1000`
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

  const handleBoundsChange = (bounds, zoomLevel = null) => {
    // Use provided zoom level or current zoom state
    const zoom = zoomLevel !== null ? zoomLevel : currentZoom;
    // Only load additional temples if zoomed in enough
    if (zoom >= minZoomForBoundsLoading) {
      fetchTemplesByBounds(bounds, zoom);
    }
  };

  const handleZoomChange = (zoom) => {
    setCurrentZoom(zoom);
    setZoom(zoom); // Also update the zoom state used in fetchTemplesByBounds
  };

  const searchTemplesByName = async (name) => {
    if (!name.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/temples_search_by_name.ts?name=${encodeURIComponent(name)}`);
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
      const response = await fetch(`${API_BASE_URL}/api/temples_search_by_id.ts?id=${encodeURIComponent(templeId)}`);
      if (response.ok) {
        const results = await response.json();
        return results;
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



  const searchHotelsNearTemple = async (temple) => {
    setSearchingHotels(true);
    setHotelSearchError('');
    setHotelSearchResults([]);
    setShowHotelResults(false);

    try {
      // Create a location string from temple data
      const location = temple.location || `${temple.latitude}, ${temple.longitude}`;

      // Calculate dates (tomorrow and day after)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const checkin = tomorrow.toISOString().split('T')[0];

      const checkout = new Date(tomorrow);
      checkout.setDate(checkout.getDate() + 1);
      const checkoutDate = checkout.toISOString().split('T')[0];

      const response = await fetch(`${API_BASE_URL}/api/hotels/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location: location,
          checkin: checkin,
          checkout: checkoutDate,
          adults: 2,
          children: 0,
          rooms: 1,
          page: 1
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.hotels && data.hotels.length > 0) {
          setHotelSearchResults(data.hotels);
          setShowHotelResults(true);
        } else {
          setHotelSearchError('No hotels found in this area.');
        }
      } else {
        const errorData = await response.json();
        setHotelSearchError(errorData.error || 'Failed to search hotels. Please try again.');
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
      setHotelSearchError('Error searching hotels. Please check your connection and try again.');
    } finally {
      setSearchingHotels(false);
    }
  };

  const getHotelAffiliateLink = async (hotelId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hotels/${hotelId}/link`);
      if (response.ok) {
        const data = await response.json();
        if (data.ok && data.url) {
          // Open the affiliate link in a new tab
          window.open(data.url, '_blank');
        }
      }
    } catch (error) {
      console.error('Error getting affiliate link:', error);
    }
  };

  const cacheSriLankaTiles = async () => {
    // Cache function removed - using standard tiles only
  };

  const clearCache = async () => {
    // Cache function removed - using standard tiles only
  };

  // Add temple functionality
  const handleMapClickInAddMode = (event) => {
    if (addTempleMode) {
      const { lat, lng } = event.latlng;
      setSelectedLocation({ lat, lng });
      setShowAddTempleForm(true);
      setAddTempleMode(false); // Exit add mode after selecting location
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Retry function with exponential backoff
  const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };

  const submitNewTemple = async () => {
    if (!selectedLocation || !newTempleData.name.trim()) {
      setAddTempleMessage('Please select a location and enter a temple name.');
      setAddTempleMessageType('error');
      return;
    }

    setSubmittingTemple(true);
    setAddTempleMessage('');

    try {
      // Step 1: Create temple without photos first
      const templeData = {
        ...newTempleData,
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        submitted_by: 'mobile-user', // Could be made dynamic
        photos: [] // Don't include photos in initial submission
      };

      const response = await fetch(`${API_BASE_URL}/api/add_temple.ts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templeData),
      });

      if (!response.ok) {
        const error = await response.json();
        setAddTempleMessage(error.error || 'Failed to add temple. Please try again.');
        setAddTempleMessageType('error');
        return;
      }

      const result = await response.json();
      const templeId = result.temple.id;

      // Step 2: Upload photos if any were selected
      if (selectedPhotoFiles.length > 0) {
        setUploadingPhotos(true);
        setAddTempleMessage('Temple created! Uploading photos...');

        try {
          for (const file of selectedPhotoFiles) {
            await retryWithBackoff(async () => {
              // Get presigned URL for upload
              const presignedResponse = await fetch(`${API_BASE_URL}/api/presigned_upload_photo_to_suggested_temple.ts`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  templeId: templeId,
                  fileType: file.type,
                  filename: file.name,
                }),
              });

              if (!presignedResponse.ok) {
                throw new Error('Failed to get upload URL');
              }

              const { presignedUrl, fileName } = await presignedResponse.json();

              // Upload the file to Azure with retry
              await retryWithBackoff(async () => {
                const uploadResponse = await fetch(presignedUrl, {
                  method: 'PUT',
                  body: file,
                  headers: {
                    'Content-Type': file.type,
                    'x-ms-blob-type': 'BlockBlob',
                  },
                });

                if (!uploadResponse.ok) {
                  throw new Error('Failed to upload photo to Azure');
                }
              }, 3, 2000); // Longer delay for Azure uploads

              // Extract the complete Azure blob storage URL (without SAS token)
              const azureUrl = presignedUrl.split('?')[0];

              // Add complete photo URL to suggested temple with retry
              await retryWithBackoff(async () => {
                const addPhotoResponse = await fetch(`${API_BASE_URL}/api/add_unapproved_photo_to_suggested_temple.ts`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    templeId: templeId,
                    photoName: azureUrl, // Send complete Azure blob storage URL
                  }),
                });

                if (!addPhotoResponse.ok) {
                  throw new Error('Failed to associate photo with temple');
                }
              });
            });
          }
        } catch (photoError) {
          console.error('Error uploading photos:', photoError);
          setAddTempleMessage('Temple created but photo upload failed. You can try again later.');
          setAddTempleMessageType('error');
          setUploadingPhotos(false);
          return;
        } finally {
          setUploadingPhotos(false);
        }
      }

      // Success
      setAddTempleMessage('Temple added successfully! It will be reviewed by administrators.');
      setAddTempleMessageType('success');

      // Reset form
      setNewTempleData({
        name: '',
        location: '',
        description: '',
        deity: '',
        temple_type: '',
        district: '',
        photos: []
      });
      setSelectedPhotoFiles([]);
      setSelectedLocation(null);
      setShowAddTempleForm(false);

    } catch (error) {
      console.error('Error submitting temple:', error);
      setAddTempleMessage('Error submitting temple. Please check your connection and try again.');
      setAddTempleMessageType('error');
    } finally {
      setSubmittingTemple(false);
    }
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
    if (API_BASE_URL) {
      fetchInitialTemples();
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    if (API_BASE_URL) {
      searchTemplesByName(searchTerm);
    }
  }, [searchTerm, API_BASE_URL]);

  // Close popups when temple details are opened
  useEffect(() => {
    if (selectedTemple && mapRef.current) {
      mapRef.current.closePopup();
      setSelectedMarkerId(null);
    }
  }, [selectedTemple]);

  // Function to get the appropriate icon for a temple
  const getTempleIcon = (temple) => {
    const templeId = String(temple.id ?? '');

    // Selected temple gets gold icon
    if (templeId === selectedMarkerId) {
      return goldIcon;
    }

    // Check temple level
    const level = temple.level || temple.temple_level || 3; // Default to level 3 if not specified

    // Level 1 or 2 gets red icon
    if (level === 1 || level === 2) {
      return redIcon;
    }

    // Level 3+ gets green icon (default)
    return greenIcon;
  };

  // Update marker icons when selection changes
  useEffect(() => {
    Object.keys(markersRef.current).forEach(templeId => {
      const marker = markersRef.current[templeId];
      if (marker) {
        // Find the temple data to determine the correct icon
        const temple = temples.find(t => String(t.id ?? '') === templeId);
        if (temple) {
          const icon = getTempleIcon(temple);
          marker.setIcon(icon);
        }
      }
    });
  }, [selectedMarkerId, temples]);



  function getTempleLevelsForZoom(zoom) {
    if (zoom < 9) {
      return [1];                       // Show only Level 1
    } else if (zoom < 12) {
      return [1, 2];                    // Level 1 + 2
    } else if (zoom < 13) {
      return [1, 2, 3];              // Levels 1-4
    } else if (zoom < 14) {
      return [1, 2, 3, 4];              // Levels 1-4
    } else if (zoom < 15) {
      return [1, 2, 3, 4, 5];        // Levels 1-6
    } else if (zoom < 16) {
      return [1, 2, 3, 4, 5, 6, 7];        // Levels 1-6
    } else {
      return [1, 2, 3, 4, 5, 6, 7, 8]; // Levels 1-8 (all levels)
    }
  }


  const sriLankaCenter = [7.8731, 80.7718];

  console.log('🗺️ Rendering MapComponent, temples:', temples.length, 'loading:', loading);

  const idFor = (temple) => String(temple.id ?? '');

    return (
      <div className="map-component">
        {/* Debug Info */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 1000,
          fontFamily: 'monospace'
        }}>
          Zoom: {currentZoom} | Levels: {getTempleLevelsForZoom(currentZoom).join(',')} | Temples: {temples.length}
        </div>

        {/* Offline Status Bar */}
        {!isOnline && (
          <div className="offline-status-bar">
            📡 Offline - Limited functionality
          </div>
        )}

        {/* Show map immediately - don't wait for loading to complete */}
        <>
          {/* Always show map and search functionality */}
          <div className="search-and-controls">
            <input
              type="text"
              className="search-input"
              placeholder="Search temples by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button
              className={`add-temple-button ${addTempleMode ? 'active' : ''}`}
              onClick={() => setAddTempleMode(!addTempleMode)}
              title={addTempleMode ? 'Cancel adding temple' : 'Add a new temple'}
            >
              {addTempleMode ? '❌ Cancel' : '➕ Add Temple'}
            </button>
          </div>
          {addTempleMode && (
            <div className="add-temple-instructions">
              📍 Click on the map to select the temple location
            </div>
          )}
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
            whenCreated={(map) => {
              map.on("zoomend", () => {
                setZoom(map.getZoom());
              });
            }}
            zoomControl={false}
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
              onMapClickInAddMode={handleMapClickInAddMode}
              addTempleMode={addTempleMode}
              isFlyingRef={isFlyingRef}
            />
            {temples.map((temple) => {
              const templeLevel = temple.level || temple.temple_level || 3;
              const showPermanentLabel = currentZoom >= 12 && (templeLevel === 1 || templeLevel === 2);

              return (
                <Marker
                  key={`${temple.id}-${currentZoom}`}
                  position={[temple.latitude, temple.longitude]}
                  icon={getTempleIcon(temple)}
                  ref={(el) => { markersRef.current[temple.id] = el; }}
                  className={selectedMarkerId === (temple.id) ? 'selected-marker' : ''}
                  eventHandlers={{
                    click: () => setSelectedMarkerId(idFor(temple)),
                  }}
                >
                  <Tooltip key={`tooltip-${temple.id}-${currentZoom}`} permanent={showPermanentLabel}>{temple.name}</Tooltip>
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
                  </div>
                </div>
              </Popup>
                </Marker>
              );
            })}
        </MapContainer>

        {/* Add Temple Form */}
        {showAddTempleForm && (
          <div className="add-temple-overlay">
            <div className="add-temple-form">
              <h3>Add New Temple</h3>
              <div className="form-group">
                <label>Temple Name *</label>
                <input
                  type="text"
                  value={newTempleData.name}
                  onChange={(e) => setNewTempleData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter temple name"
                  required
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={newTempleData.location}
                  onChange={(e) => setNewTempleData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, District"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newTempleData.description}
                  onChange={(e) => setNewTempleData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the temple..."
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Deity</label>
                  <input
                    type="text"
                    value={newTempleData.deity}
                    onChange={(e) => setNewTempleData(prev => ({ ...prev, deity: e.target.value }))}
                    placeholder="e.g., Shiva, Vishnu"
                  />
                </div>

                <div className="form-group">
                  <label>Temple Type</label>
                  <select
                    value={newTempleData.temple_type}
                    onChange={(e) => setNewTempleData(prev => ({ ...prev, temple_type: e.target.value }))}
                  >
                    <option value="">Select type</option>
                    <option value="hindu_temple">Hindu Temple</option>
                    <option value="kovil">Kovil</option>
                    <option value="shrine">Shrine</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>District</label>
                <input
                  type="text"
                  value={newTempleData.district}
                  onChange={(e) => setNewTempleData(prev => ({ ...prev, district: e.target.value }))}
                  placeholder="e.g., Colombo, Kandy"
                />
              </div>

              <div className="form-group">
                <label>Photos</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setSelectedPhotoFiles(Array.from(e.target.files || []))}
                  disabled={uploadingPhotos}
                />
                {selectedPhotoFiles.length > 0 && (
                  <div className="photo-count">{selectedPhotoFiles.length} photo(s) selected</div>
                )}
              </div>

              {selectedLocation && (
                <div className="location-info">
                  📍 Location: {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </div>
              )}

              {addTempleMessage && (
                <div className={`message-box ${addTempleMessageType === 'success' ? 'message-success' : 'message-error'}`}>
                  {addTempleMessage}
                </div>
              )}

              <div className="form-actions">
                <button
                  className="submit-button"
                  onClick={submitNewTemple}
                  disabled={submittingTemple || !newTempleData.name.trim()}
                >
                  {submittingTemple ? 'Submitting...' : 'Submit Temple'}
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setShowAddTempleForm(false);
                    setSelectedLocation(null);
                    setNewTempleData({
                      name: '',
                      location: '',
                      description: '',
                      deity: '',
                      temple_type: '',
                      district: '',
                      photos: []
                    });
                    setSelectedPhotoFiles([]);
                    setAddTempleMessage('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {selectedTemple && (
          <TempleDetail
            temple={selectedTemple}
            onClose={() => setSelectedTemple(null)}
          />
        )}

        {/* Hotel Search Results */}
        {showHotelResults && (
          <div className="hotel-results-overlay">
            <div className="hotel-results-modal">
              <div className="hotel-results-header">
                <h3>🏨 Hotels near temple</h3>
                <button
                  className="close-button"
                  onClick={() => setShowHotelResults(false)}
                >
                  ✕
                </button>
              </div>
              <div className="hotel-results-content">
                {hotelSearchResults.map((hotel, index) => (
                  <div key={hotel.id || index} className="hotel-item">
                    <div className="hotel-info">
                      <h4>{hotel.name}</h4>
                      <p className="hotel-location">{hotel.locationSummary}</p>
                      <div className="hotel-details">
                        <span className="hotel-rating">⭐ {hotel.rating}</span>
                        {hotel.freeCancellation && (
                          <span className="hotel-free-cancellation">🆓 Free cancellation</span>
                        )}
                      </div>
                      <div className="hotel-price">
                        <strong>{hotel.priceDisplay}</strong>
                      </div>
                    </div>
                    <button
                      className="book-hotel-button"
                      onClick={() => getHotelAffiliateLink(hotel.id)}
                    >
                      Book Now
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Hotel Search Error */}
        {hotelSearchError && selectedMarkerId && (
          <div className="hotel-error-message">
            {hotelSearchError}
          </div>
        )}
        </>
  </div>
  );
};

export default MapComponent;
