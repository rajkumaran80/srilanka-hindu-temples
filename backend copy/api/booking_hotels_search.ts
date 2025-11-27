// api/booking_hotels_search.ts
// Vercel Serverless handler (TypeScript)
// Proxies hotel search requests to Booking.com Demand API

import { MongoClient } from "mongodb";
import axios, { AxiosResponse } from "axios";

interface StatusResponse {
  json: (data: any) => void;
  end: () => void;
}
interface VercelResponse {
  status: (code: number) => StatusResponse;
  json: (data: any) => void;
  headersSent?: boolean;
  setHeader: (name: string, value: string) => void;
}
interface VercelRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body: string | any;
  query: Record<string, string | any>;
  url: string;
}

const BOOKING_TOKEN = process.env.BOOKING_TOKEN || 'oQpIsH5FGz9GtcGvhSOj2yMZiw';
const BOOKING_AFFILIATE_ID = process.env.BOOKING_AFFILIATE_ID || 'qwqwq';
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'srilanka-hindu-temples';

// --- Mongo client reuse (recommended for serverless)
let cachedClient: MongoClient | null = null;
async function getMongoClient(): Promise<MongoClient> {
  if (!MONGODB_URI) throw new Error('MONGODB_URI env missing');
  if (cachedClient) return cachedClient;
  const c = new MongoClient(MONGODB_URI);
  await c.connect();
  cachedClient = c;
  return c;
}

interface HotelSearchRequest {
  location: string;
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  rooms?: number;
  page?: number;
}

interface SanitizedHotelResult {
  id: string;
  name: string;
  thumbnail: string;
  priceDisplay: string;
  rating: number;
  locationSummary: string;
  freeCancellation: boolean;
}

function createCacheKey(params: HotelSearchRequest): string {
  const { location, checkin, checkout, adults = 2, children = 0, rooms = 1, page = 1 } = params;
  return `booking:search:${location}:${checkin}:${checkout}:${adults}:${children}:${rooms}:${page}`;
}

async function searchBookingHotels(params: HotelSearchRequest): Promise<any> {
  const { location, checkin, checkout, adults = 2, children = 0, rooms = 1, page = 1 } = params;

  // Build Booking.com Demand API request
  const bookingUrl = 'https://distribution-xml.booking.com/2.0/json/hotels';

  const requestData = {
    city: location,
    checkin: checkin,
    checkout: checkout,
    guests: {
      adults: adults,
      children: children > 0 ? [{ age: 10 }] : [] // Default child age if children present
    },
    rooms: rooms,
    page: page,
    rows: 20, // Limit results per page
  };

  try {
    const response: AxiosResponse = await axios.post(bookingUrl, requestData, {
      headers: {
        'Authorization': `Bearer ${BOOKING_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    return response.data;
  } catch (error: any) {
    console.error('Booking.com API error:', error.response?.data || error.message);
    throw new Error(`Booking API error: ${error.response?.status || 'Unknown'}`);
  }
}

function sanitizeHotelResults(rawResults: any): SanitizedHotelResult[] {
  if (!rawResults?.hotels) return [];

  return rawResults.hotels.map((hotel: any) => ({
    id: hotel.hotel_id?.toString() || '',
    name: hotel.hotel_name || '',
    thumbnail: hotel.main_photo_url || '',
    priceDisplay: hotel.min_total_price?.toString() || 'Price not available',
    rating: parseFloat(hotel.review_score) || 0,
    locationSummary: hotel.city || '',
    freeCancellation: hotel.free_cancellation || false,
  })).filter((hotel: SanitizedHotelResult) => hotel.id && hotel.name);
}

// Mock hotel data for testing and development
const mockHotelsData: { [key: string]: SanitizedHotelResult[] } = {
  'colombo': [
    {
      id: "12345",
      name: "Cinnamon Grand Colombo",
      thumbnail: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      priceDisplay: "$180",
      rating: 8.5,
      locationSummary: "Colombo City Center",
      freeCancellation: true,
    },
    {
      id: "12346",
      name: "Shangri-La Hotel Colombo",
      thumbnail: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400",
      priceDisplay: "$220",
      rating: 9.1,
      locationSummary: "Colombo Fort",
      freeCancellation: false,
    },
    {
      id: "12347",
      name: "Hilton Colombo",
      thumbnail: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400",
      priceDisplay: "$195",
      rating: 8.8,
      locationSummary: "Colombo City Center",
      freeCancellation: true,
    },
    {
      id: "12348",
      name: "Taj Samudra Colombo",
      thumbnail: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400",
      priceDisplay: "$250",
      rating: 9.3,
      locationSummary: "Colombo Galle Face",
      freeCancellation: false,
    },
    {
      id: "12349",
      name: "Jetwing Colombo Seven",
      thumbnail: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400",
      priceDisplay: "$165",
      rating: 8.2,
      locationSummary: "Colombo Kollupitiya",
      freeCancellation: true,
    }
  ],
  'kandy': [
    {
      id: "22345",
      name: "Earl's Regency Hotel",
      thumbnail: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
      priceDisplay: "$120",
      rating: 8.7,
      locationSummary: "Kandy City Center",
      freeCancellation: true,
    },
    {
      id: "22346",
      name: "Mahaweli Reach Hotel",
      thumbnail: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400",
      priceDisplay: "$140",
      rating: 8.4,
      locationSummary: "Kandy Riverside",
      freeCancellation: false,
    },
    {
      id: "22347",
      name: "The Kandy House",
      thumbnail: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400",
      priceDisplay: "$180",
      rating: 9.0,
      locationSummary: "Kandy Hills",
      freeCancellation: true,
    }
  ],
  'galle': [
    {
      id: "32345",
      name: "Amangalla",
      thumbnail: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400",
      priceDisplay: "$350",
      rating: 9.5,
      locationSummary: "Galle Fort",
      freeCancellation: false,
    },
    {
      id: "32346",
      name: "Jetwing Lighthouse",
      thumbnail: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=400",
      priceDisplay: "$280",
      rating: 9.2,
      locationSummary: "Galle Coast",
      freeCancellation: true,
    }
  ],
  'default': [
    {
      id: "99999",
      name: "Sample Hotel",
      thumbnail: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=400",
      priceDisplay: "$150",
      rating: 8.0,
      locationSummary: "City Center",
      freeCancellation: true,
    },
    {
      id: "99998",
      name: "Budget Inn",
      thumbnail: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=400",
      priceDisplay: "$85",
      rating: 7.5,
      locationSummary: "Downtown",
      freeCancellation: false,
    }
  ]
};

function getMockHotelsForLocation(location: string): SanitizedHotelResult[] {
  const locationKey = location.toLowerCase();

  // Check for specific locations
  if (locationKey.includes('colombo')) {
    return mockHotelsData.colombo;
  } else if (locationKey.includes('kandy')) {
    return mockHotelsData.kandy;
  } else if (locationKey.includes('galle')) {
    return mockHotelsData.galle;
  }

  // Return default hotels for other locations
  return mockHotelsData.default;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,HEAD,POST");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
      res.setHeader("Access-Control-Max-Age", "600");
      res.status(200).end();
      return;
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      res.status(405).json({ ok: false, error: "Method not allowed, use POST" });
      return;
    }

    // Parse request body
    let requestBody: HotelSearchRequest;
    try {
      if (typeof req.body === "string") {
        requestBody = req.body ? JSON.parse(req.body) : {};
      } else {
        requestBody = req.body || {};
      }
    } catch (parseError) {
      console.error("Failed to parse request body:", parseError);
      res.status(400).json({ ok: false, error: "Invalid JSON in request body" });
      return;
    }

    const { location, checkin, checkout, adults, children, rooms, page } = requestBody;

    // Validate required fields
    if (!location || !checkin || !checkout) {
      res.status(400).json({
        ok: false,
        error: "Missing required fields: location, checkin, checkout"
      });
      return;
    }

    // Validate date formats
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const today = new Date();

    if (isNaN(checkinDate.getTime()) || isNaN(checkoutDate.getTime())) {
      res.status(400).json({
        ok: false,
        error: "Invalid date format. Use YYYY-MM-DD"
      });
      return;
    }

    if (checkinDate < today || checkoutDate <= checkinDate) {
      res.status(400).json({
        ok: false,
        error: "Invalid dates. Check-in must be today or later, check-out must be after check-in"
      });
      return;
    }

    // Simulate API delay for realistic testing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Get mock hotels based on location
    const mockHotels = getMockHotelsForLocation(location);

    // Simulate pagination (return subset based on page)
    const pageSize = 10;
    const startIndex = ((page || 1) - 1) * pageSize;
    const paginatedHotels = mockHotels.slice(startIndex, startIndex + pageSize);

    console.log(`Mock hotel search for ${location}: found ${mockHotels.length} hotels, returning ${paginatedHotels.length} for page ${page || 1}`);

    res.status(200).json({
      ok: true,
      cached: false,
      hotels: paginatedHotels,
      total: mockHotels.length,
      page: page || 1,
      location: location
    });

  } catch (err: any) {
    console.error("booking_hotels_search error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
