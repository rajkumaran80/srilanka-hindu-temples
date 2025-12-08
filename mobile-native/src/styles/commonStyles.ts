import { StyleSheet, Platform } from 'react-native';

export const commonStyles = StyleSheet.create({
  // Modal styles
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
    maxHeight: '90%',
    width: '90%',
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
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  modalBtn: { flex: 1, backgroundColor: "#007bff", padding: 12, margin: 6, borderRadius: 8, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "700" },

  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },

  // Picker styles
  pickerWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
  },
  placeholderText: {
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 14,
    color: '#666',
    paddingRight: 16,
    paddingVertical: 14,
  },

  // Button styles
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

  // Control button (similar to action button but for bottom panels)
  controlBtn: {
    backgroundColor: "#007bff", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginHorizontal: 6, minWidth: 100, alignItems: "center"
  },
  controlText: { color: "#fff", fontWeight: "700" },

  // Summary styles
  summaryBox: { padding: 12, backgroundColor: "#f7f9fc", borderRadius: 8, marginBottom: 12 },
  summaryTitle: { fontWeight: "800", marginBottom: 6 },
  segmentRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },

  // Container styles
  container: { flex: 1, backgroundColor: "#fff" },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 20,
  },
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
  buttonContent: {
    alignItems: 'center',
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700" ,
    fontSize: 14,
    textAlign: 'center',
  },
  buttonTextDisabled: {
    opacity: 0.5,
  },

  // Modal header (different from header)
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 15,
  },
  modalContent: {
    flex: 1,
    padding: 10,
  },

  // Loading styles
  loadingOverlay: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 2000, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)"
  },
  loadingBox: {
    padding: 20, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", elevation: 6
  },
});
