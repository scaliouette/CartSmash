# 🚀 CartSmash Deployment Guide

## Frontend Deployment (Vercel)

### 1. Manual Steps Required:
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "New Project"
4. Import: `scaliouette/CartSmash`
5. Configure:
   - **Framework**: Create React App
   - **Build Command**: `cd client && npm run build`
   - **Output Directory**: `client/build`
   - **Install Command**: `cd client && npm install`

### 2. Environment Variables (Add to Vercel):
```
REACT_APP_FIREBASE_API_KEY=AIzaSyCbuju5k6KuOM9DTvZLpsRgkyyA4z_iVOk
REACT_APP_FIREBASE_AUTH_DOMAIN=cartsmash-pooda.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://cartsmash-pooda-default-rtdb.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=cartsmash-pooda
REACT_APP_FIREBASE_STORAGE_BUCKET=cartsmash-pooda.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=230149206692
REACT_APP_FIREBASE_APP_ID=1:230149206692:web:bd8255ffc399f24e13ac31
REACT_APP_FIREBASE_MEASUREMENT_ID=G-VG9TG33V5J
REACT_APP_API_URL=https://cartsmash-api.onrender.com
```

## Backend Deployment (Render)

### 1. Manual Redeploy Required:
1. Go to https://dashboard.render.com
2. Find your CartSmash API service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for completion

### 2. Verify Environment Variables:
- `KROGER_OAUTH_SCOPES=cart.basic:rw profile.compact product.compact`
- All other variables from your existing Render setup

## Testing the Complete Flow

Once both are deployed:

1. **Go to your Vercel URL** (will be something like `https://cartsmash-xyz.vercel.app`)
2. **Sign in** to your CartSmash account
3. **Click "🏪 Stores"** in the header
4. **See the authentication page** → Connect to Kroger → Choose Store

## Current Status

✅ **Code pushed to GitHub**
✅ **Vercel configuration ready**
✅ **Render configuration updated**
⏳ **Manual deployments needed**

## Your URLs (once deployed):
- **Frontend**: `https://[your-project].vercel.app`
- **Backend**: `https://cartsmash-api.onrender.com` (needs redeploy)

🎯 **Next Step**: Complete manual deployments on Vercel and Render platforms.