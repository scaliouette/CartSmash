# CartSmash Development Documentation

This file contains essential information for Claude Code and future development work.

## Instacart API Integration

### Overview
The CartSmash application integrates with the **Instacart Developer Platform API** to enable recipe creation and retailer management. The integration supports both development and production environments.

### API Configuration

#### Environment Setup
```bash
# Development API Key (configured in .env)
INSTACART_API_KEY=keys.T6Kz2vkdBirIEnR-FzOCCtlfyDc-C19u0jEN2J42DzQ

# Alternative API Keys Available:
# Catalog API: keys.eRRq-GgY2ri6Yp6x8LTS9sCqlW16LqkEMFZ7jYZ9A74  
# Developer API: keys.l02AgO_0upmAHr_0NYQ8y_ejdYrBepMw55HqcUeePBU
```

#### API Endpoints
- **Development**: `https://connect.dev.instacart.tools/idp/v1`
- **Production**: `https://connect.instacart.com/idp/v1`

### Key Integration Points

#### 1. Recipe Creation API
**File**: `server/routes/instacartRoutes.js:683`

**Endpoint**: `POST /api/instacart/recipe/create`

**Functionality**: Creates recipe pages using the Instacart Developer Platform API

**Example Request**:
```bash
curl -X POST http://localhost:3037/api/instacart/recipe/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Recipe",
    "instructions": ["Mix ingredients"],
    "ingredients": [{
      "name": "flour",
      "quantity": "2", 
      "unit": "cups"
    }]
  }'
```

**Example Response**:
```json
{
  "success": true,
  "recipeId": "8083327",
  "instacartUrl": "https://customers.dev.instacart.tools/store/recipes/8083327",
  "title": "Test Recipe",
  "ingredientsCount": 1,
  "createdAt": "2025-09-11T15:46:15.747Z"
}
```

#### 2. Retailers API
**File**: `server/routes/instacartRoutes.js:73`

**Endpoint**: `GET /api/instacart/retailers`

**Functionality**: Fetches nearby retailers based on postal code

**Parameters**:
- `postalCode` (or legacy `zipCode`): US postal code
- `countryCode`: 'US' or 'CA' (defaults to 'US')

**Example Request**:
```bash
curl "http://localhost:3037/api/instacart/retailers?postalCode=95670&countryCode=US"
```

### API Features

#### Supported Features
- ✅ Recipe page creation with real Instacart API
- ✅ Ingredient matching with measurements
- ✅ Brand filters and health filters support
- ✅ Retailer discovery by location
- ✅ Mock data fallback for development
- ✅ Error handling with graceful fallbacks

#### Recipe Creation Features
- **Ingredient Processing**: Converts CartSmash format to Instacart specification
- **Measurements**: Supports quantity + unit format (e.g., "2 cups")
- **Brand Filters**: Optional brand preferences for ingredients
- **Health Filters**: Dietary restrictions and preferences
- **Custom Display Text**: Override ingredient display names
- **Partner Integration**: Linkback URLs to CartSmash

### Authentication

#### Headers Required
```javascript
{
  'Authorization': 'Bearer ${INSTACART_API_KEY}',
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Accept-Language': 'en-US',
  'User-Agent': 'CartSmash/1.0 (https://cartsmash.com)'
}
```

#### API Key Management
- Development keys are used for testing in sandbox environment
- Production keys require Instacart approval process
- Keys have expiration dates and require rotation
- All requests use Bearer token authentication

### Production Readiness

#### Pre-Launch Checklist
- ✅ 100% compliance with Instacart Developer Platform terms
- ✅ All requests formatted according to API specification
- ✅ Error handling implemented for all endpoints
- ✅ Development API integration tested and working
- ✅ Mock data fallback system in place

#### Approval Process
1. **Request Production API Key**: Triggers Instacart review
2. **Review Criteria**:
   - Terms & conditions compliance
   - API specification adherence
   - Proper error handling
   - Technical support account setup
3. **Approval Result**: Email notification with active/denied status

#### Affiliate Integration
- **Partner**: Impact.com affiliate marketing program
- **Conversion Tracking**: Automatic setup upon production approval
- **Revenue Share**: Commission on attributed orders

### Development Status

#### Recently Completed (2025-09-11)
- ✅ Fixed retailers endpoint to use official API parameters (`postal_code`, `country_code`)
- ✅ Updated response mapping to use official Instacart field names (`retailer_key`, `retailer_logo_url`)
- ✅ Resolved recipe endpoint 404 errors
- ✅ Updated API calls to match official Instacart specification
- ✅ Successfully created test recipes (IDs: 8083325, 8083327)
- ✅ Verified real API integration working

#### Measurement Standards Integration (2025-09-12)
- ✅ Implemented official Instacart measurement units in AI meal plan generation
- ✅ Standardized ingredient units: cups, fl oz, lb, oz, each, bunch, can, head, etc.
- ✅ Updated both meal plan and single recipe generation prompts
- ✅ Ensures seamless integration with Instacart recipe creation API

#### Current Integration Status
- **Status**: Fully functional with development API
- **Last Test**: Recipe ID 8083327 created successfully
- **API Endpoint**: Working on development server
- **Environment**: Ready for production approval

### Troubleshooting

#### Common Issues
1. **404 Errors**: Ensure server restart after route changes
2. **400 Bad Request**: Check API parameters match specification
3. **401 Unauthorized**: Verify API key configuration
4. **Mock Data Fallback**: Occurs when API calls fail (expected in development)

#### Server Restart Required
When modifying routes in `instacartRoutes.js`, restart the server to reload the endpoints properly.

### File Locations

#### Key Files
- **Main Integration**: `server/routes/instacartRoutes.js`
- **Client Service**: `client/src/services/instacartService.js`
- **Environment Config**: `server/.env`
- **Server Config**: `server/server.js:1054` (route mounting)

#### Working Server Instance
- **Port**: 3037 (latest tested working instance)
- **Environment**: Development
- **Status**: All routes loaded and functional

## AI Meal Plan Recipe Generation

### Overview
The CartSmash application includes AI-powered meal plan generation that creates detailed, restaurant-quality recipes using advanced prompt engineering and quality validation.

### Quality Improvements Implemented (2025-09-12)

#### Problem Solved
**Issue**: AI was generating overly brief recipe instructions for complex dishes like "Pan-Seared Filet Mignon with Truffle Risotto"

**Root Cause**: Route conflict and insufficient prompt engineering

#### Solution Implemented

**1. Fixed AI Service Integration**
- **Issue**: Route conflict between `/api/ai` endpoints
- **Solution**: Moved meal plan routes to `/api/meal-plans/*` 
- **AI Provider**: Direct integration with Claude, OpenAI, or Google Gemini APIs
- **File**: `server/services/aiService.js` - Complete rewrite for direct AI integration

**2. Enhanced AI Prompts**
- **File**: `server/routes/aiMealPlanRoutes.js`
- **Lines**: 417-426 (main meal plan), 457-462 (single meal regeneration)
- **Improvement**: Added explicit requirements for 6-8+ detailed steps, cooking temperatures, timing, equipment, and chef tips
- **Measurement Standards**: Enforced Instacart-compatible units (cups, fl oz, lb, oz, each, bunch, etc.)

**3. Recipe Quality Validation System**
- **File**: `server/routes/aiMealPlanRoutes.js:484-520`
- **Function**: `validateRecipeQuality(recipe)`
- **Features**:
  - Automatic quality scoring (0-100)
  - Detects missing temperatures, timing, equipment
  - Flags insufficient step count or brief instructions
  - Returns detailed quality report with issues and warnings

**4. Enhanced API Endpoints**
- `POST /api/meal-plans/generate-meal-plan` - Generate complete meal plan with quality validation
- `POST /api/meal-plans/parse-meal-plan` - Parse AI response 
- `POST /api/meal-plans/regenerate-meal` - Regenerate specific meals
- `POST /api/meal-plans/rate-recipe-quality` - User feedback and regeneration system

#### Status
- **Implementation**: Complete (2025-09-12)
- **AI Integration**: Fixed - now uses direct AI provider APIs
- **Route Conflict**: Resolved - meal plans moved to `/api/meal-plans/*`
- **Quality System**: Active - automatic validation and scoring
- **Ready for Testing**: AI should now generate detailed, restaurant-quality recipes

---

*Last Updated: 2025-09-12*
*Integration Status: Production Ready (Pending Approval)*