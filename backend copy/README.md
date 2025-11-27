# Booking.com Proxy Service

A secure backend service that proxies requests to Booking.com's Demand API, providing hotel search functionality and generating affiliate deep-links for booking. Built with Node.js, TypeScript, Express, and MongoDB.

## 🚀 Features

- **Hotel Search API**: Proxies Booking.com Demand API with sanitized responses
- **Affiliate Link Generation**: Creates deep-links with affiliate tracking
- **JWT Authentication**: Secure API access with bearer tokens
- **Rate Limiting**: Per-user and per-IP request limits
- **Redis Caching**: High-performance caching with TTL
- **MongoDB Storage**: Persistent data storage
- **Comprehensive Testing**: Unit and integration tests with Jest
- **Docker Support**: Containerized deployment
- **Production Ready**: Logging, error handling, and monitoring

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [API Endpoints](#api-endpoints)
- [Authentication](#authentication)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Monitoring](#monitoring)

## 🏃 Quick Start

### Prerequisites

- Node.js v20+
- MongoDB
- Redis (optional, falls back to in-memory cache)
- Docker & Docker Compose (for local development)

### Local Development Setup

1. **Clone and install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration:**
   ```bash
   cp config.example.env .env
   # Edit .env with your actual values
   ```

3. **Start MongoDB and Redis:**
   ```bash
   # Using Docker Compose (recommended)
   docker-compose up -d mongodb redis

   # Or install locally
   brew install mongodb-community redis
   brew services start mongodb-community
   brew services start redis
   ```

4. **Run the service:**
   ```bash
   npm run dev
   ```

5. **Test the setup:**
   ```bash
   curl http://localhost:8080/health
   ```

## 🔗 API Endpoints

### POST /api/hotels/search

Search for hotels using Booking.com's Demand API.

**Request:**
```json
{
  "location": "Colombo, Sri Lanka",
  "checkin": "2025-12-01",
  "checkout": "2025-12-03",
  "adults": 2,
  "children": 0,
  "rooms": 1,
  "page": 1
}
```

**Response:**
```json
{
  "ok": true,
  "cached": false,
  "hotels": [
    {
      "id": "12345",
      "name": "Hotel Name",
      "thumbnail": "https://...",
      "priceDisplay": "$150",
      "rating": 8.5,
      "locationSummary": "Colombo",
      "freeCancellation": true
    }
  ]
}
```

### GET /api/hotels/:hotelId/link

Generate an affiliate deep-link for booking.

**Query Parameters:**
- `subid` (optional): Tracking identifier

**Response:**
```json
{
  "ok": true,
  "url": "https://www.booking.com/hotel/country/hotel-12345.html?aid=123456&label=homecard",
  "hotelId": "12345",
  "subid": "homecard"
}
```

## 🔐 Authentication

The service uses JWT bearer token authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Local Development Token

For local development, use this test token:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXIiLCJpYXQiOjE2MzgzNjgwMDAsImV4cCI6MTk5OTk5OTk5OX0.test-signature
```

## ⚙️ Configuration

### Environment Variables

Copy `config.example.env` to `.env` and configure:

```bash
# Booking.com API
BOOKING_TOKEN=your_demand_api_token
BOOKING_AFFILIATE_ID=your_affiliate_id

# Database
MONGODB_URI=mongodb://localhost:27017/booking-proxy
REDIS_URL=redis://localhost:6379

# JWT (use JWT_SECRET for HMAC, or JWT_PUBLIC_KEY for RSA)
JWT_SECRET=your_jwt_secret_here

# Server
PORT=8080
```

### Secrets Management

**Development:**
- Use `.env` file (never commit to git)

**Production (AWS):**
- Store secrets in AWS Secrets Manager
- Use IAM roles for EC2/ECS access
- Environment variables injected at runtime

**Docker:**
```bash
docker run -e BOOKING_TOKEN=$BOOKING_TOKEN booking-proxy
```

## 🛠️ Development

### Project Structure

```
backend/
├── api/                    # API handlers
│   ├── booking_hotels_search.ts
│   └── booking_hotels_link.ts
├── config.example.env      # Environment template
├── package.json
├── server.ts              # Express server
├── tsconfig.json
└── README.md
```

### Available Scripts

```bash
npm run build      # Compile TypeScript
npm run start      # Run compiled code
npm run dev        # Run with ts-node (watch mode)
npm run test       # Run tests
npm run lint       # Lint code
```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb config with TypeScript support
- **Prettier**: Code formatting
- **Jest**: Testing framework

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
└── fixtures/          # Test data
```

### Mocking External APIs

Tests use `nock` to mock Booking.com API responses:

```typescript
nock('https://distribution-xml.booking.com')
  .post('/2.0/json/hotels')
  .reply(200, mockBookingResponse);
```

### End-to-End Testing

```bash
# Start services
docker-compose up -d

# Run E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Docker Deployment

```bash
# Build image
docker build -t booking-proxy .

# Run with environment
docker run -p 8080:8080 \
  -e BOOKING_TOKEN=$BOOKING_TOKEN \
  -e MONGODB_URI=$MONGODB_URI \
  booking-proxy
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      - BOOKING_TOKEN=${BOOKING_TOKEN}
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### AWS Deployment

#### ECS Fargate
1. Build Docker image and push to ECR
2. Create ECS cluster with Fargate tasks
3. Configure Secrets Manager for environment variables
4. Set up Application Load Balancer
5. Configure CloudWatch for logging

#### Lambda + API Gateway
1. Use Serverless Framework or AWS CDK
2. Deploy as Lambda functions
3. API Gateway for routing
4. Secrets Manager integration

### Environment Setup

```bash
# Install dependencies
make setup

# Run locally
make run

# Run tests
make test

# Build Docker image
make build

# Deploy to staging
make deploy-staging
```

## 🔒 Security

### API Key Protection

- **Never expose BOOKING_TOKEN** in responses or logs
- **Environment variables only** for secrets
- **AWS Secrets Manager** for production
- **Rotate keys regularly**

### Rate Limiting

```typescript
// Per-user: 60 requests/minute
// Per-IP: 200 requests/minute
app.use(rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // requests per window
  keyGenerator: (req) => req.user?.id || req.ip
}));
```

### Input Validation

- **express-validator** for request validation
- **Sanitized responses** remove sensitive data
- **CORS protection** with origin restrictions

### HTTPS Only

- **Production**: Always use HTTPS
- **HSTS headers**: Force secure connections
- **Secure cookies**: httpOnly, secure flags

## 📊 Monitoring

### Logging

Structured JSON logs with Winston:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "message": "Hotel search completed",
  "userId": "user123",
  "requestId": "req-456",
  "duration": 250,
  "cacheHit": false
}
```

### Metrics

Prometheus-compatible metrics endpoint:

```bash
curl http://localhost:8080/metrics
```

### Health Checks

```bash
# Application health
curl http://localhost:8080/health

# Dependencies health
curl http://localhost:8080/health/dependencies
```

## 🐛 Troubleshooting

### Common Issues

**Redis Connection Failed**
```bash
# Check Redis status
docker ps | grep redis

# Restart Redis
docker restart booking-redis
```

**MongoDB Connection Timeout**
```bash
# Check MongoDB logs
docker logs booking-mongodb

# Verify connection string
mongosh mongodb://localhost:27017/booking-proxy
```

**Booking API Errors**
- Verify BOOKING_TOKEN is valid
- Check rate limits (429 errors)
- Confirm affiliate ID is correct

### Debug Mode

```bash
DEBUG=booking:* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Code Standards

- **TypeScript strict mode** enabled
- **ESLint** and **Prettier** configured
- **100% test coverage** required
- **Conventional commits** for PRs

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Security**: security@example.com

---

**Note**: This service is designed for affiliate marketing use. Ensure compliance with Booking.com's terms of service and local affiliate marketing regulations.
