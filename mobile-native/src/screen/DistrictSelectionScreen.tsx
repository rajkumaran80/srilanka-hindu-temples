import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
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
  const { selectedTemples, startDistrict, endDistrict } = route.params;
  const [selectedStartDistrict, setSelectedStartDistrict] = useState(startDistrict);
  const [selectedEndDistrict, setSelectedEndDistrict] = useState(endDistrict);

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
        <View style={{ width: 60 }} /> {/* Spacer for centering */}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Start District</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedStartDistrict}
            onValueChange={(value) => setSelectedStartDistrict(value)}
            style={styles.picker}
          >
            <Picker.Item label="Select start district..." value="" />
            {sriLankaDistricts.map(district => (
              <Picker.Item key={district} label={district} value={district} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>End District</Text>
        <View style={styles.pickerWrap}>
          <Picker
            selectedValue={selectedEndDistrict}
            onValueChange={(value) => setSelectedEndDistrict(value)}
            style={styles.picker}
          >
            <Picker.Item label="Select end district..." value="" />
            {sriLankaDistricts.map(district => (
              <Picker.Item key={district} label={district} value={district} />
            ))}
          </Picker>
        </View>

        {/* District Info Cards */}
        <View style={styles.infoContainer}>
          {selectedStartDistrict && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🚀 Start: {selectedStartDistrict}</Text>
              <Text style={styles.infoText}>Your journey begins here</Text>
            </View>
          )}

          {selectedEndDistrict && (
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>🏁 End: {selectedEndDistrict}</Text>
              <Text style={styles.infoText}>Your destination point</Text>
            </View>
          )}
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
          <Text style={[
            styles.actionButtonText,
            (!selectedStartDistrict || !selectedEndDistrict) && styles.actionButtonTextDisabled
          ]}>
            🗺️ Optimize Route
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            (!selectedStartDistrict || !selectedEndDistrict) && styles.actionButtonDisabled
          ]}
          onPress={handleKeepOrder}
          disabled={!selectedStartDistrict || !selectedEndDistrict}
        >
          <Text style={[
            styles.actionButtonText,
            (!selectedStartDistrict || !selectedEndDistrict) && styles.actionButtonTextDisabled
          ]}>
            📋 Keep Order
          </Text>
        </TouchableOpacity>
      </View>
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
  picker: {
    height: 50,
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
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
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
});

export default DistrictSelectionScreen;
