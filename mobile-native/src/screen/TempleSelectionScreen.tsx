// TempleSelectionScreen.tsx
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

// screen size
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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

// --- Main component ---
const TempleSelectionScreen: React.FC<{
  availableTemples: Temple[];
  selectedTemples: Temple[];
  onTempleSelect: (temple: Temple) => void;
  onContinue: () => void;
  loading: boolean;
}> = ({ availableTemples, selectedTemples, onTempleSelect, onContinue, loading }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [localSelectedTemples, setLocalSelectedTemples] = useState<Temple[]>(selectedTemples);

  // Update local state when props change
  useEffect(() => {
    setLocalSelectedTemples(selectedTemples);
  }, [selectedTemples]);

  // Remove temple from selection
  const removeTemple = (templeId: string | number) => {
    const updatedTemples = localSelectedTemples.filter(t => t.id !== templeId);
    setLocalSelectedTemples(updatedTemples);
    // Also update parent state
    onTempleSelect(availableTemples.find(t => t.id === templeId)!);
  };

  // Move temple up in the list
  const moveTempleUp = (index: number) => {
    if (index > 0) {
      const newTemples = [...localSelectedTemples];
      [newTemples[index], newTemples[index - 1]] = [newTemples[index - 1], newTemples[index]];
      setLocalSelectedTemples(newTemples);
    }
  };

  // Move temple down in the list
  const moveTempleDown = (index: number) => {
    if (index < localSelectedTemples.length - 1) {
      const newTemples = [...localSelectedTemples];
      [newTemples[index], newTemples[index + 1]] = [newTemples[index + 1], newTemples[index]];
      setLocalSelectedTemples(newTemples);
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
        pinColor='green'
        onPress={() => onTempleSelect(temple)}
      >
        <View style={[styles.marker, isSelected ? styles.markerSelected : styles.markerNormal]}>
          <Text style={styles.markerText}>{temple.name}</Text>
        </View>
      </Marker>
    );
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#007bff" />
            <Text style={{ marginTop: 12 }}>Loading temples...</Text>
          </View>
        </View>
      )}

      <MapView
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
      </MapView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.controlText}>Selected Temples ({selectedTemples.length})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, selectedTemples.length === 0 && styles.controlDisabled]}
          onPress={onContinue}
          disabled={selectedTemples.length === 0}
        >
          <Text style={styles.controlText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Selected Temples Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Selected Temples ({localSelectedTemples.length})</Text>

          <FlatList
            data={localSelectedTemples}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item, index }) => (
              <View style={styles.templeItem}>
                <View style={styles.templeInfo}>
                  <Text style={styles.templeNumber}>{index + 1}.</Text>
                  <View style={styles.templeDetails}>
                    <Text style={styles.templeName}>{item.name}</Text>
                    <Text style={styles.templeLocation}>{item.location}</Text>
                  </View>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.arrowBtn, index === 0 && styles.arrowBtnDisabled]}
                    onPress={() => moveTempleUp(index)}
                    disabled={index === 0}
                  >
                    <Text style={[styles.arrowText, index === 0 && styles.arrowTextDisabled]}>↑</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.arrowBtn, index === localSelectedTemples.length - 1 && styles.arrowBtnDisabled]}
                    onPress={() => moveTempleDown(index)}
                    disabled={index === localSelectedTemples.length - 1}
                  >
                    <Text style={[styles.arrowText, index === localSelectedTemples.length - 1 && styles.arrowTextDisabled]}>↓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeTemple(item.id)}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No temples selected</Text>
            }
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default TempleSelectionScreen;

// ---- styles ----
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  map: { flex: 1 },

  loadingOverlay: {
    position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
    zIndex: 2000, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.6)"
  },
  loadingBox: {
    padding: 20, backgroundColor: "#fff", borderRadius: 10, alignItems: "center", justifyContent: "center", elevation: 6
  },

  marker: {
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: "#fff",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 2, elevation: 2, minWidth: 120
  },
  markerNormal: { backgroundColor: "#2c3e50" },
  markerSelected: { backgroundColor: "#e74c3c" },
  markerText: { color: "#fff", fontSize: 10, fontWeight: "700" },

  controls: {
    position: "absolute", bottom: 36, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", zIndex: 1000
  },
  controlBtn: {
    backgroundColor: "#007bff", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginHorizontal: 6, minWidth: 100, alignItems: "center"
  },
  controlText: { color: "#fff", fontWeight: "700" },
  controlDisabled: { backgroundColor: "#999" },

  modalContainer: { flex: 1, padding: 16, backgroundColor: "#fff" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16, textAlign: "center" },

  templeItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginVertical: 4,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  templeInfo: { flex: 1, flexDirection: "row", alignItems: "center" },
  templeNumber: { fontSize: 16, fontWeight: "bold", marginRight: 12, color: "#007bff" },
  templeDetails: { flex: 1 },
  templeName: { fontSize: 16, fontWeight: "600", color: "#333" },
  templeLocation: { fontSize: 14, color: "#666", marginTop: 2 },

  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#dc3545",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  removeBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  emptyText: { textAlign: "center", fontSize: 16, color: "#666", marginTop: 40 },
  modalActions: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  modalBtn: { backgroundColor: "#007bff", padding: 12, borderRadius: 8, minWidth: 100, alignItems: "center" },
  modalBtnText: { color: "#fff", fontWeight: "bold" },

  actionButtons: { flexDirection: "row", alignItems: "center" },
  arrowBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#007bff",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  arrowBtnDisabled: { backgroundColor: "#ccc" },
  arrowText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  arrowTextDisabled: { color: "#999" },
});
