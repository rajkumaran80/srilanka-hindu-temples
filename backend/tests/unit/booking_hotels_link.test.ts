import { generateAffiliateUrl } from '../../api/booking_hotels_link';

// Mock environment variables
process.env.BOOKING_AFFILIATE_ID = '123456';

describe('Booking Hotels Link API', () => {
  describe('generateAffiliateUrl', () => {
    it('should generate correct affiliate URL without subid', () => {
      const result = generateAffiliateUrl('12345');
      expect(result).toBe(
        'https://www.booking.com/hotel/country/hotel-12345.html?aid=123456'
      );
    });

    it('should generate correct affiliate URL with subid', () => {
      const result = generateAffiliateUrl('67890', 'homecard');
      expect(result).toBe(
        'https://www.booking.com/hotel/country/hotel-67890.html?aid=123456&label=homecard'
      );
    });

    it('should sanitize hotel ID', () => {
      const result = generateAffiliateUrl('invalid-id<script>');
      expect(result).toContain('hotel-invalid-idscript');
    });

    it('should handle numeric hotel IDs', () => {
      const result = generateAffiliateUrl('12345');
      expect(result).toBe(
        'https://www.booking.com/hotel/country/hotel-12345.html?aid=123456'
      );
    });

    it('should encode special characters in subid', () => {
      const result = generateAffiliateUrl('12345', 'test subid');
      expect(result).toBe(
        'https://www.booking.com/hotel/country/hotel-12345.html?aid=123456&label=test%20subid'
      );
    });
  });
});
