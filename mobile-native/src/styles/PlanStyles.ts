import { StyleSheet, Platform } from 'react-native';
import { commonStyles } from './commonStyles';

export const planStyles = StyleSheet.create({
  ...commonStyles,
  mapContainer: { flex: 1 },
  map: { flex: 1 },

  // Override modal container for larger route summary modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '90%',
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

  // Route Summary Modal Styles
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007bff',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 20,
  },
  templeCount: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
  },

  sectionHeader: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },

  segmentCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  segmentRoute: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  segmentFrom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  segmentArrow: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 8,
  },
  segmentTo: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },

  segmentDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailRowLast: {
    marginBottom: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  templeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templeNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  templeNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  templeInfo: {
    flex: 1,
  },
  templeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  templeLocation: {
    fontSize: 14,
    color: '#666',
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
  spacer: {
    width: 60,
  },
});
