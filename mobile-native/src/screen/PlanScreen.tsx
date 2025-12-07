// PlanScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import type { LatLng } from "react-native-maps";
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { API_BASE_URL } from "../constants/index";
import { planStyles as styles } from "../styles/PlanStyles";

// --- Replace with your ORS key ---
const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjE2ZjdkYjkyZmRjNzRlMWRhOTNkNDg3ODJhZDE1NmFiIiwiaCI6Im11cm11cjY0In0=';
const ORS_API_URL = 'https://api.openrouteservice.org/v2/directions/driving-car';

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
function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < len) {
    let b: number;
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

// --- Navigation types ---
type RootStackParamList = {
  Home: undefined;
  MapView: undefined;
  Planner: undefined;
  DistrictSelection: {
    selectedTemples: Temple[];
  };
  Plan: {
    selectedTemples: Temple[];
    startDistrict: string;
    endDistrict: string;
    optimizeRoute: boolean;
  };
};

type PlanScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Plan'
>;

type PlanScreenRouteProp = RouteProp<
  RootStackParamList,
  'Plan'
>;

type Props = {
  navigation: PlanScreenNavigationProp;
  route: PlanScreenRouteProp;
};

// --- Main component ---
const PlanScreen: React.FC<Props> = ({ navigation, route }) => {
  const mapRef = useRef<MapView | null>(null);

  // Defensive access to route.params
  const params = route?.params ?? { selectedTemples: [] as Temple[], startDistrict: '', endDistrict: '', optimizeRoute: true };
  const { selectedTemples = [], startDistrict = '', endDistrict = '', optimizeRoute = true } = params;

  const [planningRoute, setPlanningRoute] = useState(false);
  const [tourPlan, setTourPlan] = useState<TourPlan | null>(null);
  const [routeSummaryVisible, setRouteSummaryVisible] = useState(false);

  // load + plan on mount (only once)
  useEffect(() => {
    createAndCallRouting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create temple sequence (either optimized or keep selection order)
  const createTempleSequence = (temples: Temple[], optimize: boolean) => {
    if (!optimize) return [...temples];
    // find start and end temples (closest to district centers)
    const startTemple = findTempleClosestToDistrict(temples, startDistrict) as Temple | null;
    const endTemple = findTempleClosestToDistrict(temples, endDistrict) as Temple | null;
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
    if (!routeSequence || routeSequence.length === 0) {
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
      const segments = (routeData.segments || []).map((seg: any, idx: number) => {
        const fromName = idx === 0 ? (startDistrict || 'Start') : (routeSequence[idx - 1]?.name || "Temple");
        const toName = (routeSequence[idx]?.name) || (endDistrict || 'End');
        return {
          from: String(fromName),
          to: String(toName),
          distance: Number(seg.distance) || 0, // km
          duration: (Number(seg.duration) || 0) / 3600 // hours
        };
      });

      const plan: TourPlan = {
        route: routeSequence,
        totalDistance: Math.round((routeData.summary?.distance || 0) * 10) / 10,
        estimatedTime: Math.round(((routeData.summary?.duration || 0) / 3600) * 10) / 10,
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
      const seq = createTempleSequence(selectedTemples || [], optimizeRoute);
      const plan = await callRoutingAPI(seq);
      if (plan) {
        setTourPlan(plan);
        // Fit map to route if possible
        if (mapRef.current && plan.polyline) {
          const coords = decodePolyline(plan.polyline).map((c) => ({ latitude: c.latitude, longitude: c.longitude }));
          if (coords.length > 0 && mapRef.current.fitToCoordinates) {
            mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 40, bottom: 160, left: 40 }, animated: true });
          }
        }
      }
    } finally {
      setPlanningRoute(false);
    }
  };

  const resetPlanner = async () => {
    navigation.goBack();
  };

  // render helpers
  const renderTempleMarker = (temple: Temple, number: number) => {
    const name = temple?.name ? String(temple.name) : 'Temple';
    const location = temple?.location ? String(temple.location) : '';
    return (
      <Marker
        key={String(temple.id)}
        coordinate={{ latitude: temple.latitude, longitude: temple.longitude }}
        title={name}
        description={location}
      >
        <View style={styles.marker}>
          <Text style={styles.markerText}>{String(number)}</Text>
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tour Plan</Text>
        <View style={styles.spacer} />
      </View>

      {/* Map Container - takes available space */}
      <View style={styles.mapContainer}>
        {(planningRoute) && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007bff" />
              <Text style={{ marginTop: 12 }}>Planning route...</Text>
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
          {/* Render route markers only when tourPlan exists */}
          {Array.isArray(tourPlan?.route) && tourPlan?.route.map((t, idx) => renderTempleMarker(t, idx + 1))}

          {/* Start / End district markers (simple circle) */}
          {startDistrict && districtCenters[startDistrict] && (
            <Marker
              coordinate={{ latitude: districtCenters[startDistrict][0], longitude: districtCenters[startDistrict][1] }}
            >
              <View style={[styles.districtMarker, { backgroundColor: "#28a745" }]}>
                <Text style={styles.districtText}>{String(startDistrict)}</Text>
              </View>
            </Marker>
          )}
          {endDistrict && districtCenters[endDistrict] && (
            <Marker
              coordinate={{ latitude: districtCenters[endDistrict][0], longitude: districtCenters[endDistrict][1] }}
            >
              <View style={[styles.districtMarker, { backgroundColor: "#d9534f" }]}>
                <Text style={styles.districtText}>{String(endDistrict)}</Text>
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
          {Array.isArray(tourPlan?.segments) && Array.isArray(tourPlan?.coordinates) && tourPlan.segments.map((seg, idx) => {
            const a = tourPlan.coordinates![idx];
            const b = tourPlan.coordinates![idx + 1];
            if (!a || !b) return null;
            const midLat = (a[1] + b[1]) / 2;
            const midLng = (a[0] + b[0]) / 2;
            const totalMinutes = Math.round((seg.duration || 0) * 60);
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
            return (
              <Marker
                key={`leg-${idx}`}
                coordinate={{ latitude: midLat, longitude: midLng }}
              >
                <View style={styles.legInfoBox}>
                  <Text style={styles.legDistance}>{String(Math.round(seg.distance || 0))}km</Text>
                  <Text style={styles.legTime}>{String(timeStr)}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
      </View>

      {/* Bottom Control Panel */}
      <View style={styles.footer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setRouteSummaryVisible(true)}>
            <View style={styles.buttonContent}>
              <Text style={styles.buttonText}>
                Route Summary
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={resetPlanner}>
            <Text style={styles.controlText}>Back to Planner</Text>
          </TouchableOpacity>
      </View>

      {/* Route Summary modal with detailed segment information */}
      <Modal visible={routeSummaryVisible} animationType="slide" onRequestClose={() => setRouteSummaryVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🗺️ Route Summary</Text>
          </View>

          {planningRoute ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Planning your route...</Text>
              <Text style={styles.emptySubtext}>Please wait while we calculate the optimal path.</Text>
            </View>
          ) : tourPlan ? (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Overall Journey Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>
                  📍 {String(tourPlan.startDistrict ?? 'Start')} → {String(tourPlan.endDistrict ?? 'End')}
                </Text>
                <View style={styles.summaryStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{String(tourPlan.totalDistance)}</Text>
                    <Text style={styles.statLabel}>km total</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{String(Math.round(tourPlan.estimatedTime * 10) / 10)}</Text>
                    <Text style={styles.statLabel}>hours</Text>
                  </View>
                </View>
                <Text style={styles.templeCount}>
                  {Array.isArray(tourPlan.route) ? tourPlan.route.length : 0} temples to visit
                </Text>
              </View>

              {/* Detailed Route Segments */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📋 Route Details</Text>
              </View>

              {Array.isArray(tourPlan.segments) && tourPlan.segments.map((seg, i) => {
                const totalMinutes = Math.round((seg.duration || 0) * 60);
                const hours = Math.floor(totalMinutes / 60);
                const minutes = totalMinutes % 60;
                const timeStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
                const distance = Math.round((seg.distance || 0) * 10) / 10;

                // Calculate cumulative distance and time up to this segment
                const cumulativeDistance = tourPlan.segments.slice(0, i + 1).reduce((sum, s) => sum + (s.distance || 0), 0);
                const cumulativeTime = tourPlan.segments.slice(0, i + 1).reduce((sum, s) => sum + (s.duration || 0), 0);

                return (
                  <View key={i} style={styles.segmentCard}>
                    <View style={styles.segmentHeader}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <View style={styles.segmentRoute}>
                        <Text style={styles.segmentFrom}>{String(seg.from)}</Text>
                        <Text style={styles.segmentArrow}>→</Text>
                        <Text style={styles.segmentTo}>{String(seg.to)}</Text>
                      </View>
                    </View>

                    <View style={styles.segmentDetails}>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Distance:</Text>
                        <Text style={styles.detailValue}>{distance} km</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Time:</Text>
                        <Text style={styles.detailValue}>{timeStr}</Text>
                      </View>
                      <View style={[styles.detailRow, styles.detailRowLast]}>
                        <Text style={styles.detailLabel}>Cumulative:</Text>
                        <Text style={styles.detailValue}>
                          {Math.round(cumulativeDistance * 10) / 10} km • {Math.round(cumulativeTime * 60)} min
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Temple List */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🏛️ Temples to Visit</Text>
              </View>

              {Array.isArray(tourPlan.route) && tourPlan.route.map((temple, idx) => (
                <View key={temple.id} style={styles.templeItem}>
                  <View style={styles.templeNumber}>
                    <Text style={styles.templeNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.templeInfo}>
                    <Text style={styles.templeName}>{temple.name}</Text>
                    <Text style={styles.templeLocation}>{temple.location || 'Location not specified'}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No route planned yet.</Text>
              <Text style={styles.emptySubtext}>Please select temples and districts to plan your route.</Text>
            </View>
          )}

          {/* <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalBtn} onPress={() => setRouteSummaryVisible(false)}>
              <Text style={styles.modalBtnText}>Close</Text>
            </TouchableOpacity>
          </View> */}
        </View>
      </Modal>
    </View>
  );
};

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
  if (!Array.isArray(temples) || temples.length === 0) return null;
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
  if (!temples || temples.length <= 1) return temples || [];
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

export default PlanScreen;
