# SmashCart API Documentation

## Overview
The SmashCart API provides comprehensive Kroger cart management with store location information, detailed product data, and full CRUD operations.

## Base URL
```
https://cartsmash-api.onrender.com/api/smash-cart
```

## Authentication
All cart operations require valid Kroger OAuth tokens with `cart.basic:write` scope. Users must complete OAuth flow before accessing cart endpoints.

## Endpoints

### GET Cart - Retrieve Comprehensive Cart Information

**Endpoint:** `GET /api/smash-cart/{userId}`

**Parameters:**
- `userId` (path) - User identifier
- `includeStoreInfo` (query, optional) - Include store location details (default: true)
- `includeProductDetails` (query, optional) - Include enhanced product information (default: true)

**Response:**
```json
{
  "success": true,
  "cart": {
    "id": "cart_12345",
    "items": [
      {
        "id": "item_1",
        "upc": "1234567890",
        "quantity": 2,
        "price": {
          "regular": 3.99,
          "promo": 2.99
        },
        "productDetails": {
          "description": "Bananas, 1 lb",
          "brand": "Fresh",
          "categories": ["Produce", "Fruit"],
          "images": ["url1", "url2"]
        },
        "enhanced": true
      }
    ],
    "itemCount": 1,
    "store": {
      "locationId": "01400943",
      "name": "Kroger - Main Street",
      "address": {
        "street": "123 Main Street",
        "city": "Cincinnati",
        "state": "OH",
        "zipCode": "45202",
        "county": "Hamilton"
      },
      "coordinates": {
        "latitude": 39.1031,
        "longitude": -84.5120
      },
      "contact": {
        "phone": "(513) 555-0123"
      },
      "hours": {
        "monday": "6:00 AM - 11:00 PM",
        "tuesday": "6:00 AM - 11:00 PM"
      },
      "services": {
        "pharmacy": true,
        "fuelCenter": true,
        "pickup": true,
        "delivery": true
      },
      "timezone": "America/New_York"
    },
    "summary": {
      "totalItems": 1,
      "estimatedTotal": 3.99,
      "lastModified": "2025-09-02T05:30:00Z",
      "cartId": "cart_12345"
    },
    "metadata": {
      "createdAt": "2025-09-02T05:00:00Z",
      "modifiedAt": "2025-09-02T05:30:00Z",
      "userId": "user123",
      "apiVersion": "v1"
    }
  },
  "message": "Cart retrieved with 1 items",
  "timestamp": "2025-09-02T05:30:00Z",
  "userId": "user123"
}
```

### POST Cart - Create Cart or Add Items

**Endpoint:** `POST /api/smash-cart/{userId}`

**Body:**
```json
{
  "items": [
    {
      "productName": "Bananas",
      "quantity": 2,
      "upc": "1234567890"
    },
    {
      "productName": "Milk",
      "quantity": 1
    }
  ],
  "storeId": "01400943",
  "modality": "PICKUP",
  "clearExisting": false
}
```

**Parameters:**
- `items` (required) - Array of items to add
- `storeId` (optional) - Store location ID
- `modality` (optional) - "PICKUP" or "DELIVERY" (default: "PICKUP")
- `clearExisting` (optional) - Clear existing cart before adding (default: false)

### PUT Cart - Update Existing Cart

**Endpoint:** `PUT /api/smash-cart/{userId}`

**Body:**
```json
{
  "items": [
    {
      "itemId": "item_1",
      "action": "update",
      "quantity": 3
    },
    {
      "itemId": "item_2", 
      "action": "remove"
    },
    {
      "action": "add",
      "productName": "Bread",
      "quantity": 1
    }
  ],
  "storeId": "01400943"
}
```

**Actions:**
- `update` - Change item quantity
- `remove` - Remove item from cart (or set quantity to 0)
- `add` - Add new item to cart

### DELETE Cart - Clear or Remove Cart

**Endpoint:** `DELETE /api/smash-cart/{userId}`

**Parameters:**
- `removeCompletely` (query, optional) - Remove entire cart vs just clear items (default: false)

### Store Information - Get Detailed Store Data

**Endpoint:** `GET /api/smash-cart/{userId}/store/{storeId}`

**Response:**
```json
{
  "success": true,
  "store": {
    "locationId": "01400943",
    "name": "Kroger - Main Street",
    "address": {
      "street": "123 Main Street",
      "city": "Cincinnati", 
      "state": "OH",
      "zipCode": "45202",
      "county": "Hamilton"
    },
    "coordinates": {
      "latitude": 39.1031,
      "longitude": -84.5120
    },
    "contact": {
      "phone": "(513) 555-0123"
    },
    "hours": {
      "monday": "6:00 AM - 11:00 PM",
      "tuesday": "6:00 AM - 11:00 PM",
      "wednesday": "6:00 AM - 11:00 PM",
      "thursday": "6:00 AM - 11:00 PM",
      "friday": "6:00 AM - 12:00 AM",
      "saturday": "6:00 AM - 12:00 AM",
      "sunday": "6:00 AM - 11:00 PM"
    },
    "departments": ["Bakery", "Deli", "Pharmacy", "Floral"],
    "services": {
      "pharmacy": true,
      "fuelCenter": true,
      "pickup": true,
      "delivery": true
    },
    "timezone": "America/New_York"
  }
}
```

### Product Search - Find Products to Add

**Endpoint:** `POST /api/smash-cart/{userId}/search`

**Body:**
```json
{
  "searchTerm": "organic bananas",
  "storeId": "01400943",
  "limit": 10
}
```

### Quick Add - Simplified Item Addition

**Endpoint:** `POST /api/smash-cart/{userId}/quick-add`

**Body:**
```json
{
  "productNames": ["Bananas", "Milk", "Bread"],
  "storeId": "01400943"
}
```

### Cart Summary - Analytics and Overview

**Endpoint:** `GET /api/smash-cart/{userId}/summary`

**Response:**
```json
{
  "success": true,
  "userId": "user123",
  "summary": {
    "totalItems": 5,
    "estimatedTotal": 24.99,
    "lastModified": "2025-09-02T05:30:00Z",
    "cartId": "cart_12345"
  },
  "analytics": {
    "itemCount": 5,
    "estimatedTotal": 24.99,
    "categories": {
      "Produce": 2,
      "Dairy": 1,
      "Bakery": 2
    },
    "topItems": [
      {
        "name": "Bananas, 1 lb",
        "quantity": 3,
        "price": 3.99
      }
    ],
    "storeInfo": {
      "name": "Kroger - Main Street",
      "address": {
        "street": "123 Main Street",
        "city": "Cincinnati",
        "state": "OH"
      },
      "services": {
        "pharmacy": true,
        "pickup": true,
        "delivery": true
      }
    }
  }
}
```

### Health Check

**Endpoint:** `GET /api/smash-cart/health`

**Response:**
```json
{
  "service": "kroger_smash_cart",
  "baseURL": "https://api.kroger.com/v1",
  "defaultStore": "01400943",
  "configured": true,
  "features": {
    "get": "Retrieve cart with store location and product details",
    "post": "Create cart and add items",
    "put": "Update existing cart items", 
    "delete": "Clear or remove cart",
    "storeInfo": "Comprehensive store information",
    "productDetails": "Enhanced product information"
  },
  "status": "operational"
}
```

## Error Handling

### Authentication Errors
```json
{
  "success": false,
  "error": "AUTHENTICATION_REQUIRED: User must complete Kroger OAuth before cart operations"
}
```

### Scope Errors
```json
{
  "success": false,
  "error": "INSUFFICIENT_SCOPE: User token missing cart.basic:write scope"
}
```

### Validation Errors
```json
{
  "success": false,
  "error": "Items array is required and must not be empty"
}
```

## Usage Examples

### 1. Get Cart with Store Info
```bash
curl -X GET "https://cartsmash-api.onrender.com/api/smash-cart/user123?includeStoreInfo=true&includeProductDetails=true"
```

### 2. Add Items to Cart
```bash
curl -X POST "https://cartsmash-api.onrender.com/api/smash-cart/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"productName": "Bananas", "quantity": 2},
      {"productName": "Milk", "quantity": 1}
    ],
    "storeId": "01400943",
    "modality": "PICKUP"
  }'
```

### 3. Update Cart Items
```bash
curl -X PUT "https://cartsmash-api.onrender.com/api/smash-cart/user123" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {"itemId": "item_1", "action": "update", "quantity": 3},
      {"itemId": "item_2", "action": "remove"}
    ]
  }'
```

### 4. Clear Cart
```bash
curl -X DELETE "https://cartsmash-api.onrender.com/api/smash-cart/user123?removeCompletely=false"
```

### 5. Get Store Information
```bash
curl -X GET "https://cartsmash-api.onrender.com/api/smash-cart/user123/store/01400943"
```

## Features

✅ **Comprehensive Cart Management**
- Full CRUD operations (GET, POST, PUT, DELETE)
- Store location integration
- Enhanced product details

✅ **Store Information**
- Address and contact details
- Store hours and timezone
- Available services (pharmacy, pickup, delivery)
- Department information

✅ **Product Enhancement**
- Detailed product information
- Category classification
- Pricing and promotional data
- Product images and descriptions

✅ **Analytics & Summary**
- Cart statistics and analytics
- Category breakdown
- Top items analysis
- Estimated totals

✅ **Search & Discovery**
- Product search functionality
- Quick-add interface
- Smart product matching

✅ **Error Handling**
- Comprehensive error messages
- Authentication validation
- Graceful fallbacks

This SmashCart API provides everything needed for comprehensive Kroger cart management with rich store and product information.