import { useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, Polyline } from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import './TourPlanner.css';

// Sri Lanka districts for selection
const sriLankaDistricts = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha',
  'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala',
  'Mannar', 'Matale', 'Matara', 'Moneragala', 'Mullaitivu', 'Nuwara Eliya',
  'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'
];

// Create custom icons for tour planner with names below
let createTempleIcon, createSelectedTempleIcon, createTourStopIcon, createStartDistrictIcon, createEndDistrictIcon;

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
} catch (error) {
  console.warn('Custom icons failed to load, using defaults:', error);
  createTempleIcon = (name) => new L.Icon.Default();
  createSelectedTempleIcon = (name) => new L.Icon.Default();
  createTourStopIcon = (num, name) => new L.Icon.Default();
  createStartDistrictIcon = (name) => new L.Icon.Default();
  createEndDistrictIcon = (name) => new L.Icon.Default();
}

import { API_BASE_URL } from '../Constants';

const TourPlanner = () => {
  const [showModal, setShowModal] = useState(true);
  const [startDistrict, setStartDistrict] = useState('');
  const [endDistrict, setEndDistrict] = useState('');
  const [availableTemples, setAvailableTemples] = useState([]);
  const [selectedTemples, setSelectedTemples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tourPlan, setTourPlan] = useState(null);

  // Proceed to temple selection after district selection
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
      }
    } catch (error) {
      console.error('Error loading temples:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle temple selection
  const handleTempleSelect = (temple) => {
    const isSelected = selectedTemples.find(t => t.id === temple.id);
    if (isSelected) {
      setSelectedTemples(selectedTemples.filter(t => t.id !== temple.id));
    } else {
      setSelectedTemples([...selectedTemples, temple]);
    }
  };

  // Create journey plan when user clicks finish
  const finishSelection = () => {
    if (selectedTemples.length === 0) return;

    // Create optimized journey plan
    const plan = createJourneyPlan(selectedTemples);
    setTourPlan(plan);
  };

  const createJourneyPlan = (temples) => {
    if (temples.length === 0) return { route: [], totalDistance: 0, estimatedTime: 0 };

    // Find temples closest to start and end districts
    const startTemple = findTempleClosestToDistrict(temples, startDistrict);
    const endTemple = findTempleClosestToDistrict(temples, endDistrict);

    // Get remaining temples (excluding start and end if they're the same)
    let remainingTemples = temples.filter(t => t.id !== startTemple?.id && t.id !== endTemple?.id);

    // If start and end are the same temple, just add it once
    if (startTemple?.id === endTemple?.id) {
      remainingTemples = temples.filter(t => t.id !== startTemple?.id);
    }

    // Build the route: Start → Middle temples → End
    let route = [];

    if (startTemple) {
      route.push(startTemple);
    }

    // Add remaining temples in optimized order
    if (remainingTemples.length > 0) {
      const optimizedMiddle = optimizeRouteWithDestination(remainingTemples, startTemple, endTemple);
      route = route.concat(optimizedMiddle);
    }

    // Add end temple if different from start
    if (endTemple && endTemple.id !== startTemple?.id) {
      route.push(endTemple);
    }

    // Remove duplicates (in case start and end are the same)
    const uniqueRoute = route.filter((temple, index, arr) =>
      arr.findIndex(t => t.id === temple.id) === index
    );

    // Calculate total distance and time
    let totalDistance = 0;
    for (let i = 0; i < uniqueRoute.length - 1; i++) {
      totalDistance += calculateDistance(uniqueRoute[i], uniqueRoute[i + 1]);
    }

    const estimatedTime = Math.ceil(totalDistance / 40); // Assuming 40 km/h average speed

    return {
      route: uniqueRoute,
      totalDistance: Math.round(totalDistance * 10) / 10,
      estimatedTime,
      startDistrict,
      endDistrict
    };
  };

  const findTempleClosestToDistrict = (temples, districtName) => {
    // Simplified district center coordinates (approximate)
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

    const districtCenter = districtCenters[districtName];
    if (!districtCenter) {
      // If district not found, return first temple as fallback
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

  const optimizeRouteWithDestination = (temples, startTemple, endTemple) => {
    if (temples.length <= 1) return temples;

    // Simple nearest neighbor algorithm that considers both start and end
    const route = [];
    const remaining = [...temples];

    // Start from the first temple
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

  // Reset and start new tour
  const startNewTour = () => {
    setShowModal(true);
    setStartDistrict('');
    setEndDistrict('');
    setSelectedTemples([]);
    setTourPlan(null);
    setAvailableTemples([]);
  };

  return (
    <div className="tour-planner">
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
        <div>
          <div className="tour-header">
            <h1>Select Temples for Your Tour</h1>
            <p>From {startDistrict} to {endDistrict}</p>
            <p className="selection-count">Selected: {selectedTemples.length} temples</p>
          </div>

          {loading ? (
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

                {availableTemples.map((temple) => {
                  const isSelected = selectedTemples.find(t => t.id === temple.id);
                  return (
                    <Marker
                      key={temple.id}
                      position={[temple.latitude, temple.longitude]}
                      icon={isSelected ? createSelectedTempleIcon(temple.name) : createTempleIcon(temple.name)}
                      eventHandlers={{
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
        <div>
          <div className="tour-header">
            <h1>🏛️ Your Temple Tour Journey</h1>
            <p>From {startDistrict} to {endDistrict} • {tourPlan.totalDistance} km • {tourPlan.estimatedTime} hours</p>
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
              <StartDistrictMarker startDistrict={startDistrict} createStartDistrictIcon={createStartDistrictIcon} />

              {/* End District Marker */}
              <EndDistrictMarker endDistrict={endDistrict} createEndDistrictIcon={createEndDistrictIcon} />

              {tourPlan.route.map((temple, index) => (
                <Marker
                  key={temple.id}
                  position={[temple.latitude, temple.longitude]}
                  icon={createTourStopIcon(index + 1, temple.name)}
                >
                  <Popup>
                    <div className="tour-stop-popup">
                      <h3>Stop #{index + 1}: {temple.name}</h3>
                      <p>{temple.location}</p>
                      {temple.deity && <p><strong>Deity:</strong> {temple.deity}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Draw complete route from start district through temples to end district */}
              <RouteLine startDistrict={startDistrict} endDistrict={endDistrict} tourPlan={tourPlan} />
            </MapContainer>

            <div className="journey-details-below">
              <div className="journey-summary">
                <h3>Journey Summary</h3>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total Temples:</span>
                    <span className="stat-value">{tourPlan.route.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total Distance:</span>
                    <span className="stat-value">{tourPlan.totalDistance} km</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Estimated Time:</span>
                    <span className="stat-value">{tourPlan.estimatedTime} hours</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Route:</span>
                    <span className="stat-value">{startDistrict} → {endDistrict}</span>
                  </div>
                </div>
              </div>

              <div className="journey-route">
                <h3>Detailed Route</h3>
                <div className="route-steps">
                  {tourPlan.route.map((temple, index) => (
                    <div key={temple.id} className="route-step">
                      <div className="step-number">{index + 1}</div>
                      <div className="step-content">
                        <h4>{temple.name}</h4>
                        <p>{temple.location}</p>
                        {temple.deity && <p className="deity-info">Deity: {temple.deity}</p>}
                        {index < tourPlan.route.length - 1 && (
                          <p className="distance-info">
                            Distance to next: {Math.round(calculateDistance(temple, tourPlan.route[index + 1]) * 10) / 10} km
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="tour-actions">
            <button className="secondary-button" onClick={() => setTourPlan(null)}>
              ← Back to Temple Selection
            </button>
            <button className="primary-button" onClick={startNewTour}>
              Plan Another Tour
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for start district marker
const StartDistrictMarker = ({ startDistrict, createStartDistrictIcon }) => {
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

  const startCoords = districtCenters[startDistrict];
  if (!startCoords) return null;

  return (
    <Marker
      position={startCoords}
      icon={createStartDistrictIcon(startDistrict)}
    >
      <Popup>
        <div className="district-popup">
          <h3>🏁 Start: {startDistrict} District</h3>
          <p>Your journey begins here</p>
        </div>
      </Popup>
    </Marker>
  );
};

// Helper component for end district marker
const EndDistrictMarker = ({ endDistrict, createEndDistrictIcon }) => {
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

  const endCoords = districtCenters[endDistrict];
  if (!endCoords) return null;

  return (
    <Marker
      position={endCoords}
      icon={createEndDistrictIcon(endDistrict)}
    >
      <Popup>
        <div className="district-popup">
          <h3>🎯 End: {endDistrict} District</h3>
          <p>Your journey ends here</p>
        </div>
      </Popup>
    </Marker>
  );
};

// Helper component for route line
const RouteLine = ({ startDistrict, endDistrict, tourPlan }) => {
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

  const startCoords = districtCenters[startDistrict];
  const endCoords = districtCenters[endDistrict];

  // Build complete route: Start District → Temples → End District
  const fullRoute = [];
  if (startCoords) fullRoute.push(startCoords);
  tourPlan.route.forEach(temple => fullRoute.push([temple.latitude, temple.longitude]));
  if (endCoords) fullRoute.push(endCoords);

  if (fullRoute.length <= 1) return null;

  return (
    <Polyline
      positions={fullRoute}
      color="#3498db"
      weight={4}
      opacity={0.8}
      dashArray="5, 10"
    />
  );
};

export default TourPlanner;
