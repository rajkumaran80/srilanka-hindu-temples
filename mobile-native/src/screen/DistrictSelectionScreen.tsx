// DistrictSelectionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

// Sri Lanka districts
const sriLankaDistricts = [
  "Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha",
  "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala",
  "Mannar", "Matale", "Matara", "Moneragala", "Mullaitivu", "Nuwara Eliya",
  "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"
] as const;

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
};

type DistrictSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'DistrictSelection'
>;

type DistrictSelectionScreenRouteProp = RouteProp<
  RootStackParamList,
  'DistrictSelection'
>;

type Props = {
  navigation: DistrictSelectionScreenNavigationProp;
  route: DistrictSelectionScreenRouteProp;
};

const DistrictSelectionScreen: React.FC<Props> = ({ navigation, route }) => {
  // Defensive: route.params may be undefined if navigation passed nothing
  const params = route?.params ?? { selectedTemples: [] as Temple[], startDistrict: '', endDistrict: '' };
  const { selectedTemples = [], startDistrict = '', endDistrict = '' } = params;

  const [selectedStartDistrict, setSelectedStartDistrict] = useState<string>(startDistrict);
  const [selectedEndDistrict, setSelectedEndDistrict] = useState<string>(endDistrict);
  const [showStartPicker, setShowStartPicker] = useState<boolean>(false);
  const [showEndPicker, setShowEndPicker] = useState<boolean>(false);

  const handleOptimizeRoute = () => {
    if (!selectedStartDistrict || !selectedEndDistrict) {
      return;
    }

    navigation.navigate('Plan', {
      selectedTemples,
      startDistrict: selectedStartDistrict,
      endDistrict: selectedEndDistrict,
      optimizeRoute: true,
    });
  };

  const handleKeepOrder = () => {
    if (!selectedStartDistrict || !selectedEndDistrict) {
      return;
    }

    navigation.navigate('Plan', {
      selectedTemples,
      startDistrict: selectedStartDistrict,
      endDistrict: selectedEndDistrict,
      optimizeRoute: false,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Choose Districts</Text>

        {/* spacer */}
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Start District</Text>

        <TouchableOpacity
          style={styles.pickerWrap}
          onPress={() => setShowStartPicker(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.pickerText, !selectedStartDistrict && styles.placeholderText]}>
              {selectedStartDistrict ? selectedStartDistrict : 'Select start district...'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>End District</Text>

        <TouchableOpacity
          style={styles.pickerWrap}
          onPress={() => setShowEndPicker(true)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.pickerText, !selectedEndDistrict && styles.placeholderText]}>
              {selectedEndDistrict ? selectedEndDistrict : 'Select end district...'}
            </Text>
            <Text style={styles.dropdownIcon}>▼</Text>
          </View>
        </TouchableOpacity>

        {/* District Info Cards */}
        <View style={styles.infoContainer}>
          {selectedStartDistrict ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🚀 Start: {selectedStartDistrict}</Text>
              <Text style={styles.infoText}>Your journey begins here</Text>
            </View>
          ) : null}

          {selectedEndDistrict ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🏁 End: {selectedEndDistrict}</Text>
              <Text style={styles.infoText}>Your destination point</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            (!selectedStartDistrict || !selectedEndDistrict) && styles.actionButtonDisabled
          ]}
          onPress={handleOptimizeRoute}
          disabled={!selectedStartDistrict || !selectedEndDistrict}
        >
          <View style={styles.buttonContent}>
            <Text style={[
              styles.buttonText,
              (!selectedStartDistrict || !selectedEndDistrict) && styles.buttonTextDisabled
            ]}>
              Optimize Route
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            (!selectedStartDistrict || !selectedEndDistrict) && styles.actionButtonDisabled
          ]}
          onPress={handleKeepOrder}
          disabled={!selectedStartDistrict || !selectedEndDistrict}
        >
          <View style={styles.buttonContent}>
            <Text style={[
              styles.buttonText,
              (!selectedStartDistrict || !selectedEndDistrict) && styles.buttonTextDisabled
            ]}>
              Keep Order
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Start District Picker Modal */}
      <Modal visible={showStartPicker} animationType="slide" onRequestClose={() => setShowStartPicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowStartPicker(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Start District</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {sriLankaDistricts.map(district => (
              <TouchableOpacity
                key={district}
                style={[
                  styles.districtOption,
                  selectedStartDistrict === district && styles.districtOptionSelected
                ]}
                onPress={() => {
                  setSelectedStartDistrict(district);
                  setShowStartPicker(false);
                }}
              >
                <Text style={[
                  styles.districtOptionText,
                  selectedStartDistrict === district && styles.districtOptionTextSelected
                ]}>
                  {district}
                </Text>
                {selectedStartDistrict === district && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* End District Picker Modal */}
      <Modal visible={showEndPicker} animationType="slide" onRequestClose={() => setShowEndPicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEndPicker(false)} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select End District</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {sriLankaDistricts.map(district => (
              <TouchableOpacity
                key={district}
                style={[
                  styles.districtOption,
                  selectedEndDistrict === district && styles.districtOptionSelected
                ]}
                onPress={() => {
                  setSelectedEndDistrict(district);
                  setShowEndPicker(false);
                }}
              >
                <Text style={[
                  styles.districtOptionText,
                  selectedEndDistrict === district && styles.districtOptionTextSelected
                ]}>
                  {district}
                </Text>
                {selectedEndDistrict === district && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
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
  infoContainer: {
    marginTop: 30,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  districtOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  districtOptionSelected: {
    backgroundColor: '#e7f3ff',
  },
  districtOptionText: {
    fontSize: 16,
    color: '#333',
  },
  districtOptionTextSelected: {
    color: '#007bff',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 18,
    color: '#007bff',
    fontWeight: 'bold',
  },
});

export default DistrictSelectionScreen;
