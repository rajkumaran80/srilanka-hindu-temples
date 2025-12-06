export interface Temple {
  id: number;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  level?: number;
  temple_level?: number;
  deity?: string;
  description?: string;
  temple_type?: string;
  district?: string;
  rating?: number;
  photos?: string[];
}

export interface TourPlan {
  route: Temple[];
  totalDistance: number;
  estimatedTime: number;
  polyline?: string;
  segments: RouteSegment[];
  coordinates: [number, number][];
  startDistrict: string;
  endDistrict: string;
}

export interface RouteSegment {
  from: string;
  to: string;
  distance: number;
  duration: number;
}

export interface HotelResult {
  id: string;
  name: string;
  locationSummary: string;
  rating: number;
  priceDisplay: string;
  freeCancellation: boolean;
}

export type AppView = 'map' | 'tour';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}
