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
import { districtSelectionStyles as styles } from "../styles/DistrictSelectionStyles";

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
        <View style={styles.spacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Start District</Text>

        <TouchableOpacity
          style={styles.pickerWrap}
          onPress={() => setShowStartPicker(true)}
        >
          <View style={styles.pickerRow}>
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
          <View style={styles.pickerRow}>
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
            <View style={styles.spacer} />
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
                  // Automatically set end district to same as start if not already set
                  if (!selectedEndDistrict) {
                    setSelectedEndDistrict(district);
                  }
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
            <View style={styles.spacer} />
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

export default DistrictSelectionScreen;
