# Production Deployment Fix Guide

## Issues Identified
1. ⚠️ Instacart API keys not configured in production
2. 🔑 Environment variables not set on Vercel/Render
3. 🔥 Firebase duplicate app initialization error
4. 🚨 JavaScript files failing to load

## Fixed Issues
✅ **Firebase Configuration**: Updated both `client/src/firebase/config.js:17` and `client/src/firebase.js:73` with singleton pattern to prevent duplicate app errors

✅ **Manifest Icons**: Removed missing logo references from `client/public/manifest.json` to prevent 404 errors

## Required Actions

### 1. Update Vercel Environment Variables (Client)
```bash
# Go to Vercel Dashboard → CartSmash Project → Settings → Environment Variables
# Add these variables:

REACT_APP_INSTACART_API_KEY=keys.l02AgO_0upmAHr_0NYQ8y_ejdYrBepMw55HqcUeePBU
REACT_APP_INSTACART_CATALOG_API_KEY=keys.eRRq-GgY2ri6Yp6x8LTS9sCqlW16LqkEMFZ7jYZ9A74
REACT_APP_INSTACART_CONNECT_API_KEY=keys.T6Kz2vkdBirIEnR-FzOCCtlfyDc-C19u0jEN2J42DzQ
REACT_APP_API_URL=https://cartsmash-api.onrender.com

# Firebase Variables (if using real Firebase):
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 2. Update Render Environment Variables (Server)
```bash
# Go to Render Dashboard → CartSmash API Service → Environment → Environment Variables
# Add these variables:

INSTACART_CONNECT_API_KEY=keys.T6Kz2vkdBirIEnR-FzOCCtlfyDc-C19u0jEN2J42DzQ
INSTACART_CATALOG_API_KEY=keys.eRRq-GgY2ri6Yp6x8LTS9sCqlW16LqkEMFZ7jYZ9A74
INSTACART_DEVELOPER_API_KEY=keys.l02AgO_0upmAHr_0NYQ8y_ejdYrBepMw55HqcUeePBU
NODE_ENV=production
PORT=10000

# AI Service Variables:
ANTHROPIC_API_KEY=your-anthropic-api-key

# Firebase Admin Variables (if using):
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### 3. Deployment Steps

#### For Vercel (Client):
1. Go to https://vercel.com/dashboard
2. Find your CartSmash project
3. Go to Settings → Environment Variables
4. Add all REACT_APP_ variables listed above
5. Go to Deployments → Redeploy latest

#### For Render (Server):
1. Go to https://dashboard.render.com/
2. Find your CartSmash API service
3. Go to Environment → Environment Variables
4. Add all server variables listed above
5. The service will auto-redeploy

### 4. Test Production Deployment

After updating environment variables, test these URLs:

**Client**: https://cart-smash.vercel.app
- Should not show "API key not configured" warnings
- Firebase should initialize without errors
- Instacart integration should work

**Server**: https://cartsmash-api.onrender.com
- Test endpoint: https://cartsmash-api.onrender.com/api/health
- Should return server status

### 5. Verify API Integration

Test Instacart API endpoints:
```bash
# Test catalog search
curl "https://cartsmash-api.onrender.com/api/instacart/search?query=milk"

# Test product resolution
curl -X POST "https://cartsmash-api.onrender.com/api/instacart/resolve-products" \
  -H "Content-Type: application/json" \
  -d '{"items":["milk","bread","eggs"]}'
```

## Alternative: Quick CLI Commands

If you have access to Vercel and Render CLI tools:

```bash
# Vercel CLI
vercel env add REACT_APP_INSTACART_API_KEY
# Enter: keys.l02AgO_0upmAHr_0NYQ8y_ejdYrBepMw55HqcUeePBU

# Repeat for all REACT_APP_ variables
vercel --prod

# Render CLI (if available)
render env set INSTACART_CONNECT_API_KEY keys.T6Kz2vkdBirIEnR-FzOCCtlfyDc-C19u0jEN2J42DzQ
# Repeat for all server variables
```

## Expected Results

After completing these steps:
- ✅ No more "API key not configured" warnings
- ✅ Firebase initializes without duplicate app errors  
- ✅ JavaScript files load properly
- ✅ Instacart product search works with real data
- ✅ Cart creation and checkout flow functions correctly

## Next Phase: Live Integration Testing

Once environment variables are set:
1. Test real Instacart product searches
2. Verify cart item matching with live catalog
3. Test meal plan AI generation
4. Monitor API rate limits and performance