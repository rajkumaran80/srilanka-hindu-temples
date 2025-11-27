import { useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './TourPlanner.css';

// --- API and Routing Constants ---
// REPLACE 'YOUR_ORS_API_KEY' with your actual OpenRouteService API key
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjE2ZjdkYjkyZmRjNzRlMWRhOTNkNDg3ODJhZDE1NmFiIiwiaCI6Im11cm11cjY0In0='; 
const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';
// Ensure this path correctly points to your API Base URL constant
import { API_BASE_URL } from '../Constants'; 


// Sri Lanka districts for selection
const sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Moneragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

// --- Custom Icon Creation (Kept as is) ---
let createTempleIcon, createSelectedTempleIcon, createTourStopIcon, createStartDistrictIcon, createEndDistrictIcon, createLegInfoIcon;

try {
  const markerIconTemple = '/images/marker-icon-gold.png';
  const markerIconSelected = '/images/marker-icon-red.png';
  const markerIconTourStop = '/images/marker-icon-green.png';

  // Function to create icon with name below
  createTempleIcon = (templeName) => new L.DivIcon({
    html: `
      <div class="temple-marker">
        <img src="${markerIconTemple}" class="temple-marker-icon" />
        <div class="temple-marker-name">${templeName}</div>
      </div>
    `,
    className: 'custom-temple-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });

  createSelectedTempleIcon = (templeName) => new L.DivIcon({
    html: `
      <div class="temple-marker selected">
        <img src="${markerIconSelected}" class="temple-marker-icon" />
        <div class="temple-marker-name">${templeName}</div>
      </div>
    `,
    className: 'custom-temple-marker',
    iconSize: [30, 48],
    iconAnchor: [15, 48],
    popupAnchor: [0, -48],
  });

  createTourStopIcon = (stopNumber, templeName) => new L.DivIcon({
    html: `
      <div class="tour-stop-marker">
        <div class="tour-stop-number">${stopNumber}</div>
        <div class="tour-stop-name">${templeName}</div>
      </div>
    `,
    className: 'custom-tour-stop-marker',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });

  createStartDistrictIcon = (districtName) => new L.DivIcon({
    html: `
      <div class="district-marker start">
        <img src="/images/marker-icon-start.png" class="district-marker-icon" />
        <div class="district-marker-name">${districtName}</div>
      </div>
    `,
    className: 'custom-district-marker',
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    popupAnchor: [0, -30],
  });

  createEndDistrictIcon = (districtName) => new L.DivIcon({
    html: `
      <div class="district-marker end">
        <img src="/images/marker-icon-end.png" class="district-marker-icon" />
        <div class="district-marker-name">${districtName}</div>
      </div>
    `,
    className: 'custom-district-marker',
    iconSize: [18, 30],
    iconAnchor: [9, 30],
    popupAnchor: [0, -30],
  });

  createLegInfoIcon = (distance, time) => {
    const totalMinutes = Math.round(time * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    return new L.DivIcon({
      html: `
        <div class="leg-info-marker" style="color: red; background: white; border: 1px solid red; border-radius: 4px; padding: 2px;">
          <div class="leg-distance">${Math.round(distance * 10) / 10} km</div>
          <div class="leg-time">${timeStr}</div>
        </div>
      `,
      className: 'custom-leg-info-marker',
      iconSize: [60, 30],
      iconAnchor: [30, 15],
      popupAnchor: [0, -15],
    });
  };
} catch (error) {
  console.warn('Custom icons failed to load, using defaults:', error);
  createTempleIcon = (name) => new L.Icon.Default();
  createSelectedTempleIcon = (name) => new L.Icon.Default();
  createTourStopIcon = (num, name) => new L.Icon.Default();
  createStartDistrictIcon = (name) => new L.Icon.Default();
  createEndDistrictIcon = (name) => new L.Icon.Default();
  createLegInfoIcon = (dist, time) => new L.Icon.Default();
}


// --- District Center Coordinates (Used for optimization and initial markers) ---
const districtCenters = {
  'Colombo': [6.9271, 79.8612],
  'Gampaha': [7.0873, 80.0144],
  'Kalutara': [6.5854, 79.9607],
  'Kandy': [7.2906, 80.6337],
  'Matale': [7.4675, 80.6234],
  'Nuwara Eliya': [6.9497, 80.7891],
  'Galle': [6.0535, 80.2200],
  'Matara': [5.9485, 80.5353],
  'Hambantota': [6.1246, 81.1185],
  'Jaffna': [9.6615, 80.0255],
  'Kilinochchi': [9.3803, 80.3770],
  'Mannar': [8.9810, 79.9044],
  'Mullaitivu': [9.2671, 80.8142],
  'Vavuniya': [8.7514, 80.4971],
  'Trincomalee': [8.5874, 81.2152],
  'Batticaloa': [7.7300, 81.6780],
  'Ampara': [7.2975, 81.6780],
  'Badulla': [6.9894, 81.0550],
  'Moneragala': [6.8906, 81.3454],
  'Ratnapura': [6.7056, 80.3847],
  'Kegalle': [7.2513, 80.3464],
  'Kurunegala': [7.4863, 80.3647],
  'Puttalam': [8.0362, 79.8266],
  'Anuradhapura': [8.3114, 80.4037],
  'Polonnaruwa': [7.9403, 81.0188]
};

// --- Utility: Decode ORS Polyline (Google's format, used by ORS) ---
const decodePolyline = (encoded) => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [];

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte = null;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const dLng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dLng;

    coordinates.push([lat / 100000, lng / 100000]);
  }
  // ORS output format is [Lat, Lng] which is correct for Leaflet
  return coordinates; 
};

// --- Main Component ---
const TourPlanner = () => {
  const [showModal, setShowModal] = useState(true);
  const [startDistrict, setStartDistrict] = useState('');
  const [endDistrict, setEndDistrict] = useState('');
  // RESTORED: State to hold all temples fetched from the backend
  const [availableTemples, setAvailableTemples] = useState([]);
  const [selectedTemples, setSelectedTemples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tourPlan, setTourPlan] = useState(null);
  const [optimizeRoute, setOptimizeRoute] = useState(true);
  const [showRouteSummary, setShowRouteSummary] = useState(false);

  // --- Utility Functions (Haversine distance kept for nearest-neighbor optimization) ---
  const calculateDistance = (temple1, temple2) => {
    if (!temple1 || !temple2) return 0;
    const lat1 = temple1.latitude;
    const lon1 = temple1.longitude;
    const lat2 = temple2.latitude;
    const lon2 = temple2.longitude;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const findTempleClosestToDistrict = (temples, districtName) => {
    const districtCenter = districtCenters[districtName];
    if (!districtCenter) {
      return temples[0] || null;
    }
    let closestTemple = null;
    let minDistance = Infinity;
    temples.forEach(temple => {
      const distance = calculateDistance(
        { latitude: districtCenter[0], longitude: districtCenter[1] },
        temple
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestTemple = temple;
      }
    });
    return closestTemple;
  };

  const optimizeRouteWithDestination = (temples) => {
    if (temples.length <= 1) return temples;
    
    // Simple nearest neighbor algorithm (Haversine-based)
    const route = [];
    const remaining = [...temples];
    let currentTemple = remaining.shift();
    route.push(currentTemple);

    while (remaining.length > 0) {
      let nearestIndex = 0;
      let minDistance = calculateDistance(currentTemple, remaining[0]);

      for (let i = 1; i < remaining.length; i++) {
        const distance = calculateDistance(currentTemple, remaining[i]);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }
      currentTemple = remaining[nearestIndex];
      route.push(currentTemple);
      remaining.splice(nearestIndex, 1);
    }
    return route;
  };
  
  // --- Core Logic Functions ---

  // RESTORED: Function to fetch temples after district selection
  const proceedToSelection = async () => {
    if (!startDistrict || !endDistrict) return;

    setShowModal(false);
    setLoading(true);

    try {
      // Load all temples with level 1 or 2 from entire Sri Lanka
      const response = await fetch(
        `${API_BASE_URL}/api/temples_load.ts?north=10&south=5.9&east=82&west=79.5&levels=1,2&limit=2000`
      );

      if (response.ok) {
        const temples = await response.json();
        setAvailableTemples(temples);
      } else {
        console.error('Failed to fetch temples:', response.statusText);
      }
    } catch (error) {
      console.error('Error loading temples:', error);
      alert('Failed to load temples. Check API_BASE_URL and network.');
    } finally {
      setLoading(false);
    }
  };


  // Step 1: Determine the sequence of temples using local optimization
  const createTempleSequence = (temples, optimizeRoute) => {
    // Find temples closest to start and end districts
    const startTemple = findTempleClosestToDistrict(temples, startDistrict);
    const endTemple = findTempleClosestToDistrict(temples, endDistrict);

    // Get remaining temples (excluding start and end if they're the same)
    let remainingTemples = temples.filter(t => t.id !== startTemple?.id && t.id !== endTemple?.id);

    // Build the route: Start → Middle temples (optimized or as selected) → End
    let route = [];
    if (startTemple) {
      route.push(startTemple);
    }

    // Add remaining temples in optimized order (if selected) or as originally selected
    if (remainingTemples.length > 0) {
      if (optimizeRoute) {
        const optimizedMiddle = optimizeRouteWithDestination(remainingTemples);
        route = route.concat(optimizedMiddle);
      } else {
        route = route.concat(remainingTemples);
      }
    }

    // Add end temple if different from start
    if (endTemple && endTemple.id !== startTemple?.id) {
      route.push(endTemple);
    }

    // Remove duplicates
    return route.filter((temple, index, arr) =>
      arr.findIndex(t => t.id === temple.id) === index
    );
  };
  
  // Step 2: Call ORS API for detailed route, distance, and time
  const callRoutingAPI = async (routeSequence) => {
    if (routeSequence.length === 0) return { route: [], totalDistance: 0, estimatedTime: 0, segments: [], polyline: null };

    // 1. Build coordinates array (ORS expects [Lng, Lat])
    const startCoords = districtCenters[startDistrict];
    const endCoords = districtCenters[endDistrict];

    const coordinates = [];
    // Start District coordinates
    if (startCoords) coordinates.push([startCoords[1], startCoords[0]]); 
    
    // Temple coordinates
    routeSequence.forEach(t => coordinates.push([t.longitude, t.latitude])); 
    
    // End District coordinates (only if different from start district)
    if (endCoords && startDistrict !== endDistrict) coordinates.push([endCoords[1], endCoords[0]]); 

    if (coordinates.length < 2) {
      alert("Not enough points (start/end districts or temples) for routing.");
      return { route: routeSequence, totalDistance: 0, estimatedTime: 0, segments: [], polyline: null };
    }

    const orsBody = {
      coordinates: coordinates,
      geometry: true,
      units: 'km',
      language: 'en'
    };

    try {
      const response = await fetch(ORS_API_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': ORS_API_KEY 
        },
        body: JSON.stringify(orsBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("ORS API Error:", errorData);
        throw new Error(`ORS API failed: ${errorData.error ? errorData.error.message : response.statusText}`);
      }

      const data = await response.json();
      const routeData = data.routes[0];

      // Process segments for per-leg distance/time
      const segments = routeData.segments.map((segment, index) => {
        let fromName, toName;

        if (index === 0) {
          fromName = startDistrict;
          toName = routeSequence[0]?.name || 'Temple';
        } else if (index === routeData.segments.length - 1 && startDistrict !== endDistrict) {
          fromName = routeSequence[index - 1]?.name || 'Temple';
          toName = endDistrict;
        } else {
          fromName = routeSequence[index - 1]?.name || 'Temple';
          toName = routeSequence[index]?.name || 'Temple';
        }

        return {
          from: fromName,
          to: toName,
          distance: segment.distance, // in km
          duration: segment.duration / 3600 // in hours
        };
      });

      return {
        route: routeSequence,
        totalDistance: Math.round(routeData.summary.distance * 10) / 10,
        estimatedTime: Math.round(routeData.summary.duration / 3600 * 10) / 10,
        polyline: routeData.geometry,
        segments: segments.filter(s => s.distance > 0.01),
        coordinates: coordinates,
        startDistrict,
        endDistrict
      };

    } catch (error) {
      console.error("Routing API call failed:", error);
      alert(`Could not generate a detailed route plan: ${error.message}. Please check your ORS API key.`);
      setLoading(false);
      return null;
    }
  };

  // Handle temple selection (Existing logic)
  const handleTempleSelect = (temple) => {
    const isSelected = selectedTemples.find(t => t.id === temple.id);
    if (isSelected) {
      setSelectedTemples(selectedTemples.filter(t => t.id !== temple.id));
    } else {
      setSelectedTemples([...selectedTemples, temple]);
    }
  };

  // Create journey plan when user clicks finish (Updated to use ORS)
  const finishSelection = async () => {
    if (selectedTemples.length === 0) return;
    setLoading(true);

    // 1. Determine the optimal temple sequence (using local Haversine optimization if selected)
    const planSequence = createTempleSequence(selectedTemples, optimizeRoute);

    // 2. Call the ORS API for routing, distance, and time
    const fullTourPlan = await callRoutingAPI(planSequence);

    if (fullTourPlan) {
        setTourPlan(fullTourPlan);
    }
    setLoading(false);
  };
  
  // Reset and start new tour (Existing logic)
  const startNewTour = () => {
    setShowModal(true);
    setStartDistrict('');
    setEndDistrict('');
    setSelectedTemples([]);
    setTourPlan(null);
    setOptimizeRoute(true);
    // RESTORED: Reset available temples when starting a new tour
    setAvailableTemples([]);
  };

  return (
    <div className="tour-planner">
      {/* --- Stage 1: District Selection Modal (KEPT AS IS) --- */}
      {showModal ? (
        <div className="tour-modal-overlay">
          <div className="tour-modal">
            <div className="modal-header">
              <h2>🗺️ Plan Your Temple Tour</h2>
              <p>Select your starting and ending districts</p>
            </div>

            <div className="modal-content">
              <div className="district-selectors">
                <div className="selector-group">
                  <label htmlFor="start-district">Starting District:</label>
                  <select
                    id="start-district"
                    value={startDistrict}
                    onChange={(e) => setStartDistrict(e.target.value)}
                    className="district-select"
                  >
                    <option value="">Select starting district</option>
                    {sriLankaDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selector-group">
                  <label htmlFor="end-district">Ending District:</label>
                  <select
                    id="end-district"
                    value={endDistrict}
                    onChange={(e) => setEndDistrict(e.target.value)}
                    className="district-select"
                  >
                    <option value="">Select ending district</option>
                    {sriLankaDistricts.map((district) => (
                      <option key={district} value={district}>
                        {district}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="selector-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={optimizeRoute}
                      onChange={(e) => setOptimizeRoute(e.target.checked)}
                    />
                    Optimize Route (rearrange temples for efficiency)
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="primary-button"
                onClick={proceedToSelection}
                disabled={!startDistrict || !endDistrict}
              >
                Continue to Temple Selection
              </button>
            </div>
          </div>
        </div>
      ) : !tourPlan ? (
        // --- Stage 2: Temple Selection Map (RESTORED logic for availableTemples) ---
        <div>
          <div className="tour-header">
            <h1>Select Temples for Your Tour</h1>
            <p>From {startDistrict} to {endDistrict}</p>
            <p className="selection-count">Selected: {selectedTemples.length} temples</p>
          </div>

          {loading ? (
            // Loading state when fetching temples
            <div className="loading">Loading temples...</div>
          ) : (
            <div className="temple-selection-container">
              <MapContainer
                center={[7.8731, 80.7718]}
                zoom={8}
                className="temple-selection-map"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Iterate over availableTemples for markers */}
                {availableTemples.map((temple) => {
                  const isSelected = selectedTemples.find(t => t.id === temple.id);
                  return (
                    <Marker
                      key={temple.id}
                      position={[temple.latitude, temple.longitude]}
                      icon={isSelected ? createSelectedTempleIcon(temple.name) : createTempleIcon(temple.name)}
                      eventHandlers={{
                        // Handle selection/deselection on click
                        click: () => handleTempleSelect(temple), 
                      }}
                    >
                      <Popup>
                        <div className="temple-popup">
                          <h3>{temple.name}</h3>
                          <p>{temple.location}</p>
                          {temple.deity && <p><strong>Deity:</strong> {temple.deity}</p>}
                          <button
                            className={`select-button ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleTempleSelect(temple)}
                          >
                            {isSelected ? '✓ Selected' : 'Select for Tour'}
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>

              <div className="selected-temples-list">
                <h3>Selected Temples ({selectedTemples.length})</h3>
                <div className="temples-list">
                  {selectedTemples.map((temple, index) => (
                    <div key={temple.id} className="selected-temple-item">
                      <span className="temple-number">{index + 1}.</span>
                      <span className="temple-name">{temple.name}</span>
                      <button
                        className="remove-button"
                        onClick={() => handleTempleSelect(temple)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="tour-actions">
            <button className="secondary-button" onClick={() => setShowModal(true)}>
              ← Back to Districts
            </button>
            <button
              className="primary-button"
              onClick={finishSelection}
              disabled={selectedTemples.length === 0}
            >
              Finish & Create Journey Plan
            </button>
          </div>
        </div>
      ) : (
        // --- Stage 3: Tour Plan Visualization (KEPT AS IS) ---
        <div>
          <div className="tour-header">
            <h1>🏛️ Your Temple Tour Journey</h1>
            <p>From **{startDistrict}** to **{endDistrict}** • **{tourPlan.totalDistance} km** • **{tourPlan.estimatedTime} hours**</p>
          </div>

          <div className="journey-visualization">
            <MapContainer
              center={[7.8731, 80.7718]}
              zoom={8}
              className="journey-map-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {/* Start District Marker */}
              <StartDistrictMarker startDistrict={startDistrict} createStartDistrictIcon={createStartDistrictIcon} districtCenters={districtCenters}/>

              {/* End District Marker */}
              <EndDistrictMarker endDistrict={endDistrict} createEndDistrictIcon={createEndDistrictIcon} districtCenters={districtCenters} />

              {tourPlan.route.map((temple, index) => (
                <Marker
                  key={temple.id}
                  position={[temple.latitude, temple.longitude]}
                  icon={createTourStopIcon(index + 1, temple.name)}
                >
                  <Popup>
                    <div className="tour-stop-popup">
                      <h3>Stop **#{index + 1}**: {temple.name}</h3>
                      <p>{temple.location}</p>
                      {temple.deity && <p><strong>Deity:</strong> {temple.deity}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Draw complete route using ORS Polyline */}
              <RouteLine tourPlan={tourPlan} decodePolyline={decodePolyline} createLegInfoIcon={createLegInfoIcon} />
            </MapContainer>
          </div>

          <div className="tour-actions">
            <button className="primary-button" onClick={() => setTourPlan(null)}>
              ← Back to Temple Selection
            </button>
            <button className="primary-button" onClick={() => setShowRouteSummary(true)}>
              Route Summary
            </button>
            <button className="primary-button" onClick={startNewTour}>
              Plan Another Tour
            </button>
          </div>

          {/* Route Summary Popup */}
          {showRouteSummary && (
            <div
              className="route-summary-popup-overlay"
              onClick={() => setShowRouteSummary(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div
                className="route-summary-popup"
                onClick={(e) => e.stopPropagation()}
                style={{
                  backgroundColor: 'white',
                  padding: '20px',
                  borderRadius: '8px',
                  maxWidth: '500px',
                  maxHeight: '80vh',
                  overflow: 'auto',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Route Summary</h3>
                <div className="route-steps-popup" style={{ marginBottom: '15px' }}>
                  {tourPlan.segments.map((segment, index) => (
                    <div key={index} className="route-step-popup" style={{ marginBottom: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{segment.from} → {segment.to}</h4>
                      <p style={{ margin: '2px 0', fontSize: '14px' }}>Distance: {Math.round(segment.distance * 10) / 10} km</p>
                      <p style={{ margin: '2px 0', fontSize: '14px' }}>Time: {Math.round(segment.duration * 60)} minutes</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowRouteSummary(false)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Helper Components ---

const StartDistrictMarker = ({ startDistrict, createStartDistrictIcon, districtCenters }) => {
  const startCoords = districtCenters[startDistrict];
  if (!startCoords) return null;

  return (
    <Marker
      position={startCoords}
      icon={createStartDistrictIcon(startDistrict)}
    >
      <Popup>
        <div className="district-popup">
          <h3>🏁 **Start:** {startDistrict} District</h3>
          <p>Your journey begins here</p>
        </div>
      </Popup>
    </Marker>
  );
};

const EndDistrictMarker = ({ endDistrict, createEndDistrictIcon, districtCenters }) => {
  const endCoords = districtCenters[endDistrict];
  if (!endCoords) return null;

  return (
    <Marker
      position={endCoords}
      icon={createEndDistrictIcon(endDistrict)}
    >
      <Popup>
        <div className="district-popup">
          <h3>🎯 **End:** {endDistrict} District</h3>
          <p>Your journey ends here</p>
        </div>
      </Popup>
    </Marker>
  );
};

const RouteLine = ({ tourPlan, decodePolyline, createLegInfoIcon }) => {
  const { polyline, segments, coordinates } = tourPlan;

  if (!polyline) return null;

  const positions = decodePolyline(polyline);

  if (positions.length <= 1) return null;

  return (
    <>
      <Polyline
        positions={positions}
        color="#0000FF"
        weight={5}
        opacity={0.9}
      />
      {segments.map((segment, index) => {
        const coord1 = coordinates[index];
        const coord2 = coordinates[index + 1];
        if (!coord1 || !coord2) return null;
        const midLat = (coord1[1] + coord2[1]) / 2;
        const midLng = (coord1[0] + coord2[0]) / 2;
        return (
          <Marker
            key={`leg-${index}`}
            position={[midLat, midLng]}
            icon={createLegInfoIcon(segment.distance, segment.duration)}
          />
        );
      })}
    </>
  );
};

export default TourPlanner;
