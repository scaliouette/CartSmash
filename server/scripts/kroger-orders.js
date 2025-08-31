// In routes/kroger-orders.js, add this route:
router.get('/auth/status', async (req, res) => {
  const { userId } = req.query;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'userId parameter is required'
    });
  }
  
  try {
    const hasToken = await tokenStore.hasValidToken(userId);
    
    if (hasToken) {
      const tokenInfo = await tokenStore.getTokens(userId);
      res.json({
        success: true,
        userId: userId,
        authenticated: true,
        tokenInfo: {
          expiresAt: tokenInfo.expiresAt,
          scope: tokenInfo.scope
        }
      });
    } else {
      res.json({
        success: true,
        userId: userId,
        authenticated: false,
        tokenInfo: null,
        needsAuth: true
      });
    }
  } catch (error) {
    console.error('Auth status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check authentication status'
    });
  }
});