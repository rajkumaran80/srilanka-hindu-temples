// api/booking_hotels_link.ts
// Vercel Serverless handler (TypeScript)
// Generates affiliate deep-links for Booking.com hotels

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

const BOOKING_AFFILIATE_ID = process.env.BOOKING_AFFILIATE_ID || 'qwq';

export function generateAffiliateUrl(hotelId: string, subid?: string): string {
  // Sanitize and encode hotel ID
  const sanitizedHotelId = encodeURIComponent(hotelId.toString().trim());

  // Build affiliate URL
  // Format: https://www.booking.com/hotel/{country}/{hotel-slug}.html?aid={AFFILIATE_ID}&label={SUBID}
  // For simplicity, we'll use a generic format. In production, you might want to fetch the actual hotel slug
  const baseUrl = `https://www.booking.com/hotel/country/hotel-${sanitizedHotelId}.html`;

  const params = new URLSearchParams({
    aid: BOOKING_AFFILIATE_ID,
  });

  if (subid) {
    params.append('label', encodeURIComponent(subid));
  }

  return `${baseUrl}?${params.toString()}`;
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

    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      res.status(405).json({ ok: false, error: "Method not allowed, use GET" });
      return;
    }

    if (!BOOKING_AFFILIATE_ID) {
      res.status(500).json({ ok: false, error: "Server misconfigured: BOOKING_AFFILIATE_ID missing" });
      return;
    }

    // Get hotel ID from URL path
    const urlParts = req.url?.split('/') || [];
    const hotelId = urlParts[urlParts.length - 2]; // Extract from /api/hotels/:hotelId/link

    if (!hotelId) {
      res.status(400).json({ ok: false, error: "Hotel ID is required" });
      return;
    }

    // Get subid from query parameters
    const subid = req.query?.subid as string;

    // Generate affiliate URL
    const affiliateUrl = generateAffiliateUrl(hotelId, subid);

    // Return JSON response with affiliate URL
    res.status(200).json({
      ok: true,
      url: affiliateUrl,
      hotelId: hotelId,
      subid: subid || null,
    });

  } catch (err: any) {
    console.error("booking_hotels_link error:", err);
    res.status(500).json({ ok: false, error: "Internal server error" });
  }
}
