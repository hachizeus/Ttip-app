# TTIP System Architecture

## High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Dashboard │    │   Admin Panel   │
│  (React Native) │    │    (Next.js)    │    │   (React.js)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     API Gateway           │
                    │   (Express.js/Fastify)    │
                    └─────────────┬─────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼───────┐    ┌──────────▼──────────┐    ┌────────▼────────┐
│ Auth Service  │    │  Payment Service    │    │  QR Service     │
│   (Node.js)   │    │    (Node.js)        │    │   (Node.js)     │
└───────────────┘    └─────────────────────┘    └─────────────────┘
        │                       │                        │
┌───────▼───────┐    ┌──────────▼──────────┐    ┌────────▼────────┐
│Notification   │    │  Analytics Service  │    │ Wallet Service  │
│   Service     │    │    (Node.js)        │    │   (Node.js)     │
└───────────────┘    └─────────────────────┘    └─────────────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Supabase        │
                    │   (PostgreSQL +     │
                    │   Real-time +       │
                    │   Storage +         │
                    │   Edge Functions)   │
                    └─────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                     │                      │
┌───────▼───────┐    ┌────────▼────────┐    ┌────────▼────────┐
│   M-Pesa      │    │   International │    │   SMS/Email     │
│  Daraja API   │    │  Payment APIs   │    │   Services      │
│               │    │ (Stripe/PayPal) │    │ (Twilio/SendGrid)│
└───────────────┘    └─────────────────┘    └─────────────────┘
```

## Service Breakdown

### 1. Authentication Service
- OTP generation and verification
- User registration and login
- PIN management
- Biometric authentication
- JWT token management
- Session management

### 2. Payment Service
- M-Pesa STK Push integration
- International payment processing
- B2C payout management
- Transaction status tracking
- Payment method management
- Fraud detection

### 3. QR Service
- QR code generation
- QR code validation
- Dynamic QR parameters
- Offline QR support
- QR analytics

### 4. Notification Service
- Push notifications
- SMS notifications
- Email notifications
- In-app notifications
- Notification templates
- Delivery tracking

### 5. Analytics Service
- Real-time dashboards
- Performance metrics
- Revenue analytics
- User behavior tracking
- Custom reports
- Data visualization

### 6. Wallet Service
- Balance management
- Payout processing
- Transaction history
- Multi-currency support
- Withdrawal limits
- Fee calculations

## Technology Stack Recommendations

### Frontend
```typescript
// Mobile App (React Native + Expo)
- React Native 0.79+
- Expo SDK 53+
- TypeScript
- Expo Router
- React Query (TanStack Query)
- Zustand (State Management)
- React Hook Form
- Lottie Animations

// Web Dashboard (Next.js)
- Next.js 14+
- TypeScript
- Tailwind CSS
- Shadcn/ui Components
- React Query
- Chart.js/Recharts
- Framer Motion

// Admin Panel (React.js)
- React 18+
- TypeScript
- Material-UI or Ant Design
- React Router
- Redux Toolkit
- React Query
```

### Backend
```javascript
// API Gateway & Services
- Node.js 20+
- Express.js or Fastify
- TypeScript
- Prisma ORM (alternative to direct Supabase)
- Redis (Caching & Sessions)
- Bull Queue (Job Processing)
- Winston (Logging)
- Helmet (Security)

// Database
- Supabase (PostgreSQL + Real-time)
- Redis (Caching)
- S3-compatible storage (Images/Files)

// External Services
- M-Pesa Daraja API
- Stripe/PayPal (International)
- Twilio (SMS)
- SendGrid (Email)
- Firebase (Push Notifications)
```

## Deployment Architecture

### Production Setup
```yaml
# Docker Compose for local development
version: '3.8'
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - REDIS_URL=${REDIS_URL}
  
  auth-service:
    build: ./services/auth
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
  
  payment-service:
    build: ./services/payment
    environment:
      - MPESA_CONSUMER_KEY=${MPESA_CONSUMER_KEY}
      - MPESA_CONSUMER_SECRET=${MPESA_CONSUMER_SECRET}
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### Cloud Deployment Options
1. **Render** (Current) - Good for MVP
2. **AWS ECS/Fargate** - Scalable containers
3. **Google Cloud Run** - Serverless containers
4. **Railway** - Simple deployment
5. **Vercel** - For frontend applications

## Data Flow

### Tip Payment Flow
```
1. Customer scans QR → Mobile App
2. App extracts worker ID → QR Service
3. Customer enters amount → Payment Service
4. STK Push initiated → M-Pesa API
5. Payment confirmation → Webhook → Payment Service
6. Update tip status → Supabase
7. Trigger B2C payout → M-Pesa API
8. Send notifications → Notification Service
9. Update analytics → Analytics Service
10. Real-time updates → Supabase Real-time → Mobile App
```

### Offline Support
```
1. Generate offline QR codes with USSD fallback
2. Cache essential data locally
3. Queue transactions when offline
4. Sync when connection restored
5. Conflict resolution for data sync
```

## Security Layers

### 1. Network Security
- HTTPS/TLS 1.3
- API Gateway with rate limiting
- DDoS protection
- IP whitelisting for admin

### 2. Application Security
- JWT tokens with short expiry
- Request signing
- Input validation and sanitization
- SQL injection prevention
- XSS protection

### 3. Data Security
- Encryption at rest
- Encryption in transit
- PII data masking
- Audit logging
- GDPR compliance

### 4. Authentication Security
- Multi-factor authentication
- Biometric authentication
- PIN complexity requirements
- Account lockout policies
- Session management

## Performance Optimizations

### 1. Caching Strategy
```javascript
// Redis caching layers
- API response caching (5 minutes)
- User session caching (30 minutes)
- QR code caching (24 hours)
- Analytics data caching (1 hour)
```

### 2. Database Optimization
```sql
-- Optimized indexes
CREATE INDEX CONCURRENTLY idx_tips_worker_status ON tips(worker_id, status);
CREATE INDEX CONCURRENTLY idx_tips_created_at_desc ON tips(created_at DESC);
CREATE INDEX CONCURRENTLY idx_workers_location ON workers USING GIST(location);
```

### 3. Mobile App Optimization
```typescript
// Performance techniques
- Image optimization and lazy loading
- Component memoization
- Virtual lists for large datasets
- Background sync
- Offline-first architecture
```

## Monitoring & Observability

### 1. Application Monitoring
- Error tracking (Sentry)
- Performance monitoring (New Relic/DataDog)
- Uptime monitoring (Pingdom)
- Log aggregation (ELK Stack)

### 2. Business Metrics
- Transaction success rates
- Average response times
- User engagement metrics
- Revenue analytics
- Fraud detection alerts

### 3. Infrastructure Monitoring
- Server resource usage
- Database performance
- API response times
- Queue processing times
- External service availability
```