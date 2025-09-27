// server/routes/imageProxy.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const winston = require('winston');

// Create logger (same configuration as server.js)
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'imageProxy' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Simple in-memory cache for images (TTL: 1 hour)
const imageCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Clean up expired cache entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [url, data] of imageCache.entries()) {
    if (now - data.timestamp > CACHE_TTL) {
      imageCache.delete(url);
    }
  }
}, 10 * 60 * 1000);

/**
 * Proxy endpoint for external images (primarily Spoonacular)
 * Solves CORS issues by fetching images server-side
 */
router.get('/proxy', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL is from allowed domains
    const allowedDomains = [
      'img.spoonacular.com',
      'spoonacular.com',
      'images.spoonacular.com',
      'cdn.spoonacular.com',
      // Instacart domains
      'instacart.com',
      'cdn.instacart.com',
      'images.instacart.com',
      'assets.instacart.com',
      'd1ralsognjng37.cloudfront.net', // Instacart CDN
      'd2lnr5mha7bycj.cloudfront.net', // Instacart product images
      'd2d8wwwkmhfcva.cloudfront.net', // Instacart CDN
      // Common image CDNs and stock photo sites
      'images.unsplash.com',
      'unsplash.com',
      'cdn.jsdelivr.net',
      'i.imgur.com',
      'imgur.com',
      // Allow any cloudfront.net subdomain for CDN flexibility
      'cloudfront.net'
    ];

    const urlObj = new URL(url);
    const isAllowed = allowedDomains.some(domain =>
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      logger.warn(`Image proxy blocked non-allowed domain: ${urlObj.hostname}`);
      return res.status(403).json({ error: 'Domain not allowed for proxy' });
    }

    // Check cache first
    const cached = imageCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      logger.debug(`Image proxy cache hit: ${url}`);
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      res.set('X-Proxy-Cache', 'HIT');
      return res.send(cached.data);
    }

    // Fetch the image
    logger.debug(`Image proxy fetching: ${url}`);
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'CartSmash/1.0 (https://cartsmash.com)'
      }
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const imageBuffer = Buffer.from(response.data);

    // Cache the image
    imageCache.set(url, {
      data: imageBuffer,
      contentType,
      timestamp: Date.now()
    });

    // Send the image
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('X-Proxy-Cache', 'MISS');
    res.send(imageBuffer);

  } catch (error) {
    if (error.response?.status === 404) {
      logger.debug(`Image not found: ${req.query.url}`);
      // Return a transparent 1x1 pixel instead of 404
      const transparentPixel = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        'base64'
      );
      res.set('Content-Type', 'image/png');
      res.set('Cache-Control', 'public, max-age=86400');
      res.send(transparentPixel);
    } else {
      logger.error('Image proxy error:', error.message);
      res.status(500).json({
        error: 'Failed to fetch image',
        message: error.message
      });
    }
  }
});

/**
 * Health check endpoint for image proxy
 */
router.get('/proxy/health', (req, res) => {
  res.json({
    status: 'ok',
    cacheSize: imageCache.size,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;