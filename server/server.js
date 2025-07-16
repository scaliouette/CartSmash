const express = require('express');
const cors = require('cors');
const cartRoutes = require('./routes/cart');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/cart', cartRoutes);

// Enhanced grocery parsing function
function parseGroceryItem(line) {
  let cleaned = line.trim()
    .replace(/^[-*•·◦▪▫◆◇→➤➢>]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^[a-z]\)\s*/i, '')
    .trim();

  const quantityPatterns = [
    /(\d+(?:\.\d+)?)\s*(lb|lbs|pound|pounds|oz|ounce|ounces|kg|kilogram|kilograms|g|gram|grams)/i,
    /(\d+(?:\.\d+)?)\s*(l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons)/i,
    /(\d+(?:\.\d+)?)\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons)/i,
    /(\d+)\s*(pack|packs|package|packages|bag|bags|box|boxes|can|cans|jar|jars|bottle|bottles)/i,
    /(\d+)\s*(dozen|doz)/i,
    /(\d+)\s+(.+)/,
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)/i,
    /(\d+\/\d+)\s+(.+)/,
    /(\d+\s+\d+\/\d+)\s+(.+)/,
  ];

  let quantity = null;
  let unit = null;
  let itemName = cleaned;

  for (const pattern of quantityPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      quantity = match[1];
      if (match[2]) {
        const unitMatch = match[2].match(/^(lb|lbs|pound|pounds|oz|ounce|ounces|kg|kilogram|kilograms|g|gram|grams|l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|pack|packs|package|packages|bag|bags|box|boxes|can|cans|jar|jars|bottle|bottles|dozen|doz)s?\s*(.*)$/i);
        
        if (unitMatch) {
          unit = unitMatch[1];
          itemName = unitMatch[2] || match[2];
        } else {
          itemName = match[2];
        }
      }
      break;
    }
  }

  // Determine category
  let category = 'other';
  const itemLower = itemName.toLowerCase();
  
  if (itemLower.match(/milk|cheese|yogurt|butter|cream|eggs/)) category = 'dairy';
  else if (itemLower.match(/bread|bagel|muffin|cake|cookie/)) category = 'bakery';
  else if (itemLower.match(/apple|banana|orange|strawberry|grape|fruit/)) category = 'produce';
  else if (itemLower.match(/carrot|lettuce|tomato|potato|onion|vegetable|salad/)) category = 'produce';
  else if (itemLower.match(/chicken|beef|pork|turkey|fish|salmon|meat/)) category = 'meat';
  else if (itemLower.match(/cereal|pasta|rice|beans|soup|sauce/)) category = 'pantry';
  else if (itemLower.match(/frozen|ice cream/)) category = 'frozen';

  return {
    original: line.trim(),
    itemName: itemName.trim(),
    quantity: quantity,
    unit: unit,
    category: category
  };
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Cart Smash API is running! 💥',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      parse: 'POST /api/grocery-list/parse',
      parseAdvanced: 'POST /api/grocery-list/parse-advanced',
      search: 'POST /api/instacart/search'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

app.post('/api/grocery-list/parse', (req, res) => {
  try {
    const { listText } = req.body;
    
    if (!listText || typeof listText !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid grocery list' 
      });
    }

    const items = listText
      .split('\n')
      .filter(line => line.trim())
      .map((line, index) => ({
        id: `item_${Date.now()}_${index}`,
        original: line.trim(),
        itemName: line.replace(/^[-*•]\s*/, '').trim()
      }));

    res.json({
      success: true,
      items,
      itemCount: items.length,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to parse grocery list' 
    });
  }
});

app.post('/api/grocery-list/parse-advanced', (req, res) => {
  try {
    const { listText, options = {} } = req.body;
    
    if (!listText || typeof listText !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Please provide a valid grocery list' 
      });
    }

    const lines = listText
      .split(/[\n;,]/)
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(grocery list|shopping list|to buy|items needed):?$/i));

    const items = lines.map((line, index) => ({
      id: `item_${Date.now()}_${index}`,
      ...parseGroceryItem(line)
    }));

    let result = {
      success: true,
      items,
      itemCount: items.length,
      timestamp: new Date()
    };

    if (options.groupByCategory) {
      const grouped = items.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      }, {});
      
      result.itemsByCategory = grouped;
      result.categories = Object.keys(grouped);
    }

    res.json(result);
  } catch (error) {
    console.error('Parse error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to parse grocery list' 
    });
  }
});

app.post('/api/instacart/search', (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    // Mock search results for development
    const mockResults = [
      {
        id: `mock_${Date.now()}_1`,
        name: query,
        price: (Math.random() * 10 + 1).toFixed(2),
        unit: 'each',
        inStock: Math.random() > 0.2,
        imageUrl: `https://via.placeholder.com/150?text=${encodeURIComponent(query)}`
      },
      {
        id: `mock_${Date.now()}_2`,
        name: `Organic ${query}`,
        price: (Math.random() * 15 + 5).toFixed(2),
        unit: 'each',
        inStock: Math.random() > 0.1,
        imageUrl: `https://via.placeholder.com/150?text=Organic+${encodeURIComponent(query)}`
      }
    ];

    res.json({
      success: true,
      query,
      results: mockResults,
      resultCount: mockResults.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

app.listen(PORT, () => {
  console.log(`
    💥 Cart Smash Server SMASH into action! 💥
    🚀 Server running on http://localhost:${PORT}
    📡 Ready to parse grocery lists...
  `);
});