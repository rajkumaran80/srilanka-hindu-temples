import { StyleSheet, Platform } from 'react-native';
import { commonStyles } from './commonStyles';

export const planStyles = StyleSheet.create({
  ...commonStyles,
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
  marker: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, elevation: 2, backgroundColor: "#2c3e50"
  },
  markerText: { color: "#fff", fontSize: 11, fontWeight: "700" },

  districtMarker: { padding: 6, borderRadius: 6, borderColor: "#fff", borderWidth: 1, minWidth: 60, alignItems: "center" },
  districtText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  legInfoBox: { backgroundColor: "#fff", borderRadius: 6, borderWidth: 1, borderColor: "#ddd", alignItems: "center" },
  legDistance: { fontSize: 12, fontWeight: "700", color: "#c0392b" },
  legTime: { fontSize: 12, color: "#333" },

  controls: {
    position: "absolute", bottom: Platform.OS === 'android' ? 64 : 40, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", zIndex: 1000
  },
});
