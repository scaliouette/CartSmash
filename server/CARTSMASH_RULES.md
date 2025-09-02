# CartSmash Rules & Requirements

## Core Authentication Rules

### OAuth Scope Requirements
- **REQUIRED SCOPE**: `cart.basic:write profile.compact product.compact`
- **INVALID SCOPE**: `cart.basic:rw` (rejected by Kroger OAuth server)
- **Scope Validation**: All cart operations require `cart.basic:write` scope
- **Client Credentials**: Cannot access cart endpoints - only user OAuth tokens work

### Authentication Flow
1. **Primary**: Azure B2C OAuth with cart.basic:write scope
2. **Fallback**: Legacy Kroger OAuth with cart.basic:write scope
3. **Token Storage**: MongoDB via TokenStore service
4. **Token Refresh**: Automatic refresh 5 minutes before expiry
5. **Security**: Encrypted token storage with rotation

## API Endpoint Rules

### Cart Operations
- **GET /api/kroger-orders/cart**: Requires valid user OAuth token
- **POST /api/kroger-orders/cart/send**: Requires valid user OAuth token
- **PUT /api/kroger-orders/cart/update**: Requires valid user OAuth token
- **DELETE /api/kroger-orders/cart/clear**: Requires valid user OAuth token

### Authentication Endpoints
- **GET /api/auth/kroger/login**: Generates OAuth URL with cart.basic:rw scope
- **GET /api/auth/kroger/callback**: Processes OAuth callback and stores tokens
- **GET /api/auth/kroger/status**: Checks user authentication status

### Product Search
- **GET /api/kroger/products/search**: Can use client credentials (no cart scope needed)
- **Parameter**: `q` (required, minimum 2 characters)
- **Location**: Store ID required for accurate results

## Error Handling Rules

### Authentication Errors
- **401 Unauthorized**: Token expired or invalid - trigger refresh
- **403 Forbidden**: Insufficient scope - redirect to re-authentication
- **Missing Token**: Return clear error message with OAuth URL

### Cart Operation Errors
- **No Items Prepared**: Authentication likely expired - retry OAuth
- **Scope Mismatch**: Ensure cart.basic:write scope in token
- **Network Errors**: Implement retry logic with exponential backoff

## Security Rules

### Token Management
- **Encryption**: All tokens encrypted at rest using TOKEN_ENCRYPTION_KEY
- **Expiry**: Tokens expire per Kroger specifications (typically 1 hour)
- **Refresh**: Automatic refresh 5 minutes before expiry
- **Cleanup**: Expired tokens automatically removed

### State Management
- **OAuth State**: Secure, time-limited state parameters
- **User Sessions**: Mapped to Firebase authentication
- **Cache**: 5-minute in-memory cache for performance

## Configuration Requirements

### Environment Variables
```bash
# OAuth Configuration
KROGER_CLIENT_ID=cartsmashproduction-bbc7zd3f
KROGER_CLIENT_SECRET=6QDheqLBciMEda8oI6J5MGs163IsGy05jFRfcqTU
KROGER_REDIRECT_URI=https://cartsmash-api.onrender.com/api/auth/kroger/callback
KROGER_OAUTH_SCOPES=cart.basic:write profile.compact product.compact

# API Endpoints
KROGER_BASE_URL=https://api.kroger.com/v1

# Security
TOKEN_ENCRYPTION_KEY=Gx3p9kVzB5w8Mn2qRt4uYa7hJf6sLc1dNe0iPo3mXv8=
JWT_SECRET=d9657ecc2c7bbbd4e4342b07242077c3

# Database
MONGODB_URI=mongodb+srv://cartsmash-admin:BGFq1pKDHDIVmWFz@cartsmash-cluster.z7adwpu.mongodb.net/?retryWrites=true&w=majority&appName=cartsmash-cluster
```

### Allowed Origins
- Production: `https://cart-smash.vercel.app`
- Additional: `https://cartsmash.vercel.app`
- Development: `http://localhost:3000`, `http://localhost:3001`

## Integration Rules

### Azure B2C Integration
- **Primary Authentication**: Azure B2C OAuth flow
- **URL Pattern**: `login.kroger.com/eciamp.onmicrosoft.com/b2c_1a__ciam_signin_signup/oauth2/v2.0`
- **Response Handling**: Supports both query params and URL fragments
- **Client-Side**: postMessage communication with parent window

### Firebase Authentication
- **User Management**: Firebase handles user sessions
- **Token Mapping**: Firebase UID mapped to Kroger OAuth tokens
- **Service Account**: Uses firebase-adminsdk credentials

### MongoDB Token Storage
- **Encryption**: AES-256 encryption for sensitive token data
- **Indexing**: Indexed by userId for fast retrieval
- **TTL**: Automatic cleanup of expired tokens
- **Backup**: Refresh tokens stored securely

## Testing Rules

### Authentication Testing
1. **OAuth URL Generation**: Must include cart.basic:write scope
2. **Callback Processing**: Must handle both valid and invalid codes
3. **Token Storage**: Must encrypt and store tokens correctly
4. **Token Retrieval**: Must decrypt and validate tokens

### Cart Operation Testing
1. **Unauthenticated Requests**: Must return proper error messages
2. **Authenticated Requests**: Must use valid OAuth tokens
3. **Scope Validation**: Must verify cart.basic:write scope
4. **Error Handling**: Must provide actionable error messages

### API Endpoint Testing
1. **Health Checks**: All services must report healthy status
2. **Rate Limiting**: Must respect rate limits and provide feedback
3. **CORS**: Must allow configured origins
4. **Security Headers**: Must include proper security headers

## Deployment Rules

### Production Requirements
- **Environment**: NODE_ENV=production
- **HTTPS**: All communication must use HTTPS
- **CORS**: Strict origin validation
- **Rate Limiting**: Enforced for all endpoints
- **Logging**: Structured logging for monitoring

### Monitoring
- **Health Endpoints**: `/health` for service monitoring
- **Metrics**: Token usage, authentication success rates
- **Alerts**: Failed authentication attempts, API errors
- **Performance**: Response times, cache hit rates

## Development Rules

### Code Standards
- **Authentication**: Never bypass authentication in production
- **Tokens**: Never log full tokens - only prefixes/suffixes
- **Secrets**: Never commit secrets to repository
- **Scope**: Always use cart.basic:write for cart operations

### Testing Standards
- **Unit Tests**: All authentication flows
- **Integration Tests**: End-to-end OAuth flows
- **Error Testing**: All error conditions
- **Performance Tests**: Load testing for peak usage

This document serves as the definitive rules for CartSmash authentication and API operations. All code must conform to these requirements.