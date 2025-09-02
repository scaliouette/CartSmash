# 🧪 CartSmash Authentication Flow Testing Guide

## Once Your Frontend is Deployed

### Step 1: Access Your App
1. Go to your Vercel URL (something like `https://cartsmash-xyz.vercel.app`)
2. Sign in with your Firebase account
3. Verify you see the main CartSmash interface

### Step 2: Test Stores Flow
1. **Click "🏪 Stores"** in the header navigation
2. **You should see**: 3-step progress indicator
   - Step 1: Connect to Kroger (active)
   - Step 2: Choose Your Store (inactive)
   - Step 3: Ready to Shop (inactive)

### Step 3: Test Kroger Authentication
1. **Click "Connect to Kroger"** button
2. **Expected behavior**:
   - Should redirect to Kroger OAuth page
   - You'll authenticate with Kroger
   - Should redirect back to your app
   - Step 1 should show ✓ completed
   - Step 2 should become active

### Step 4: Test Store Selection
1. **Allow location access** when prompted
2. **You should see**: List of nearby Kroger stores with:
   - Store names and addresses
   - Distance from your location
   - Store hours and services
3. **Click on a store** to select it
4. **Expected**: Store gets highlighted as "Selected"

### Step 5: Test Completion
1. **Step 3 should activate** showing "Ready to Shop"
2. **You should see**: 
   - Selected store summary
   - "Start Shopping" button
   - "Change Store" option
3. **Click "Start Shopping"** → Should return to main app

## Troubleshooting

### If Authentication Fails:
- Check browser console for errors
- Verify environment variables are set in Vercel
- Check that backend is responding at https://cartsmash-api.onrender.com/health

### If Store Search Fails:
- Allow location permissions
- Try entering a ZIP code manually
- Check network tab for API calls to `/api/stores`

### If You Get "Raw JSON":
- Make sure you're accessing the Vercel frontend URL, not the Render backend URL
- The backend URL (cartsmash-api.onrender.com) will show JSON
- The frontend URL (your-app.vercel.app) will show the React interface

## Success Indicators ✅
- Kroger authentication completes without errors
- Store list loads with your nearby locations
- Store selection persists (saved to localStorage)
- Complete flow from authentication → store selection → ready to shop