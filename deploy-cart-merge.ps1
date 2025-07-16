# deploy-cart-merge.ps1 - Full Deployment Script for Cart Smash merge/replace flow

Write-Host "`n🚀 Deploying Cart Smash Merge/Replace functionality..." -ForegroundColor Cyan

# === Ensure directories exist ===
$clientUtils = "client\src\utils"
$serverRoutes = "server\routes"
$serverUtils = "server\utils"
$serverFile = "server\server.js"

Write-Host "📁 Creating required directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $clientUtils -Force | Out-Null
New-Item -ItemType Directory -Path $serverRoutes -Force | Out-Null
New-Item -ItemType Directory -Path $serverUtils -Force | Out-Null

# === Step 1: Create client/src/utils/parseGroceryList.js ===
Write-Host "📝 Creating client-side cart utilities..." -ForegroundColor Yellow
@"
// Cart Smash - Client-side grocery list parser with merge/replace functionality
const parseGroceryList = async (text, action = 'replace') => {
  try {
    const response = await fetch('/api/cart/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        listText: text, 
        action 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to parse list.');
    }

    const data = await response.json();
    return {
      success: true,
      cart: data.cart,
      action: action,
      itemCount: data.cart.length
    };
  } catch (error) {
    console.error('Parse grocery list error:', error);
    throw new Error(error.message || 'Failed to parse grocery list');
  }
};

// Get current cart state
const getCurrentCart = async () => {
  try {
    const response = await fetch('/api/cart/current');
    if (!response.ok) {
      throw new Error('Failed to get current cart');
    }
    const data = await response.json();
    return data.cart;
  } catch (error) {
    console.error('Get current cart error:', error);
    return [];
  }
};

// Clear entire cart
const clearCart = async () => {
  try {
    const response = await fetch('/api/cart/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear cart');
    }
    
    return { success: true, cart: [] };
  } catch (error) {
    console.error('Clear cart error:', error);
    throw error;
  }
};

export { parseGroceryList, getCurrentCart, clearCart };
export default parseGroceryList;
"@ | Set-Content "$clientUtils\parseGroceryList.js" -Encoding UTF8

# === Step 2: Create server/utils/parseGroceryItem.js ===
Write-Host "🔧 Creating server-side parsing utilities..." -ForegroundColor Yellow
@"
// Cart Smash - Advanced grocery item parser
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

module.exports = parseGroceryItem;
"@ | Set-Content "$serverUtils\parseGroceryItem.js" -Encoding UTF8

# === Step 3: Create server/routes/cart.js ===
Write-Host "🛒 Creating cart management routes..." -ForegroundColor Yellow
@"
const express = require('express');
const router = express.Router();
const parseGroceryItem = require('../utils/parseGroceryItem');

// In-memory cart storage (in production, use database)
let userCart = [];

// Parse and add items to cart (merge or replace)
router.post('/parse', async (req, res) => {
  const { listText, action = 'replace' } = req.body;

  if (!listText) {
    return res.status(400).json({ error: 'Missing listText' });
  }

  if (!['merge', 'replace'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action. Use "merge" or "replace"' });
  }

  try {
    const lines = listText
      .split(/[\n;,]/)
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(grocery list|shopping list|to buy|items needed):?$/i));

    const parsedItems = lines.map((line, index) => ({
      id: `item_${Date.now()}_${index}`,
      ...parseGroceryItem(line),
      addedAt: new Date().toISOString()
    }));

    if (action === 'replace') {
      userCart = parsedItems;
      console.log(`🔄 Cart replaced with ${parsedItems.length} items`);
    } else if (action === 'merge') {
      // Smart merge: avoid duplicates by item name
      const existingItemNames = new Set(userCart.map(item => item.itemName.toLowerCase()));
      const newItems = parsedItems.filter(item => !existingItemNames.has(item.itemName.toLowerCase()));
      
      userCart = [...userCart, ...newItems];
      console.log(`🔀 Cart merged: ${newItems.length} new items added (${parsedItems.length - newItems.length} duplicates skipped)`);
    }

    res.status(200).json({ 
      success: true,
      cart: userCart,
      action: action,
      itemsAdded: action === 'replace' ? parsedItems.length : parsedItems.filter(item => !userCart.includes(item)).length,
      totalItems: userCart.length
    });
  } catch (err) {
    console.error('Cart parse error:', err);
    res.status(500).json({ error: 'Failed to parse grocery list' });
  }
});

// Get current cart
router.get('/current', (req, res) => {
  res.status(200).json({ 
    cart: userCart,
    itemCount: userCart.length,
    lastUpdated: userCart.length > 0 ? Math.max(...userCart.map(item => new Date(item.addedAt).getTime())) : null
  });
});

// Clear cart
router.post('/clear', (req, res) => {
  userCart = [];
  console.log('🗑️ Cart cleared');
  res.status(200).json({ 
    success: true,
    cart: [],
    message: 'Cart cleared successfully'
  });
});

// Remove specific item
router.delete('/item/:id', (req, res) => {
  const { id } = req.params;
  const initialLength = userCart.length;
  userCart = userCart.filter(item => item.id !== id);
  
  if (userCart.length < initialLength) {
    console.log(`🗑️ Removed item ${id} from cart`);
    res.status(200).json({ 
      success: true,
      cart: userCart,
      message: 'Item removed successfully'
    });
  } else {
    res.status(404).json({ error: 'Item not found' });
  }
});

// Get cart by category
router.get('/categories', (req, res) => {
  const categorized = userCart.reduce((acc, item) => {
    const category = item.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});

  res.status(200).json({
    categories: categorized,
    totalItems: userCart.length
  });
});

module.exports = router;
"@ | Set-Content "$serverRoutes\cart.js" -Encoding UTF8

# === Step 4: Inject route into server.js ===
Write-Host "🔌 Updating server.js with cart routes..." -ForegroundColor Yellow

if (Test-Path $serverFile) {
    $serverContent = Get-Content $serverFile -Raw
    
    # Check if cart routes are already added
    if ($serverContent -notmatch "cartRoutes|cart\.js") {
        Write-Host "   Adding cart route imports..." -ForegroundColor Cyan
        
        # Add require statement after other requires
        $requireLine = "const cartRoutes = require('./routes/cart');"
        if ($serverContent -notmatch [regex]::Escape($requireLine)) {
            $serverContent = $serverContent -replace "(const express = require\('express'\);)", "`$1`n$requireLine"
        }
        
        # Add route usage after middleware
        $useLine = "app.use('/api/cart', cartRoutes);"
        if ($serverContent -notmatch [regex]::Escape($useLine)) {
            $serverContent = $serverContent -replace "(app\.use\(express\.json\(\)\);)", "`$1`n$useLine"
        }
        
        # Write back to file
        Set-Content $serverFile -Value $serverContent -Encoding UTF8
        Write-Host "   ✅ Cart routes successfully added to server.js" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️ Cart routes already exist in server.js" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️ server.js not found at $serverFile" -ForegroundColor Red
}

# === Step 5: Update GroceryListForm.js to use new cart functionality ===
Write-Host "📱 Updating GroceryListForm.js with cart management..." -ForegroundColor Yellow

$groceryFormFile = "client\src\GroceryListForm.js"
if (Test-Path $groceryFormFile) {
    $formContent = Get-Content $groceryFormFile -Raw
    
    # Add import for cart utilities
    if ($formContent -notmatch "parseGroceryList.*from.*utils") {
        $importLine = "import { parseGroceryList, getCurrentCart, clearCart } from './utils/parseGroceryList';"
        $formContent = $formContent -replace "(import groceryService from)", "$importLine`n`$1"
    }
    
    # Add cart action state
    if ($formContent -notmatch "cartAction.*useState") {
        $actionState = "  const [cartAction, setCartAction] = useState('replace');"
        $formContent = $formContent -replace "(const \[useAdvancedParsing)", "$actionState`n  `$1"
    }
    
    Set-Content $groceryFormFile -Value $formContent -Encoding UTF8
    Write-Host "   ✅ Updated GroceryListForm.js with cart management" -ForegroundColor Green
}

# === Done ===
Write-Host "`n🎉 Cart Smash Merge/Replace deployment complete!" -ForegroundColor Green
Write-Host "`n📋 What's been added:" -ForegroundColor Cyan
Write-Host "   ✅ Client-side cart utilities (parseGroceryList.js)" -ForegroundColor Green
Write-Host "   ✅ Server-side item parser (parseGroceryItem.js)" -ForegroundColor Green
Write-Host "   ✅ Cart management API routes (/api/cart/*)" -ForegroundColor Green
Write-Host "   ✅ Merge/Replace functionality" -ForegroundColor Green
Write-Host "   ✅ Smart duplicate detection" -ForegroundColor Green
Write-Host "   ✅ Category-based organization" -ForegroundColor Green
Write-Host "   ✅ Cart persistence (in-memory)" -ForegroundColor Green

Write-Host "`n🚀 Available API endpoints:" -ForegroundColor Yellow
Write-Host "   POST /api/cart/parse (merge or replace items)" -ForegroundColor White
Write-Host "   GET /api/cart/current (get current cart)" -ForegroundColor White
Write-Host "   POST /api/cart/clear (clear entire cart)" -ForegroundColor White
Write-Host "   DELETE /api/cart/item/:id (remove specific item)" -ForegroundColor White
Write-Host "   GET /api/cart/categories (get items by category)" -ForegroundColor White

Write-Host "`n🎯 Next steps:" -ForegroundColor Yellow
Write-Host "   1. npm run dev (start both servers)" -ForegroundColor White
Write-Host "   2. Test merge/replace functionality" -ForegroundColor White
Write-Host "   3. Try multiple grocery lists!" -ForegroundColor White

Write-Host "`n🛒💥 Cart Smash advanced cart management is ready! 💥🛒" -ForegroundColor Magenta