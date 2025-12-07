// TourPlanner.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import type { LatLng } from "react-native-maps";
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { API_BASE_URL } from "../constants/index"; // adjust path to your constants

// --- Replace with your ORS key ---
const ORS_API_KEY = "YOUR_ORS_API_KEY";
const ORS_API_URL = "https://api.openrouteservice.org/v2/directions/driving-car";

// screen size
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Sri Lanka districts
const sriLankaDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
] as const;

// district centers (lat, lng)
const districtCenters: Record<string, [number, number]> = {
  Colombo: [6.9271, 79.8612],
  Gampaha: [7.0873, 80.0144],
  Kalutara: [6.5854, 79.9607],
  Kandy: [7.2906, 80.6337],
  Matale: [7.4675, 80.6234],
  "Nuwara Eliya": [6.9497, 80.7891],
  Galle: [6.0535, 80.22],
  Matara: [5.9485, 80.5353],
  Hambantota: [6.1246, 81.1185],
  Jaffna: [9.6615, 80.0255],
  Kilinochchi: [9.3803, 80.3770],
  Mannar: [8.9810, 79.9044],
  Mullaitivu: [9.2671, 80.8142],
  Vavuniya: [8.7514, 80.4971],
  Trincomalee: [8.5874, 81.2152],
  Batticaloa: [7.73, 81.6780],
  Ampara: [7.2975, 81.6780],
  Badulla: [6.9894, 81.0550],
  Moneragala: [6.8906, 81.3454],
  Ratnapura: [6.7056, 80.3847],
  Kegalle: [7.2513, 80.3464],
  Kurunegala: [7.4863, 80.3647],
  Puttalam: [8.0362, 79.8266],
  Anuradhapura: [8.3114, 80.4037],
  Polonnaruwa: [7.9403, 81.0188],
};

// ---- types ----
type Temple = {
  id: string | number;
  name: string;
  location?: string;
  latitude: number;
  longitude: number;
  deity?: string;
  level?: number;
  rating?: number;
};

type TourPlan = {
  route: Temple[];
  totalDistance: number; // km
  estimatedTime: number; // hours
  segments: { from: string; to: string; distance: number; duration: number }[];
  polyline?: string; // ORS geometry encoded
  coordinates?: number[][];
  startDistrict?: string;
  endDistrict?: string;
};

// decode ORS polyline (encoded as "encodedpolyline" in ORS v2 default) -> react-native-maps coords
// This is Google's polyline decoding adapted to ORS' precision (5) -> returns array of { latitude, longitude }
function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;

    // ORS uses 1e5 precision for encoded polyline
    coordinates.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return coordinates;
}

// --- helper distances (Haversine) ---
const haversineDistanceKm = (aLat: number, aLng: number, bLat: number, bLng: number) => {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLng - aLng) * Math.PI) / 180;
  const radA = (aLat * Math.PI) / 180;
  const radB = (bLat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const a =
    sinDLat * sinDLat +
    Math.cos(radA) * Math.cos(radB) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// find closest temple to district center
const findTempleClosestToDistrict = (temples: Temple[], districtName: string) => {
  const center = districtCenters[districtName];
  if (!center) return temples[0] || null;
  let closest: Temple | null = null;
  let minD = Infinity;
  temples.forEach((t) => {
    const d = haversineDistanceKm(center[0], center[1], t.latitude, t.longitude);
    if (d < minD) {
      minD = d;
      closest = t;
    }
  });
  return closest;
};

// nearest neighbour optimizer (keeps a start reference)
const optimizeRouteWithDestination = (temples: Temple[], startTemple?: Temple) => {
  if (!temples || temples.length <= 1) return temples;
  // start with temple closest to startTemple if provided
  let remaining = [...temples];
  let route: Temple[] = [];
  let current = startTemple ? (() => {
    // choose closest in list
    let idx = 0;
    let minD = haversineDistanceKm(startTemple.latitude, startTemple.longitude, remaining[0].latitude, remaining[0].longitude);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineDistanceKm(startTemple.latitude, startTemple.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < minD) {
        minD = d; idx = i;
      }
    }
    return remaining.splice(idx, 1)[0];
  })() : remaining.shift()!;
  route.push(current);
  while (remaining.length > 0) {
    let nearestIndex = 0;
    let minD = haversineDistanceKm(current.latitude, current.longitude, remaining[0].latitude, remaining[0].longitude);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversineDistanceKm(current.latitude, current.longitude, remaining[i].latitude, remaining[i].longitude);
      if (d < minD) { minD = d; nearestIndex = i; }
    }
    current = remaining.splice(nearestIndex, 1)[0];
    route.push(current);
  }
  return route;
};

// --- Navigation types ---
type RootStackParamList = {
  Home: undefined;
  MapView: undefined;
  Planner: undefined;
  DistrictSelection: {
    selectedTemples: Temple[];
    startDistrict: string;
    endDistrict: string;
  };
  Plan: {
    selectedTemples: Temple[];
    startDistrict: string;
    endDistrict: string;
    optimizeRoute: boolean;
  };
  TempleManagement: {
    selectedTemples: Temple[];
    onUpdateTemples: (temples: Temple[]) => void;
  };
};

type TourPlannerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Planner'
>;

type TourPlannerScreenRouteProp = RouteProp<
  RootStackParamList,
  'Planner'
>;

type Props = {
  navigation: TourPlannerScreenNavigationProp;
  route: TourPlannerScreenRouteProp;
};

// --- Main component ---
const TourPlanner: React.FC<Props> = ({ navigation }) => {
  const mapRef = useRef<MapView | null>(null);

  const [availableTemples, setAvailableTemples] = useState<Temple[]>([]);
  const [selectedTemples, setSelectedTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [startDistrict, setStartDistrict] = useState<string>("");
  const [endDistrict, setEndDistrict] = useState<string>("");

  const [optimizeRoute, setOptimizeRoute] = useState(true);
  const [planningRoute, setPlanningRoute] = useState(false);

  const [tourPlan, setTourPlan] = useState<TourPlan | null>(null);
  const [templeManagementVisible, setTempleManagementVisible] = useState(false);

  // load temples on mount
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await fetch(`${API_BASE_URL}/api/temples_load.ts?north=10&south=5.5&east=82.6&west=79&levels=1,2&limit=2000`);
        if (!resp.ok) {
          console.warn("Failed to fetch temples", resp.status);
          setAvailableTemples([]);
          return;
        }
        const data = await resp.json();
        if (!cancelled) setAvailableTemples(data);
      } catch (e) {
        console.error("Load temples failed", e);
        if (!cancelled) setAvailableTemples([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // select/deselect temple
  const handleTempleSelect = (temple: Temple) => {
    setSelectedTemples((prev) => {
      const exists = prev.find((t) => t.id === temple.id);
      if (exists) return prev.filter((t) => t.id !== temple.id);
      return [...prev, temple];
    });
  };

  // create temple sequence (either optimized or keep selection order)
  const createTempleSequence = (temples: Temple[], optimize: boolean) => {
    if (!optimize) return [...temples];
    // find start and end temples (closest to district centers)
    const startTemple = findTempleClosestToDistrict(temples, startDistrict);
    const endTemple = findTempleClosestToDistrict(temples, endDistrict);
    // exclude start/end from middle list
    const mid = temples.filter(t => t.id !== startTemple?.id && t.id !== endTemple?.id);
    const optimizedMiddle = optimizeRouteWithDestination(mid, startTemple || undefined);
    const route: Temple[] = [];
    if (startTemple) route.push(startTemple);
    route.push(...optimizedMiddle);
    if (endTemple && endTemple.id !== startTemple?.id) route.push(endTemple);
    // remove duplicates preserving order
    return route.filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx);
  };

  // call ORS API
  const callRoutingAPI = async (routeSequence: Temple[]): Promise<TourPlan | null> => {
    if (routeSequence.length === 0) {
      Alert.alert("No temples", "Please select at least one temple.");
      return null;
    }

    // build coordinates: startDistrict center -> temples -> endDistrict center (ORS expects [lng, lat])
    const coords: number[][] = [];
    const startCenter = districtCenters[startDistrict];
    const endCenter = districtCenters[endDistrict];
    if (startCenter) coords.push([startCenter[1], startCenter[0]]);
    routeSequence.forEach((t) => coords.push([t.longitude, t.latitude]));
    if (endCenter) coords.push([endCenter[1], endCenter[0]]);

    if (coords.length < 2) {
      Alert.alert("Not enough points", "Start / end or temples missing");
      return null;
    }

    const body = {
      coordinates: coords,
      geometry: true,
      units: "km",
      language: "en"
    };

    try {
      const resp = await fetch(ORS_API_URL, {
        method: "POST",
        headers: {
          "Accept": "application/json, application/geo+json, application/gpx+xml, img/png; charset=utf-8",
          "Content-Type": "application/json",
          Authorization: ORS_API_KEY
        },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        console.error("ORS error", err || resp.statusText);
        Alert.alert("Routing error", `ORS API failed: ${err?.error?.message || resp.statusText}`);
        return null;
      }

      const data = await resp.json();
      const routeData = data.routes && data.routes[0];
      if (!routeData) {
        Alert.alert("No route", "OpenRouteService returned no route.");
        return null;
      }

      // segments: ORS segments correspond to 'legs' on their routeData.segments
      const segments = routeData.segments.map((seg: any, idx: number) => {
        let fromName = idx === 0 ? startDistrict : (routeSequence[idx - 1]?.name || "Temple");
        let toName = (routeSequence[idx]?.name) || endDistrict;
        return {
          from: fromName,
          to: toName,
          distance: seg.distance, // km
          duration: seg.duration / 3600 // hours
        };
      });

      const plan: TourPlan = {
        route: routeSequence,
        totalDistance: Math.round(routeData.summary.distance * 10) / 10,
        estimatedTime: Math.round((routeData.summary.duration / 3600) * 10) / 10,
        segments,
        polyline: routeData.geometry, // encoded polyline
        coordinates: coords,
        startDistrict,
        endDistrict
      };

      return plan;
    } catch (error: any) {
      console.error("Routing call failed", error);
      Alert.alert("Routing failed", error?.message || "Check network / API key");
      return null;
    }
  };

  const createAndCallRouting = async () => {
    setPlanningRoute(true);
    try {
      const seq = createTempleSequence(selectedTemples, optimizeRoute);
      const plan = await callRoutingAPI(seq);
      if (plan) {
        setTourPlan(plan);
        // Fit map to route if possible
        if (mapRef.current && plan.polyline) {
          const coords = decodePolyline(plan.polyline).map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
          if (coords.length > 0) {
            mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 40, bottom: 160, left: 40 }, animated: true });
          }
        }
      }
    } finally {
      setPlanningRoute(false);
    }
  };

  const resetPlanner = async () => {
    setTourPlan(null);
    setSelectedTemples([]);
    setStartDistrict("");
    setEndDistrict("");
    // optionally reload temples
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/temples_load.ts?north=10&south=5.5&east=82.6&west=79&levels=1,2&limit=2000`);
      const data = resp.ok ? await resp.json() : [];
      setAvailableTemples(data);
    } catch (e) {
      console.warn("reload fail", e);
    } finally {
      setLoading(false);
    }
  };

  // render helpers
  const renderTempleMarker = (temple: Temple) => {
    const isSelected = !!selectedTemples.find((t) => t.id === temple.id);
    return (
      <Marker
        key={String(temple.id)}
        coordinate={{ latitude: temple.latitude, longitude: temple.longitude }}
        title={temple.name}
        description={temple.location}
        onPress={() => handleTempleSelect(temple)}
      >
        <View style={[styles.marker, isSelected ? styles.markerSelected : styles.markerNormal]}>
          <Text style={styles.markerText}>{temple.name}</Text>
        </View>
      </Marker>

    );
  };

  const routeCoordinates = useMemo(() => {
    if (!tourPlan?.polyline) return [];
    return decodePolyline(tourPlan.polyline);
  }, [tourPlan]);

  return (
    <View style={styles.container}>
      {/* Map Container - takes available space */}
      <View style={styles.mapContainer}>
        {(loading || planningRoute) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={{ marginTop: 12 }}>{planningRoute ? "Planning route..." : "Loading temples..."}</Text>
            </View>
          </View>
        )}

        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{
            latitude: 7.8731,
            longitude: 80.7718,
            latitudeDelta: 4.5,
            longitudeDelta: 4.5
          }}
          showsUserLocation={false}
        >
          {/* Available temples */}
          {availableTemples.map((t) => renderTempleMarker(t))}

          {/* Start / End district markers (simple circle) */}
          {startDistrict && districtCenters[startDistrict] && (
            <Marker
              coordinate={{ latitude: districtCenters[startDistrict][0], longitude: districtCenters[startDistrict][1] }}
            >
              <View style={[styles.districtMarker, { backgroundColor: "#28a745" }]}>
                <Text style={styles.districtText}>{startDistrict}</Text>
              </View>
            </Marker>
          )}
          {endDistrict && districtCenters[endDistrict] && (
            <Marker
              coordinate={{ latitude: districtCenters[endDistrict][0], longitude: districtCenters[endDistrict][1] }}
            >
              <View style={[styles.districtMarker, { backgroundColor: "#d9534f" }]}>
                <Text style={styles.districtText}>{endDistrict}</Text>
              </View>
            </Marker>
          )}

          {/* Polyline if available */}
          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeWidth={5}
              strokeColor="#1e90ff"
            />
          )}

          {/* Per-leg info markers */}
          {tourPlan?.segments && tourPlan.coordinates && tourPlan.segments.map((seg, idx) => {
            // compute midpoint between coordinates[idx] and coordinates[idx+1]
            const a = tourPlan.coordinates![idx];
            const b = tourPlan.coordinates![idx + 1];
            if (!a || !b) return null;
            const midLat = (a[1] + b[1]) / 2;
            const midLng = (a[0] + b[0]) / 2;
            const totalMinutes = Math.round(seg.duration * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            return (
              <Marker
                key={`leg-${idx}`}
                coordinate={{ latitude: midLat, longitude: midLng }}
            >
              <View style={styles.legInfoBox}>
                <Text style={styles.legDistance}>{Math.round(seg.distance * 10) / 10} km</Text>
                <Text style={styles.legTime}>{timeStr}</Text>
              </View>
            </Marker>
          );
        })}
        </MapView>
      </View>

      {/* Bottom Control Panel */}
      <View style={styles.footer}>
       
          <TouchableOpacity
            style={[styles.actionButton, selectedTemples.length === 0 && styles.actionButtonDisabled]}
            onPress={() => setTempleManagementVisible(true)}
            disabled={selectedTemples.length === 0}
          >
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText]}>
                Temples ({selectedTemples.length})
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, (selectedTemples.length === 0) && styles.actionButtonDisabled]}
            onPress={() => navigation.navigate('DistrictSelection', {
              selectedTemples,
              startDistrict,
              endDistrict
            })}
            disabled={selectedTemples.length === 0}
          >
            <View style={styles.buttonContent}>
              <Text style={[styles.buttonText]}>
                Continue
              </Text>
            </View>
          </TouchableOpacity>
          

          {tourPlan && (
            <>
              <TouchableOpacity style={styles.controlBtn} onPress={() => setRouteSummaryVisible(true)}>
                <Text style={styles.controlText}>Route Summary</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlBtn} onPress={resetPlanner}>
                <Text style={styles.controlText}>Reset</Text>
              </TouchableOpacity>
            </>
          )}
       
      </View>

      


      {/* Temple Management Modal */}
      <Modal visible={templeManagementVisible} animationType="slide" onRequestClose={() => setTempleManagementVisible(false)}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setTempleManagementVisible(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Selected Temples ({selectedTemples.length})</Text>
            <View style={{ width: 60 }} />
          </View>

          <FlatList
            data={selectedTemples}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <View style={styles.selectedItem}>
                <View style={styles.templeInfo}>
                  <Text style={styles.templeName}>{index + 1}. {item.name}</Text>
                  <Text style={styles.templeLocation}>{item.location}</Text>
                </View>
                <View style={styles.actionControls}>
                  <TouchableOpacity
                    style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                    onPress={() => {
                      if (index > 0) {
                        const newTemples = [...selectedTemples];
                        [newTemples[index], newTemples[index - 1]] = [newTemples[index - 1], newTemples[index]];
                        setSelectedTemples(newTemples);
                      }
                    }}
                    disabled={index === 0}
                  >
                    <Text style={[styles.reorderBtnText, index === 0 && styles.reorderBtnTextDisabled]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reorderBtn, index === selectedTemples.length - 1 && styles.reorderBtnDisabled]}
                    onPress={() => {
                      if (index < selectedTemples.length - 1) {
                        const newTemples = [...selectedTemples];
                        [newTemples[index], newTemples[index + 1]] = [newTemples[index + 1], newTemples[index]];
                        setSelectedTemples(newTemples);
                      }
                    }}
                    disabled={index === selectedTemples.length - 1}
                  >
                    <Text style={[styles.reorderBtnText, index === selectedTemples.length - 1 && styles.reorderBtnTextDisabled]}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => {
                      setSelectedTemples(prev => prev.filter(t => t.id !== item.id));
                    }}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No temples selected</Text>
                <Text style={styles.emptySubtext}>Go back and tap on temple markers to select them</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
};

export default TourPlanner;

// ---- styles ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  bottomPanel: {
    height: 120,
    backgroundColor: "#f8f9fa",
    borderTopWidth: 2,
    borderTopColor: "#007bff",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    justifyContent: "center",
  },

  loadingOverlay: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 2000, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)"
  },
  loadingBox: {
    padding: 20, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", elevation: 6
  },

  marker: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, elevation: 2
  },
  markerNormal: { backgroundColor: "#2c3e50" },
  markerSelected: { backgroundColor: "#e74c3c" },
  markerText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  districtMarker: { padding: 6, borderRadius: 6, borderColor: "#fff", borderWidth: 1, minWidth: 60, alignItems: "center" },
  districtText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  legInfoBox: { backgroundColor: "#fff", borderRadius: 6, padding: 6, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  legDistance: { fontWeight: "700", color: "#c0392b" },
  legTime: { fontSize: 11, color: "#333" },

  controls: {
    position: "absolute", bottom: Platform.OS === 'android' ? 54 : 30, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", zIndex: 1000
  },
  controlBtn: {
    backgroundColor: "#007bff", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginHorizontal: 6, minWidth: 100, alignItems: "center"
  },
  controlText: { color: "#fff", fontWeight: "700" },
  controlDisabled: { backgroundColor: "#999" },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'android' ? 54 : 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#007bff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionButtonDisabled: {
    backgroundColor: '#ccc',
    ...Platform.select({
      ios: {
        shadowColor: '#ccc',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonTextDisabled: {
    color: '#999',
  },
  buttonContent: {
    alignItems: 'center',
  },
  buttonEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  buttonEmojiDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    flex: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  backButton: {
    width: 60,
    alignItems: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '600',
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  pickerWrap: {
    borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 12, overflow: "hidden"
  },

  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  modalBtn: { flex: 1, backgroundColor: "#007bff", padding: 12, margin: 6, borderRadius: 8, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700" },

  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee"
  },
  actionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  label: { fontWeight: "700", marginBottom: 6 },

  summaryBox: { padding: 12, backgroundColor: "#f7f9fc", borderRadius: 8, marginBottom: 12 },
  summaryTitle: { fontWeight: "800", marginBottom: 6 },

  segmentRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },

  templeReorderItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  reorderControls: {
    width: 60,
    alignItems: "center",
  },
  reorderBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#007bff",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  reorderBtnDisabled: {
    backgroundColor: "#ccc",
  },
  reorderBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  reorderBtnTextDisabled: {
    color: "#999",
  },
  templeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  templeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  templeLocation: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#dc3545",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  removeBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  doneButtonContainer: {
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  doneButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: 280,
  },
});
