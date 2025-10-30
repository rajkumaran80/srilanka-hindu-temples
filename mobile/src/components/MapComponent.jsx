import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import 'leaflet/dist/leaflet.css';

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
});

import TempleDetail from './TempleDetail';

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
  return 'https://srilanka-hindu-temples-api-4wzm.vercel.app';
};

// Component to handle map events
const MapEventHandler = ({ onBoundsChange, onZoomChange }) => {
  const map = useMapEvents({
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
      // Also trigger bounds change when zoom ends
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    },
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange(bounds);
    }
  });
  return null;
};

const MapComponent = () => {
  const [selectedTemple, setSelectedTemple] = useState(null);
  const [temples, setTemples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedBounds, setLoadedBounds] = useState(new Set()); // Track loaded geographic areas
  const [currentZoom, setCurrentZoom] = useState(8);
  const [apiBaseUrl, setApiBaseUrl] = useState('');
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

  useEffect(() => {
    const initializeApi = async () => {
      const baseUrl = await getApiBaseUrl();
      setApiBaseUrl(baseUrl);
    };
    initializeApi();
  }, []);

  useEffect(() => {
    if (apiBaseUrl) {
      fetchInitialTemples();
    }
  }, [apiBaseUrl]);



  const sriLankaCenter = [7.8731, 80.7718];

  try {
    console.log('Rendering MapComponent, temples:', temples, 'loading:', loading);
    return (
      <div>
        <p>Loading temples... {loading ? 'Loading' : 'Finished'} - {temples.length} temples</p>
        {!loading && temples.length > 0 && (
          <MapContainer center={sriLankaCenter} zoom={7} style={{ height: '500px', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEventHandler
              onBoundsChange={handleBoundsChange}
              onZoomChange={handleZoomChange}
            />
            {temples.map((temple) => (
              <Marker
                key={temple._id || temple.id}
                position={[temple.latitude, temple.longitude]}
              >
                <Popup>
                  <div>
                    <h3>{temple.name}</h3>
                    <p>{temple.location}</p>
                    <button onClick={() => {
                      setSelectedTemple(temple);
                    }}>View Details</button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
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
