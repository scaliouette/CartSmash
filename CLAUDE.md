# CartSmash Development Documentation

Essential development information for Claude Code.

## 🚀 Production

- **Frontend**: https://www.cartsmash.com (Vercel)
- **Backend**: https://cartsmash-api.onrender.com (Render)
- **Admin**: scaliouette@gmail.com

## 📁 Critical Files

- Cart Parser: `server/routes/cart.js`
- Admin Dashboard: `client/src/components/AdminDashboard.js`
- Shopping List: `client/src/components/InstacartShoppingList.js`

## ⚠️ Critical Rules

**CORS - MANDATORY FOR ALL NEW ENDPOINTS:**
- Test cross-origin from production
- Verify OPTIONS preflight
- Check Access-Control-Allow-Origin headers
- Test with authentication headers

**Security:**
- Logger must be initialized before use (server.js:23)
- All data endpoints require `authenticateUser` middleware
- Never hardcode localhost URLs - use environment variables
- Never commit API keys

**Production Checklist:**
- [ ] CORS verified from production
- [ ] Authentication on endpoints
- [ ] Environment variables (not localhost)
- [ ] No console.log statements
- [ ] Logger initialized properly

## 🔐 Auth Middleware Pattern

```javascript
router.post('/endpoint',
  authenticateUser,           // Firebase auth
  preventNoSQLInjection,      // MongoDB sanitization
  validateRequestBody(),       // XSS prevention
  async (req, res) => {...}
);
```

## 🔧 Environment Variables

**Required:** `MONGODB_URI`, `JWT_SECRET`

**Optional:** Firebase, API keys (OpenAI, Anthropic, Spoonacular, Instacart)

## 📊 Current Status (2025-09-30)

- ✅ Security: Auth, validation active
- ✅ Caching: 24hr products, 7-day recipes
- ✅ Logging: Winston operational
- ❌ **AI Services: DISABLED** (billing stopped)
- ❌ **Agent System: DISABLED** (overhead reduction)
- ⚠️ Firebase: Sample data fallback when SDK not configured

---

**For detailed documentation, see `CLAUDE-FULL.md`**