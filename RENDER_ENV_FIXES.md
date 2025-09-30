# Critical Environment Variables to Update on Render

## MUST CHANGE on Render Dashboard:

### 1. **PORT**
- Current: `3001`
- **CHANGE TO: `10000`**
- Render expects port 10000 for web services

### 2. **NODE_ENV**
- Current: `development`
- **CHANGE TO: `production`**
- This enables production optimizations

### 3. **CLIENT_URL** (Optional but recommended)
- Current: `https://cart-smash.vercel.app`
- Consider: `https://www.cartsmash.com` (if that's your primary domain)

## Your Settings That Are Correct ✅:

- ✅ MongoDB URI is set
- ✅ Firebase credentials are complete
- ✅ API keys for Spoonacular, Instacart are present
- ✅ CORS origins include your Vercel URLs

## After Making These Changes:

1. Click "Save Changes" in Render dashboard
2. Render will automatically redeploy the service
3. Wait 2-3 minutes for the deployment to complete
4. Check the Render logs to ensure server starts on port 10000

## To Verify It's Working:

Visit: https://cartsmash-api.onrender.com/api/health

You should see a response indicating the server is running.

## Common Issues:

If you still see 503 errors after these changes:
1. Check Render logs for startup errors
2. Verify MongoDB connection (might need to whitelist Render's IP)
3. Ensure all Firebase credentials are valid

The server MUST listen on the PORT environment variable that Render provides (10000).