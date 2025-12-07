import { StyleSheet, Platform } from 'react-native';
import { commonStyles } from './commonStyles';

export const tourPlannerStyles = StyleSheet.create({
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
  controlDisabled: { backgroundColor: "#999" },

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
