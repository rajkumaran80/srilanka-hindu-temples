import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  FlatList,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Always use fallbacks for simplicity
const FallbackMapView = ({ children, style, region, onRegionChangeComplete }: any) => (
  <View style={[style, { backgroundColor: '#e8e8e8', justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>
      Tour Route Map
    </Text>
    <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
      Route visualization will be shown here
    </Text>
    {children}
  </View>
);

const FallbackMarker = ({ coordinate, title, description, pinColor, onPress }: any) => (
  <View style={{
    position: 'absolute',
    width: 30,
    height: 40,
    backgroundColor: pinColor || '#FF6B6B',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>📍</Text>
  </View>
);

const FallbackPolyline = (props: any) => null;

const MapView = FallbackMapView;
const Marker = FallbackMarker;
const Polyline = FallbackPolyline;
const PROVIDER_GOOGLE = null;

import ModalSelector from 'react-native-modal-selector';

import { sriLankaDistricts, districtCenters, SRI_LANKA_CENTER } from '../constants';
import { fetchInitialTemples, callRoutingAPI } from '../services/api';
import { Temple, TourPlan, Region, RouteSegment } from '../types';

const { width, height } = Dimensions.get('window');

// Decode polyline utility (same as web version)
const decodePolyline = (encoded: string) => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates: [number, number][] = [];

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
  return coordinates;
};

const TourPlannerScreen = () => {
  const navigation = useNavigation();
  const [showDistrictModal, setShowDistrictModal] = useState(false);
  const [startDistrict, setStartDistrict] = useState('');
  const [endDistrict, setEndDistrict] = useState('');
  const [availableTemples, setAvailableTemples] = useState<Temple[]>([]);
  const [selectedTemples, setSelectedTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [tourPlan, setTourPlan] = useState<TourPlan | null>(null);
  const [optimizeRoute, setOptimizeRoute] = useState(true);
  const [planningRoute, setPlanningRoute] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: SRI_LANKA_CENTER[0],
    longitude: SRI_LANKA_CENTER[1],
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  // Load temples on component mount
  useEffect(() => {
    loadTemples();
  }, []);

  const loadTemples = async () => {
    try {
      const temples = await fetchInitialTemples();
      setAvailableTemples(temples);
    } catch (error) {
      Alert.alert('Error', 'Failed to load temples');
    } finally {
      setLoading(false);
    }
  };

  const calculateDistance = (temple1: Temple, temple2: Temple) => {
    if (!temple1 || !temple2) return 0;
    const lat1 = temple1.latitude;
    const lon1 = temple1.longitude;
    const lat2 = temple2.latitude;
    const lon2 = temple2.longitude;

    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const findTempleClosestToDistrict = (temples: Temple[], districtName: string) => {
    const districtCenter = districtCenters[districtName];
    if (!districtCenter) {
      return temples[0] || null;
    }
    let closestTemple = null;
    let minDistance = Infinity;
    temples.forEach(temple => {
      const distance = calculateDistance(
        { latitude: districtCenter[0], longitude: districtCenter[1], id: 0, name: '', location: '' },
        temple
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestTemple = temple;
      }
    });
    return closestTemple;
  };

  const optimizeRouteWithDestination = (temples: Temple[], startTemple: Temple) => {
    if (temples.length <= 1) return temples;

    let startIndex = 0;
    let minDist = calculateDistance(startTemple, temples[0]);
    for (let i = 1; i < temples.length; i++) {
      const dist = calculateDistance(startTemple, temples[i]);
      if (dist < minDist) {
        minDist = dist;
        startIndex = i;
      }
    }

    const route = [];
    const remaining = [...temples];
    let currentTemple = remaining.splice(startIndex, 1)[0];
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

  const createTempleSequence = (temples: Temple[], optimizeRoute: boolean) => {
    if (optimizeRoute) {
      const startTemple = findTempleClosestToDistrict(temples, startDistrict);
      const endTemple = findTempleClosestToDistrict(temples, endDistrict);

      let remainingTemples = temples.filter(t => t.id !== startTemple?.id && t.id !== endTemple?.id);

      let route = [];
      if (startTemple) {
        route.push(startTemple);
      }

      if (remainingTemples.length > 0) {
        const optimizedMiddle = optimizeRouteWithDestination(remainingTemples, startTemple || remainingTemples[0]);
        route = route.concat(optimizedMiddle);
      }

      if (endTemple && endTemple.id !== startTemple?.id) {
        route.push(endTemple);
      }

      return route.filter((temple, index, arr) =>
        arr.findIndex(t => t.id === temple.id) === index
      );
    } else {
      return [...temples];
    }
  };

  const proceedToPlanning = async (useOptimization: boolean) => {
    if (!startDistrict || !endDistrict || selectedTemples.length === 0) {
      Alert.alert('Error', 'Please select districts and temples');
      return;
    }

    setOptimizeRoute(useOptimization);
    setShowDistrictModal(false);
    setPlanningRoute(true);

    try {
      const planSequence = createTempleSequence(selectedTemples, useOptimization);

      const startCoords = districtCenters[startDistrict];
      const endCoords = districtCenters[endDistrict];

      const coordinates = [];
      if (startCoords) coordinates.push([startCoords[1], startCoords[0]]);
      planSequence.forEach(t => coordinates.push([t.longitude, t.latitude]));
      if (endCoords) coordinates.push([endCoords[1], endCoords[0]]);

      const plan = await callRoutingAPI(coordinates, startDistrict, endDistrict, planSequence);

      if (plan) {
        setTourPlan(plan);
        // Fit map to show the entire route
        const latitudes = plan.route.map(t => t.latitude);
        const longitudes = plan.route.map(t => t.longitude);
        const minLat = Math.min(...latitudes);
        const maxLat = Math.max(...latitudes);
        const minLng = Math.min(...longitudes);
        const maxLng = Math.max(...longitudes);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: (maxLat - minLat) * 1.5,
          longitudeDelta: (maxLng - minLng) * 1.5,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to plan route');
    } finally {
      setPlanningRoute(false);
    }
  };

  const handleTempleSelect = (temple: Temple) => {
    const isSelected = selectedTemples.find(t => t.id === temple.id);
    if (isSelected) {
      setSelectedTemples(selectedTemples.filter(t => t.id !== temple.id));
    } else {
      setSelectedTemples([...selectedTemples, temple]);
    }
  };

  const startNewTour = () => {
    setTourPlan(null);
    setSelectedTemples([]);
    setStartDistrict('');
    setEndDistrict('');
    loadTemples();
  };

  const renderTempleMarker = (temple: Temple) => {
    const isSelected = selectedTemples.find(t => t.id === temple.id);
    const level = temple.level || temple.temple_level || 3;

    let pinColor = '#90EE90';
    if (level === 1 || level === 2) {
      pinColor = '#FF6B6B';
    }
    if (isSelected) {
      pinColor = '#FFD700';
    }

    return (
      <Marker
        key={temple.id}
        coordinate={{
          latitude: temple.latitude,
          longitude: temple.longitude,
        }}
        pinColor={pinColor}
        onPress={() => !tourPlan && handleTempleSelect(temple)}
      />
    );
  };

  const renderRouteMarker = (temple: Temple, index: number) => {
    return (
      <Marker
        key={temple.id}
        coordinate={{
          latitude: temple.latitude,
          longitude: temple.longitude,
        }}
        pinColor="#FF4500"
        title={`${index + 1}. ${temple.name}`}
        description={temple.location}
      />
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading temples...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('Map' as never)}
        >
          <Text style={styles.navButtonText}>🗺️ Map</Text>
        </TouchableOpacity>
      </View>

      {planningRoute && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <Text style={styles.overlayText}>Planning your optimal route...</Text>
            <View style={styles.spinner} />
          </View>
        </View>
      )}

      {!tourPlan ? (
        <View style={styles.selectionContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
          >
            {availableTemples.map(renderTempleMarker)}
          </MapView>

          <View style={styles.controls}>
            <Text style={styles.selectedCount}>
              Selected: {selectedTemples.length} temples
            </Text>
            <TouchableOpacity
              style={[styles.button, selectedTemples.length === 0 && styles.buttonDisabled]}
              onPress={() => setShowDistrictModal(true)}
              disabled={selectedTemples.length === 0}
            >
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.routeContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            onRegionChangeComplete={setRegion}
          >
            {/* District markers */}
            {districtCenters[startDistrict] && (
              <Marker
                coordinate={{
                  latitude: districtCenters[startDistrict][0],
                  longitude: districtCenters[startDistrict][1],
                }}
                pinColor="#00FF00"
                title={`Start: ${startDistrict}`}
              />
            )}
            {districtCenters[endDistrict] && (
              <Marker
                coordinate={{
                  latitude: districtCenters[endDistrict][0],
                  longitude: districtCenters[endDistrict][1],
                }}
                pinColor="#FF0000"
                title={`End: ${endDistrict}`}
              />
            )}

            {/* Temple route markers */}
            {tourPlan.route.map(renderRouteMarker)}

            {/* Route polyline */}
            {tourPlan.polyline && (
              <Polyline
                coordinates={decodePolyline(tourPlan.polyline).map(coord => ({
                  latitude: coord[0],
                  longitude: coord[1],
                }))}
                strokeColor="#0000FF"
                strokeWidth={3}
              />
            )}
          </MapView>

          <View style={styles.routeControls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => setTourPlan(null)}>
              <Text style={styles.controlButtonText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={startNewTour}>
              <Text style={styles.controlButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.routeInfo}>
            <Text style={styles.routeTitle}>
              {startDistrict} → {endDistrict}
            </Text>
            <Text style={styles.routeStats}>
              📍 {tourPlan.totalDistance} km • ⏱️ {tourPlan.estimatedTime} hours
            </Text>

            <Text style={styles.segmentTitle}>Route Segments:</Text>
            {tourPlan.segments.map((segment, index) => (
              <View key={index} style={styles.segment}>
                <Text style={styles.segmentText}>
                  {segment.from} → {segment.to}
                </Text>
                <Text style={styles.segmentDetails}>
                  {Math.round(segment.distance * 10) / 10} km • {Math.round(segment.duration * 10) / 10} hours
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* District Selection Modal */}
      <Modal
        visible={showDistrictModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDistrictModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Plan Your Temple Tour</Text>
            <Text style={styles.modalSubtitle}>
              Select your starting and ending districts
            </Text>

            <View style={styles.districtSelectors}>
              <ModalSelector
                data={sriLankaDistricts.map(district => ({ key: district, label: district }))}
                initValue="Select starting district"
                onChange={(option) => setStartDistrict(option.key)}
                style={styles.selector}
                initValueTextStyle={styles.selectorText}
                selectTextStyle={styles.selectorText}
              />

              <ModalSelector
                data={sriLankaDistricts.map(district => ({ key: district, label: district }))}
                initValue="Select ending district"
                onChange={(option) => setEndDistrict(option.key)}
                style={styles.selector}
                initValueTextStyle={styles.selectorText}
                selectTextStyle={styles.selectorText}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.keepOrderButton]}
                onPress={() => proceedToPlanning(false)}
                disabled={!startDistrict || !endDistrict}
              >
                <Text style={styles.modalButtonText}>📋 Keep Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.optimizeButton]}
                onPress={() => proceedToPlanning(true)}
                disabled={!startDistrict || !endDistrict}
              >
                <Text style={styles.modalButtonText}>🚀 Optimize</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowDistrictModal(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: '#2c3e50',
  },
  navButton: {
    backgroundColor: '#34495e',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  spinner: {
    width: 40,
    height: 40,
    borderWidth: 4,
    borderColor: '#f3f3f3',
    borderTopColor: '#3498db',
    borderRadius: 20,
  },
  selectionContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  controls: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#3498db',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 5,
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  routeContainer: {
    flex: 1,
  },
  routeControls: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#2c3e50',
  },
  controlButton: {
    flex: 1,
    backgroundColor: '#34495e',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  routeInfo: {
    flex: 1,
    padding: 15,
  },
  routeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  routeStats: {
    fontSize: 16,
    color: '#666',
    marginBottom: 15,
  },
  segmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  segment: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginBottom: 8,
    borderRadius: 5,
  },
  segmentText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  segmentDetails: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  districtSelectors: {
    marginBottom: 20,
  },
  selector: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    marginBottom: 10,
  },
  selectorText: {
    fontSize: 16,
    padding: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  keepOrderButton: {
    backgroundColor: '#95a5a6',
  },
  optimizeButton: {
    backgroundColor: '#27ae60',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TourPlannerScreen;
