// Type definitions for Temple data
export interface Temple {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  level?: number;
  temple_level?: number;
}

// Type definition for map region
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}
