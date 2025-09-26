# CartSmash API Documentation v2.0

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [Cart Operations](#cart-operations)
  - [Instacart Integration](#instacart-integration)
  - [AI Services](#ai-services)
  - [Price Comparison](#price-comparison)
  - [User Account](#user-account)
  - [Admin Operations](#admin-operations)

---

## Overview

CartSmash API is a RESTful service that provides grocery shopping optimization, price comparison, and cart management across multiple retailers.

### Key Features
- Multi-retailer price comparison
- AI-powered grocery list parsing
- Instacart integration for direct checkout
- Real-time pricing updates
- Recipe import and meal planning
- Comprehensive audit logging

## Authentication

All API endpoints (except public ones) require Firebase authentication.

### Authentication Method
```http
Authorization: Bearer <FIREBASE_ID_TOKEN>
```

### Obtaining a Token
1. Authenticate with Firebase using your preferred method
2. Get the ID token: `await firebase.auth().currentUser.getIdToken()`
3. Include in Authorization header

### Example Request
```bash
curl -X POST https://cartsmash-api.onrender.com/api/cart/parse \
  -H "Authorization: Bearer eyJhbGciOiJS..." \
  -H "Content-Type: application/json" \
  -d '{"listText": "milk, eggs, bread"}'
```

## Base URLs

### Production
```
https://cartsmash-api.onrender.com
```

### Development
```
http://localhost:3001
```

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|---------|
| General API | 100 requests | 15 minutes |
| Authentication | 10 requests | 15 minutes |
| AI Services | 10 requests | 1 minute |

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "type": "ErrorType",
  "details": ["Additional details"]
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `502` - External API Error

---

## Endpoints

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user with Firebase

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "firebase_id_token",
  "user": {
    "uid": "user123",
    "email": "user@example.com"
  }
}
```

#### POST /api/auth/logout
Log out current user

**Headers:**
- `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Cart Operations

#### POST /api/cart/parse
**[Requires Authentication]**

Parse grocery list text into structured cart items

**Request Body:**
```json
{
  "listText": "2 lbs chicken\n1 gallon milk\n6 eggs",
  "action": "merge",
  "userId": "user123",
  "options": {
    "mergeDuplicates": true,
    "useAI": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "cart": [
    {
      "id": "item_123",
      "productName": "Chicken",
      "quantity": 2,
      "unit": "lbs",
      "category": "Meat & Seafood",
      "price": 8.99
    }
  ],
  "itemsAdded": 3,
  "totalItems": 3,
  "parsingMethod": "AI_ENHANCED"
}
```

#### GET /api/cart/:userId
**[Requires Authentication]**

Get user's current cart

**Response:**
```json
{
  "success": true,
  "cart": [...],
  "total": 45.67,
  "itemCount": 12,
  "lastUpdated": "2024-01-15T10:30:00Z"
}
```

#### PUT /api/cart/update
**[Requires Authentication]**

Update cart items

**Request Body:**
```json
{
  "userId": "user123",
  "items": [...],
  "action": "replace"
}
```

#### DELETE /api/cart/item/:itemId
**[Requires Authentication]**

Remove item from cart

---

### Instacart Integration

#### POST /api/instacart/search
**[Requires Authentication]**

Search for products on Instacart

**Request Body:**
```json
{
  "query": "organic milk",
  "retailerId": "safeway"
}
```

**Response:**
```json
{
  "success": true,
  "products": [
    {
      "id": "product_123",
      "name": "Organic Valley Whole Milk",
      "price": 5.99,
      "image_url": "https://...",
      "availability": "in_stock"
    }
  ],
  "count": 15
}
```

#### POST /api/instacart/cart/create
**[Requires Authentication]**

Create Instacart cart with items

**Request Body:**
```json
{
  "retailerId": "safeway",
  "zipCode": "94102",
  "items": [
    {
      "product_id": "123",
      "quantity": 2
    }
  ],
  "userId": "user123"
}
```

**Response:**
```json
{
  "success": true,
  "cartId": "cart_xyz",
  "checkoutUrl": "https://instacart.com/...",
  "itemsAdded": 5,
  "totals": {
    "subtotal": 45.67,
    "total": 49.99
  }
}
```

#### POST /api/instacart/recipe/create
**[Requires Authentication]**

Create Instacart recipe/shopping list

**Request Body:**
```json
{
  "title": "Weekly Groceries",
  "ingredients": [
    {
      "name": "Milk",
      "quantity": 1,
      "unit": "gallon"
    }
  ],
  "instructions": ["Shop for weekly groceries"],
  "retailerKey": "safeway"
}
```

---

### AI Services

#### POST /api/ai/parse-list
**[Requires Authentication]**

Use AI to parse unstructured grocery list

**Request Body:**
```json
{
  "text": "Need milk, eggs, and bread for breakfast",
  "options": {
    "extractQuantities": true,
    "categorize": true,
    "suggestAlternatives": false
  }
}
```

#### POST /api/meal-plans/generate-meal-plan
**[Requires Authentication]**

Generate AI meal plan

**Request Body:**
```json
{
  "preferences": {
    "dietaryRestrictions": ["vegetarian"],
    "cuisines": ["Italian", "Mexican"],
    "servings": 4,
    "meals": 7
  }
}
```

---

### Price Comparison

#### POST /api/instacart/compare-prices
**[Requires Authentication]**

Compare prices across retailers

**Request Body:**
```json
{
  "query": "milk",
  "postal_code": "94102"
}
```

**Response:**
```json
{
  "success": true,
  "comparisons": [
    {
      "retailer": "Safeway",
      "price": 3.99,
      "availability": "in_stock"
    },
    {
      "retailer": "Whole Foods",
      "price": 4.99,
      "availability": "in_stock"
    }
  ],
  "bestPrice": {
    "retailer": "Safeway",
    "price": 3.99
  }
}
```

---

### User Account

#### GET /api/account/:userId
**[Requires Authentication]**

Get user account details

**Response:**
```json
{
  "success": true,
  "user": {
    "uid": "user123",
    "email": "user@example.com",
    "preferredRetailer": "safeway",
    "postalCode": "94102",
    "settings": {...}
  }
}
```

#### PUT /api/account/:userId
**[Requires Authentication]**

Update user account settings

**Request Body:**
```json
{
  "preferredRetailer": "whole_foods",
  "postalCode": "94103",
  "settings": {
    "notifications": true,
    "autoSave": true
  }
}
```

---

### Admin Operations

#### GET /api/admin/audit-report
**[Requires Admin Authentication]**

Generate audit report

**Query Parameters:**
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Response:**
```json
{
  "success": true,
  "report": {
    "period": {...},
    "summary": {
      "totalRequests": 1523,
      "successfulRequests": 1456,
      "failedRequests": 67,
      "uniqueUsers": 234
    }
  }
}
```

#### POST /api/cache/clear
**[Requires Admin Authentication]**

Clear application cache

**Response:**
```json
{
  "success": true,
  "stats": {
    "itemsCleared": 150,
    "sizeClearedMB": 12.3
  }
}
```

---

## Webhook Events

CartSmash can send webhooks for certain events:

### Available Events
- `cart.created` - New cart created
- `cart.updated` - Cart items modified
- `checkout.initiated` - User started checkout
- `price.alert` - Price drop detected

### Webhook Payload
```json
{
  "event": "cart.updated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {...}
}
```

---

## SDKs and Libraries

### JavaScript/Node.js
```bash
npm install @cartsmash/sdk
```

```javascript
import CartSmash from '@cartsmash/sdk';

const client = new CartSmash({
  apiKey: 'your_api_key',
  environment: 'production'
});

const cart = await client.cart.parse('milk, eggs, bread');
```

---

## Testing

### Test Endpoints
Use these endpoints in development for testing:

- `GET /api/test` - Basic connectivity test
- `GET /api/health` - Health check with system status

### Example Test Request
```bash
curl https://cartsmash-api.onrender.com/api/health
```

---

## Support

- **Email**: support@cartsmash.com
- **Documentation**: https://docs.cartsmash.com
- **Status Page**: https://status.cartsmash.com
- **GitHub Issues**: https://github.com/cartsmash/api/issues

---

## Changelog

### v2.0.0 (2025-01-15)
- Added comprehensive authentication
- Implemented audit logging
- Enhanced error handling
- Added input validation
- Improved rate limiting
- Added admin endpoints

### v1.0.0 (2024-12-01)
- Initial release

---

*Last Updated: January 2025*