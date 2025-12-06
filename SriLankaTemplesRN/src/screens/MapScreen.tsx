import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Always use fallback for simplicity
const FallbackMapView = ({ children, style, region, onRegionChangeComplete }: any) => (
  <View style={[style, { backgroundColor: '#e8e8e8', justifyContent: 'center', alignItems: 'center' }]}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 }}>
      Sri Lanka Map
    </Text>
    <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20 }}>
      Temple locations will be shown here
    </Text>
    {children}
  </View>
);

const FallbackMarker = ({ coordinate, title }: any) => (
  <View style={{
    position: 'absolute',
    width: 30,
    height: 40,
    backgroundColor: '#FF6B6B',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  }}>
    <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>📍</Text>
  </View>
);

// Use fallbacks
const MapViewComponent = FallbackMapView;
const MarkerComponent = FallbackMarker;

import { SRI_LANKA_CENTER, MIN_ZOOM_FOR_BOUNDS_LOADING } from '../constants';
import { fetchInitialTemples, searchTemplesByName, fetchTemplesByBounds } from '../services/api';
import { Temple, Region } from '../types';

const { width, height } = Dimensions.get('window');

const MapScreen = () => {
  const navigation = useNavigation();
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Temple[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTemple, setSelectedTemple] = useState<Temple | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: SRI_LANKA_CENTER[0],
    longitude: SRI_LANKA_CENTER[1],
    latitudeDelta: 5,
    longitudeDelta: 5,
  });

  // Load initial temples
  useEffect(() => {
    loadInitialTemples();
  }, []);

  // Search temples when search term changes
  useEffect(() => {
    if (searchTerm.length > 2) {
      searchTemples();
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchTerm]);

  const loadInitialTemples = async () => {
    try {
      const initialTemples = await fetchInitialTemples();
      setTemples(initialTemples);
    } catch (error) {
      Alert.alert('Error', 'Failed to load temples');
    } finally {
      setLoading(false);
    }
  };

  const searchTemples = async () => {
    try {
      const results = await searchTemplesByName(searchTerm);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const selectTemple = (temple: Temple) => {
    const newRegion: Region = {
      latitude: temple.latitude,
      longitude: temple.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
    setRegion(newRegion);
    setSelectedTemple(temple);
    setSearchTerm('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const renderTempleMarker = (temple: Temple) => {
    const isSelected = selectedTemple?.id === temple.id;
    const level = temple.level || temple.temple_level || 3;

    // Determine marker color based on temple level
    let pinColor = '#90EE90'; // Light green for level 3+
    if (level === 1 || level === 2) {
      pinColor = '#FF6B6B'; // Red for high importance temples
    }
    if (isSelected) {
      pinColor = '#FFD700'; // Gold for selected
    }

    if (Platform.OS === 'web') {
      return (
        <FallbackMarker
          key={temple.id}
          coordinate={{
            latitude: temple.latitude,
            longitude: temple.longitude,
          }}
          title={temple.name}
        />
      );
    }

    return (
      <MarkerComponent
        key={temple.id}
        coordinate={{
          latitude: temple.latitude,
          longitude: temple.longitude,
        }}
        pinColor={pinColor}
        onPress={() => selectTemple(temple)}
      />
    );
  };

  const renderSearchResult = ({ item }: { item: Temple }) => (
    <TouchableOpacity
      style={styles.searchResult}
      onPress={() => selectTemple(item)}
    >
      <Text style={styles.searchResultTitle}>{item.name}</Text>
      {item.location && (
        <Text style={styles.searchResultLocation}>{item.location}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading temples...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('TourPlanner' as never)}
        >
          <Text style={styles.navButtonText}>🏛️ Tour</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search temples by name..."
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholderTextColor="#666"
        />
      </View>

      {/* Search Results Dropdown */}
      {showDropdown && (
        <View style={styles.searchDropdown}>
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id.toString()}
            style={styles.searchResultsList}
          />
        </View>
      )}

      {/* Map */}
      <MapViewComponent
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {temples.map(renderTempleMarker)}
      </MapViewComponent>

      {/* Selected Temple Info */}
      {selectedTemple && (
        <View style={styles.templeInfo}>
          <Text style={styles.templeName}>{selectedTemple.name}</Text>
          <Text style={styles.templeLocation}>{selectedTemple.location}</Text>
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={() => {
              // Navigate to temple detail screen (to be implemented)
              Alert.alert('Temple Details', `${selectedTemple.name}\n${selectedTemple.location}`);
            }}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  navButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  navButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  searchContainer: {
    padding: 10,
    backgroundColor: '#f8f9fa',
  },
  searchInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchDropdown: {
    position: 'absolute',
    top: 70,
    left: 10,
    right: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResult: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  searchResultLocation: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  templeInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  templeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  templeLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  viewDetailsButton: {
    backgroundColor: '#3498db',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default MapScreen;
