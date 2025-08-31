# Vercel Environment Variables Setup Guide

## 🎯 How to Add Environment Variables to Vercel

### Step 1: Go to Vercel Dashboard
1. Visit [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your **CartSmash** project
3. Click on your project

### Step 2: Access Environment Variables
1. Click **Settings** tab
2. Click **Environment Variables** in the sidebar

### Step 3: Add These Variables

**Copy and paste each variable name and value:**

#### Required API Configuration:
```
Variable: NEXT_PUBLIC_API_URL
Value: https://cartsmash-api.onrender.com
Environment: Production, Preview, Development
```

#### Required Firebase Configuration:
```
Variable: NEXT_PUBLIC_FIREBASE_PROJECT_ID
Value: cartsmash-pooda
Environment: Production, Preview, Development
```

```
Variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  
Value: cartsmash-pooda.firebaseapp.com
Environment: Production, Preview, Development
```

```
Variable: NEXT_PUBLIC_FIREBASE_API_KEY
Value: [Your actual Firebase API key - check Firebase Console]
Environment: Production, Preview, Development
```

#### Environment Setting:
```
Variable: NODE_ENV
Value: production
Environment: Production
```

### Step 4: Get Your Real Firebase Config
If you need your actual Firebase configuration:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **cartsmash-pooda** project  
3. Click **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Click on your web app
6. Copy the config values from the `firebaseConfig` object

### Step 5: Redeploy
After adding all variables:
1. Go back to **Deployments** tab
2. Click **Redeploy** on your latest deployment
3. Or push a new commit to trigger automatic deployment

## 🔍 Verification

After deployment, you can verify the variables are working by:
1. Opening browser dev tools (F12)
2. Going to Console tab  
3. Type: `console.log(process.env.NEXT_PUBLIC_API_URL)`
4. Should show: `https://cartsmash-api.onrender.com`

## 🚨 Security Notes

- ✅ `NEXT_PUBLIC_` variables are safe - they're meant to be public
- ❌ Never put secrets (API keys, passwords) in `NEXT_PUBLIC_` variables
- ✅ Firebase config is safe to be public (it's meant for client-side)
- ❌ Don't put backend secrets (JWT_SECRET, DB passwords) in frontend env

## 🎯 Most Important Variable

The **critical** variable that must be set correctly:
```
NEXT_PUBLIC_API_URL=https://cartsmash-api.onrender.com
```

This tells your frontend where to find your backend API.