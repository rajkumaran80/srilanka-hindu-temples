// MapViewScreen.js
import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Platform,
  TouchableOpacity,
  Linking,
  Dimensions,
} from 'react-native';
import MapView, { UrlTile, Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { fetchInitialTemples, fetchTemplesByBounds } from '../services/api';
import { Temple } from '../types/index';
import TempleDetail from '../components/TempleDetail';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function getTempleLevelsForZoom(zoom: number) {
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

// Get marker color based on temple level
function getMarkerColor(level: number | undefined): string {
  const templeLevel = level || 3;
  if (templeLevel === 1 || templeLevel === 2) {
    return 'red';
  }
  return 'green';
}

export default function MapViewScreen() {
  const mapRef = useRef(null);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [zoomLevel, setZoomLevel] = useState(10); // initial zoom
    // Keep refs to markers so we can show callouts programmatically
  const markerRefs = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    fetchInitialTemples()
      .then(setTemples)
      .catch((error) => console.error('Failed to fetch initial temples:', error));
  }, []);

  // Show callouts permanently for level 1 and 2 temples when zoom > 12
  useEffect(() => {
    temples.forEach(temple => {
      const ref = markerRefs.current.get(temple.id.toString());
      if (ref && (temple.level || 3) <= 2 && zoomLevel > 12) {
        ref.showCallout();
      } else if (ref) {
        ref.hideCallout();
      }
    });
  }, [zoomLevel, temples]);

  // Soft bounding box for Sri Lanka (approx)
  const bounds = {
    minLat: 5.5,
    maxLat: 10.8,
    minLng: 79.0,
    maxLng: 82.6,
  };

  // Compute a sensible initial region that shows Sri Lanka completely + padding.
  // We'll add some padding so borders aren't flush to the screen.
  const paddingDegreesLat = 1.0; // extra latitude padding
  const paddingDegreesLng = 1.0; // extra longitude padding

  const initialLatitudeDelta = (bounds.maxLat - bounds.minLat) + paddingDegreesLat; // height of viewport
  const initialLongitudeDelta = (bounds.maxLng - bounds.minLng) + paddingDegreesLng; // width of viewport

  const initialRegion = {
    latitude: (bounds.minLat + bounds.maxLat) / 2, // center lat
    longitude: (bounds.minLng + bounds.maxLng) / 2, // center lng
    latitudeDelta: initialLatitudeDelta,
    longitudeDelta: initialLongitudeDelta,
  };

  // Minimum deltas: prevent zooming out beyond the initial region
  const minLatitudeDelta = initialLatitudeDelta;
  const minLongitudeDelta = initialLongitudeDelta;

  // Optional platform helpers:
  // Android: integer-ish zoom level limits (helps user-facing zoom controls)
  const androidMinZoomLevel = 5; // optional, not strictly required
  const androidMaxZoomLevel = 20;

  // iOS MapKit: cameraZoomRange in meters (approx). This is a hint for native camera.
  // We choose values that roughly correspond to the initial region extents.
  const iosCameraZoomRange = {
    minCenterCoordinateDistance: 500, // don't allow extremely close
    maxCenterCoordinateDistance: 400000, // don't allow extremely far out
    animated: false,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  // Small epsilon for floating comparisons
  const EPS = 1e-6;

  const clampRegionToBounds = (region) => {
    // We clamp both the deltas (zoom) and the centre (pan).
    let {
      latitude,
      longitude,
      latitudeDelta,
      longitudeDelta,
    } = region;

    // 1) Prevent zooming out beyond initial region (i.e., deltas larger than min)
    const clampedLatDelta = Math.min(latitudeDelta, minLatitudeDelta);
    const clampedLngDelta = Math.min(longitudeDelta, minLongitudeDelta);

    // 2) Compute the allowable centre ranges given the (clamped) viewport size
    const latMinCenter = bounds.minLat + clampedLatDelta / 2;
    const latMaxCenter = bounds.maxLat - clampedLatDelta / 2;
    const lngMinCenter = bounds.minLng + clampedLngDelta / 2;
    const lngMaxCenter = bounds.maxLng - clampedLngDelta / 2;

    // If the viewport is larger than the bounds (rare if padding is set), allow centre to be the middle.
    const safeLatCenter = latMinCenter <= latMaxCenter
      ? clamp(latitude, latMinCenter, latMaxCenter)
      : (bounds.minLat + bounds.maxLat) / 2;

    const safeLngCenter = lngMinCenter <= lngMaxCenter
      ? clamp(longitude, lngMinCenter, lngMaxCenter)
      : (bounds.minLng + bounds.maxLng) / 2;

    return {
      latitude: safeLatCenter,
      longitude: safeLngCenter,
      latitudeDelta: clampedLatDelta,
      longitudeDelta: clampedLngDelta,
    };
  };

  const onRegionChangeComplete = async (region) => {
    // region has {latitude, longitude, latitudeDelta, longitudeDelta}
    // If the user zoomed out or panned outside allowed area, animate back.
    const safeRegion = clampRegionToBounds(region);

    const changed =
      Math.abs(safeRegion.latitude - region.latitude) > EPS ||
      Math.abs(safeRegion.longitude - region.longitude) > EPS ||
      Math.abs(safeRegion.latitudeDelta - region.latitudeDelta) > EPS ||
      Math.abs(safeRegion.longitudeDelta - region.longitudeDelta) > EPS;

    if (changed && mapRef.current?.animateToRegion) {
      // animate back to safe region
      mapRef.current.animateToRegion(safeRegion, 300);
    }

    // Load temples based on zoom level
    const zoom = Math.round(Math.log2(360 / safeRegion.latitudeDelta));
    setZoomLevel(zoom);
    const allowedLevels = getTempleLevelsForZoom(zoom).join(",");
    const north = safeRegion.latitude + safeRegion.latitudeDelta / 2;
    const south = safeRegion.latitude - safeRegion.latitudeDelta / 2;
    const east = safeRegion.longitude + safeRegion.longitudeDelta / 2;
    const west = safeRegion.longitude - safeRegion.longitudeDelta / 2;

    try {
      const loadedTemples = await fetchTemplesByBounds(north, south, east, west, allowedLevels, 1000);
      setTemples(prev => {
        const newTemples = loadedTemples.filter(t => !prev.some(p => p.id === t.id));
        return [...prev, ...newTemples];
      });
    } catch (error) {
      console.error('Failed to fetch temples by bounds:', error);
    }
  };

  const openAttribution = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        console.warn('Cannot open URL:', url);
      }
    } catch (err) {
      console.warn('Failed to open URL', err);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={false}
        showsMyLocationButton={false}
        zoomControlEnabled={false}
        // Platform-specific props that help but don't replace the clamp logic:
        {...(Platform.OS === 'android'
          ? { minZoomLevel: androidMinZoomLevel, maxZoomLevel: androidMaxZoomLevel }
          : {})}
        {...(Platform.OS === 'ios' ? { cameraZoomRange: iosCameraZoomRange } : {})}
      >
        {/* Stamen Toner tiles (your chosen provider) */}
        <UrlTile
          zIndex={0}
          urlTemplate="https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png"
          maximumZ={20}
          flipY={false}
          tileSize={256}
        />

        {/* Temple markers */}
        {temples.map((temple) => (
          <Marker
            key={temple.id}
            coordinate={{ latitude: temple.latitude, longitude: temple.longitude }}
            title={temple.name}
            description={temple.location}
            pinColor={getMarkerColor(temple.level)}
            ref={(ref) => { if (ref) markerRefs.current.set(temple.id.toString(), ref); }}
            onPress={() => setSelectedTemple(temple)}
          />
        ))}
      </MapView>

      {/* Attribution Bubble (tappable) */}
      {/* <View style={styles.creditContainer} pointerEvents="box-none">
        <View style={styles.creditBubble}>
          <Text style={styles.creditText}>Tiles: Stamen Design</Text>
          <Text style={styles.creditSmall}>Data: © OpenStreetMap contributors</Text>

          <View style={styles.linkRow}>
            <TouchableOpacity
              onPress={() => openAttribution('https://stamen.com')}
              accessibilityLabel="Open Stamen website"
            >
              <Text style={styles.linkText}>Stamen</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openAttribution('https://www.openstreetmap.org')}
              accessibilityLabel="Open OpenStreetMap website"
              style={styles.linkSpacer}
            >
              <Text style={styles.linkText}>OpenStreetMap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View> */}

      {/* Optional Footer (empty text kept for layout) */}
      <View style={styles.footer} pointerEvents="none">
        <Text style={styles.footerText}></Text>
      </View>

      {/* Temple detail modal / component: opens when marker pressed */}
      {selectedTemple && (
        <TempleDetail
          temple={selectedTemple}
          visible={true}
          onClose={() => setSelectedTemple(null)}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  creditContainer: {
    position: 'absolute',
    left: 8,
    top: 8,
    right: 8,
    alignItems: 'flex-start',
  },
  creditBubble: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 6,
    maxWidth: Math.min(340, SCREEN_WIDTH - 16),
  },
  creditText: { fontSize: 14, color: '#222', fontWeight: '600' },
  creditSmall: { fontSize: 12, color: '#444', marginTop: 2 },
  linkRow: { flexDirection: 'row', marginTop: 6, alignItems: 'center' },
  linkText: { fontSize: 13, color: '#0066cc', textDecorationLine: 'underline' },
  linkSpacer: { marginLeft: 10 },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 8,
    alignItems: 'center',
    elevation: 4,
  },
  footerText: { fontSize: 13, color: '#222' },

  markerContainer: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  buttonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  calloutContainer: {
    width: 140,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  calloutTitle: { fontWeight: 'bold', marginBottom: 4 },
  calloutLocation: { fontSize: 12, marginBottom: 6 },
  calloutButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  calloutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },

});
