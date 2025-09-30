# CartSmash Development Documentation (Full)

Complete development reference documentation.

## 🚀 Quick Start

### Production URLs
- **Frontend**: `https://www.cartsmash.com` (Vercel)
- **Backend API**: `https://cartsmash-api.onrender.com` (Render)
- **Admin User**: `scaliouette@gmail.com`

### Brand Colors
- **Primary Orange**: `#FB4F14`
- **Primary Navy**: `#002244`
- **Light Orange**: `#FFD4C4`
- **Light Blue**: `#7B9AC8`
- **Orange Tint**: `#FFF5F0`
- **Blue Tint**: `#E6EBF2`

### Critical Files
- **Core Processing**: `client/src/components/GroceryListForm.js`
- **Shopping Cart**: `client/src/components/InstacartShoppingList.js`
- **Admin Dashboard**: `client/src/components/AdminDashboard.js`
- **AI Integration**: `client/src/services/aiMealPlanService.js`
- **Cart Parser**: `server/routes/cart.js` → `/api/cart/parse`
- **Agent System**: `server/services/agentAuditService.js` (DISABLED)
- **Agent Chat**: `client/src/components/AgentChatInterface.js` (DISABLED)
- **Work Journal**: `client/src/components/AgentWorkJournal.js` (DISABLED)

---

## 🏗️ System Architecture

### Data Flow
```
User Input → Authentication → Validation → Parse → Spoonacular Search → Enrich → Instacart Cart → Checkout
```

### Cart Item Structure
```javascript
{
  id: 'unique-id',
  productName: 'Milk',
  quantity: 1,        // Number of items
  size: '16 oz',      // Size per item
  unit: 'each',       // Pricing unit
  price: 4.99,        // Price per unit
}
```

### Service Layer Components
- **Authentication**: Firebase Auth → middleware → session
- **Product Data**: Spoonacular API (primary source) - DISABLED
- **Checkout**: Instacart API (cart creation only) - DISABLED
- **Caching**: 24hr products, 7-day recipes
- **Logging**: Winston (server), debugService (client)

---

## 🔌 API Integrations (CURRENTLY DISABLED)

### Spoonacular API (Product Data)
```bash
SPOONACULAR_API_KEY=8d19259c6b764d38b6cc0b72396131ae
# Limit: 50 requests/day (free tier)
```
- **Purpose**: Product search, enrichment, nutrition, images
- **Cache**: 24 hours for products, 7 days for recipes
- **Fallback**: Auto-activates when Instacart returns no data
- **Status**: DISABLED to stop billing

### Instacart API (Checkout)
```bash
INSTACART_API_KEY=keys.T6Kz2vkdBirIEnR-FzOCCtlfyDc-C19u0jEN2J42DzQ
```
- **Purpose**: Create shopping carts, recipe bundles, user redirect
- **Important**: We SEND data to Instacart, don't receive product data
- **Compliance**: No scraping, official API only
- **Status**: DISABLED to stop billing

### AI Services
- **OpenAI**: Meal planning, recipe generation - DISABLED
- **Anthropic**: Advanced parsing, dietary preferences - DISABLED
- **Google AI**: Fallback service - DISABLED

---

## 🔐 Security & Authentication

### Firebase Configuration
```javascript
// Required environment variables
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=
```
**Note**: Firebase Admin SDK requires these env vars. Without them, user management falls back to sample data.

### Authentication Middleware Stack
```javascript
router.post('/endpoint',
  authenticateUser,           // Firebase auth
  preventNoSQLInjection,      // MongoDB sanitization
  validateRequestBody(),       // XSS prevention
  async (req, res) => {...}
);
```

### Admin Access
- Admin emails defined in `server/middleware/adminAuth.js`
- Required for: Analytics, user management, monitoring

### CORS Configuration
```javascript
const corsOptions = {
  origin: [
    'https://www.cartsmash.com',
    'https://cartsmash.com',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
};
```

---

## ⚠️ Critical Development Guidelines

### CORS Verification Required
**MANDATORY**: Verify CORS with EVERY new endpoint or API connection
- Test cross-origin requests from production
- Verify OPTIONS preflight handling
- Check Access-Control-Allow-Origin headers
- Test with authentication headers

### High-Risk Areas
1. **Logger Initialization**: Must be defined before use (server.js:23)
2. **API Keys**: Never commit to repository
3. **Auth Middleware**: All data endpoints must be protected
4. **URL Configuration**: Use environment variables, no hardcoded localhost

### Production Checklist
- [ ] All localhost URLs replaced with production URLs
- [ ] Environment variables configured
- [ ] CORS settings verified
- [ ] Authentication on all endpoints
- [ ] No console.log statements
- [ ] Winston logger properly initialized

---

## 🔧 Environment Variables

### Required for Production
```bash
# Database
MONGODB_URI=

# Authentication
JWT_SECRET=

# Firebase (Required for user management)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# APIs (CURRENTLY DISABLED)
INSTACART_API_KEY=
SPOONACULAR_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=

# Application
NODE_ENV=production
LOG_LEVEL=info
CLIENT_URL=https://www.cartsmash.com
```

---

## 🤖 AI Agent System (DISABLED)

### Agent Hierarchy
```
Chief AI Officer (CAO)
├── Development Manager (DevLead)
│   ├── Dashboard Improvement Agent (Dash)
│   ├── API Integration Specialist (API Master)
│   └── Grocery Parser (Parser)
├── Security Manager
│   ├── Security Auditor (SecOps)
│   └── CORS Validator (CORS Guard)
└── Performance Manager
    ├── Performance Optimizer (Speedy)
    ├── Error Monitor (Watchdog)
    └── Cache Manager (Cache Master)
```

### Agent Features (Disabled)
- **Real-time Chat**: Slack-style communication between agents
- **Work Journal**: Complete audit trail of all agent actions
- **Work Review**: Approval workflows for critical changes
- **Enhanced Logging**: Multi-format copy (GitHub, JSON, CSV, Markdown)
- **Audit Service**: Blockchain-style immutable audit trail

### Agent API Endpoints (Disabled)
```bash
POST /api/agent/chat/message       # Send chat message
GET  /api/agent/chat/history       # Get chat history
GET  /api/agent/work/journal       # Get work entries
POST /api/agent/work/review        # Submit work review
GET  /api/agent/audit/trail        # Get audit trail
POST /api/agent/audit/export       # Export audit reports
```

### WebSocket Events (Disabled)
- `agent:chat:message` - Real-time messaging
- `agent:status:update` - Live status updates
- `agent:work:entry` - Work notifications
- `agent:audit:event` - Audit events

### Agent Documentation
- **Setup Guide**: `.claude/agents/environment-setup.md`
- **Agent Configs**: `.claude/agents/[agent-name].md`
- **API Reference**: `/api/agent/docs`

---

## 📊 Current Status

### System Health
- **Security**: Authentication, validation, audit logging active
- **Performance**: Caching enabled, rate limiting configured
- **Monitoring**: Winston logging, error tracking operational
- **Firebase Users**: Shows sample data when SDK not configured
- **AI Services**: DISABLED (billing stopped 2025-09-30)
- **Agent System**: DISABLED (overhead reduction 2025-09-30)
- **WebSocket Server**: DISABLED (overhead reduction 2025-09-30)

### Known Issues
- Firebase Admin SDK requires env vars for real user data
- Some search endpoints need frontend auth token improvements
- AI-powered features unavailable while services disabled
- Agent system unavailable while disabled

### Feature Flags
Located in `client/src/config/features.js`
- Core: INTELLIGENT_PARSING, PRODUCT_VALIDATION, REAL_TIME_PRICING
- Advanced: ANALYTICS_DASHBOARD, PARSING_DEMO
- Experimental: MACHINE_LEARNING_FEEDBACK, VOICE_INPUT

---

## 📚 Additional Documentation

- **API Documentation**: See `API_DOCUMENTATION.md` for complete endpoint reference
- **Deployment Guide**: See `DEPLOYMENT.md` for production setup
- **Testing**: Run `npm test` in client/server directories
- **Minimal Docs**: See `CLAUDE.md` for essential quick reference

---

## 🗂️ Fix History Archive

### Major Fixes Implemented (September 2025)
- **Logger Initialization** (09-25): Fixed server crash, moved logger before usage
- **Console Cleanup** (09-25): Removed 596+ console.log statements
- **Security Hardening** (09-25): Added auth to all endpoints, input validation
- **Firebase Users** (09-30): Added sample data fallback when SDK not configured
- **Admin Dashboard** (09-30): Fixed memory display, error logging, external services
- **Shopping List UI** (09-27): Fixed quantity display, mobile controls, price display
- **CORS Headers** (09-27): Fixed auth middleware CORS responses
- **AI Meal Plans** (09-27): Fixed parser initialization errors
- **Agent System Disabled** (09-30): Commented out all agent routes, WebSocket, audit service
- **API Billing Stopped** (09-30): Disabled OpenAI, Anthropic, Google AI, Spoonacular, Instacart

### Route Status
- ✅ `/api/cart/parse`: Fixed and operational
- ✅ `/api/analytics/*`: Loading with admin auth
- ✅ Image proxy working for Spoonacular
- ❌ `/api/ai/*`: DISABLED (billing stopped)
- ❌ `/api/agent/*`: DISABLED (overhead reduction)
- ❌ `/api/spoonacular/*`: DISABLED (billing stopped)
- ❌ `/api/instacart/*`: DISABLED (billing stopped)

---

*Last Updated: 2025-09-30*
*Status: Production - AI Services & Agent System Disabled*