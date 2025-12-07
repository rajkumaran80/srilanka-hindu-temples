import { API_BASE_URL, ORS_API_KEY, ORS_API_URL } from '../constants/index';
import { Temple, TourPlan, HotelResult } from '../types/index';

// Fetch initial temples
export const fetchInitialTemples = async (): Promise<Temple[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/temples_initial.ts`);
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {}
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching initial temples:', error);
    throw error;
  }
};

// Fetch temples by bounds
export const fetchTemplesByBounds = async (
  north: number,
  south: number,
  east: number,
  west: number,
  levels: string,
  limit = 1000
): Promise<Temple[]> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/temples_load.ts?north=${north}&south=${south}&east=${east}&west=${west}&levels=${levels}&limit=${limit}`
    );
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {}
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching temples by bounds:', error);
    throw error;
  }
};

// Search temples by name
export const searchTemplesByName = async (name: string): Promise<Temple[]> => {
  if (!name.trim()) return [];
  try {
    const response = await fetch(`${API_BASE_URL}/api/temples_search_by_name.ts?name=${encodeURIComponent(name)}`);
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {}
      throw new Error(errorMessage);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching temples:', error);
    throw error;
  }
};

// Fetch temple by ID
export const fetchTempleById = async (id: number): Promise<Temple | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/temples_search_by_id.ts?id=${id}`);
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {}
      throw new Error(errorMessage);
    }
    const results = await response.json();
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error fetching temple by ID:', error);
    throw error;
  }
};

// Call ORS API for routing
export const callRoutingAPI = async (
  coordinates: [number, number][],
  startDistrict: string,
  endDistrict: string,
  temples: Temple[]
): Promise<TourPlan | null> => {
  if (coordinates.length < 2) {
    alert("Not enough points for routing.");
    return null;
  }

  const orsBody = {
    coordinates: coordinates,
    geometry: true,
    units: 'km',
    language: 'en'
  };

  try {
    const response = await fetch(ORS_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': ORS_API_KEY
      },
      body: JSON.stringify(orsBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("ORS API Error:", errorData);
      throw new Error(`ORS API failed: ${errorData.error ? errorData.error.message : response.statusText}`);
    }

    const data = await response.json();
    const routeData = data.routes[0];

    // Process segments for per-leg distance/time
    const segments = routeData.segments.map((segment: any, index: number) => {
      let fromName = '', toName = '';

      if (index === 0) {
        fromName = startDistrict;
        toName = temples[0]?.name || 'Temple';
      } else if (index === routeData.segments.length - 1) {
        fromName = temples[index - 1]?.name || 'Temple';
        toName = endDistrict;
      } else {
        fromName = temples[index - 1]?.name || 'Temple';
        toName = temples[index]?.name || 'Temple';
      }

      return {
        from: fromName,
        to: toName,
        distance: segment.distance,
        duration: segment.duration / 3600 // in hours
      };
    });

    return {
      route: temples,
      totalDistance: Math.round(routeData.summary.distance * 10) / 10,
      estimatedTime: Math.round(routeData.summary.duration / 3600 * 10) / 10,
      polyline: routeData.geometry,
      segments: segments.filter((s: any) => s.distance > 0.01),
      coordinates: coordinates,
      startDistrict,
      endDistrict
    };

  } catch (error) {
    console.error("Routing API call failed:", error);
    throw error;
  }
};

// Search hotels near temple
export const searchHotelsNearTemple = async (temple: Temple): Promise<HotelResult[]> => {
  const location = temple.location || `${temple.latitude}, ${temple.longitude}`;

  // Calculate dates (tomorrow and day after)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkin = tomorrow.toISOString().split('T')[0];

  const checkout = new Date(tomorrow);
  checkout.setDate(checkout.getDate() + 1);
  const checkoutDate = checkout.toISOString().split('T')[0];

  try {
    const response = await fetch(`${API_BASE_URL}/api/hotels/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        location: location,
        checkin: checkin,
        checkout: checkoutDate,
        adults: 2,
        children: 0,
        rooms: 1,
        page: 1
      }),
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.ok && data.hotels && data.hotels.length > 0) {
      return data.hotels;
    }
    return [];
  } catch (error) {
    console.error('Error searching hotels:', error);
    throw error;
  }
};

// Get hotel affiliate link
export const getHotelAffiliateLink = async (hotelId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/hotels/${hotelId}/link`);
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
        else if (errorData.error) errorMessage = errorData.error;
      } catch {}
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.ok && data.url) {
      return data.url;
    }
    return null;
  } catch (error) {
    console.error('Error getting affiliate link:', error);
    throw error;
  }
};
