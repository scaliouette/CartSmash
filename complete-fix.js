// complete-fix.js - Run this to fix all development issues
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting HulkCart Complete Development Fix...\n');

// 1. Fix client package.json port configuration
console.log('📦 Fixing client package.json...');
const clientPackageJson = {
  "name": "hulkcart-client",
  "version": "1.0.0",
  "private": true,
  "description": "HulkCart frontend - AI-powered grocery list converter",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:3001"
};

fs.writeFileSync(
  path.join(__dirname, 'client', 'package.json'),
  JSON.stringify(clientPackageJson, null, 2)
);

// 2. Update client API service to use correct port
console.log('🔧 Updating client API service...');
const apiServiceContent = `// api/groceryService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class GroceryService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = \`\${this.baseURL}\${endpoint}\`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || \`HTTP error! status: \${response.status}\`);
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running on port 3001.');
      }
      throw error;
    }
  }

  async checkHealth() {
    return this.request('/health');
  }

  async parseGroceryList(listText) {
    return this.request('/api/grocery-list/parse', {
      method: 'POST',
      body: JSON.stringify({ listText }),
    });
  }

  async parseGroceryListAdvanced(listText, options = {}) {
    return this.request('/api/grocery-list/parse-advanced', {
      method: 'POST',
      body: JSON.stringify({ listText, options }),
    });
  }

  async searchInstacart(query, limit = 5) {
    return this.request('/api/instacart/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  validateGroceryList(listText) {
    if (!listText || typeof listText !== 'string') {
      return {
        valid: false,
        error: 'List cannot be empty'
      };
    }

    const trimmed = listText.trim();
    if (trimmed.length === 0) {
      return {
        valid: false,
        error: 'List cannot be empty'
      };
    }

    const lines = trimmed.split('\\n').filter(line => line.trim());
    if (lines.length === 0) {
      return {
        valid: false,
        error: 'No valid items found in the list'
      };
    }

    if (lines.length > 100) {
      return {
        valid: false,
        error: 'List is too long (maximum 100 items)'
      };
    }

    return {
      valid: true,
      lineCount: lines.length
    };
  }
}

const groceryService = new GroceryService();
export { GroceryService, groceryService as default };`;

// Create client api directory if it doesn't exist
const clientApiDir = path.join(__dirname, 'client', 'src', 'api');
if (!fs.existsSync(clientApiDir)) {
  fs.mkdirSync(clientApiDir, { recursive: true });
}

fs.writeFileSync(
  path.join(clientApiDir, 'groceryService.js'),
  apiServiceContent
);

// 3. Update server with enhanced parsing capabilities
console.log('🚀 Updating server with enhanced parsing...');
const enhancedServerContent = `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Enhanced grocery parsing function
function parseGroceryItem(line) {
  let cleaned = line.trim()
    .replace(/^[-*•·◦▪▫◆◇→➤➢>]\\s*/, '')
    .replace(/^\\d+\\.\\s*/, '')
    .replace(/^[a-z]\\)\\s*/i, '')
    .trim();

  const quantityPatterns = [
    /(\\d+(?:\\.\\d+)?)\\s*(lb|lbs|pound|pounds|oz|ounce|ounces|kg|kilogram|kilograms|g|gram|grams)/i,
    /(\\d+(?:\\.\\d+)?)\\s*(l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons)/i,
    /(\\d+(?:\\.\\d+)?)\\s*(cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons)/i,
    /(\\d+)\\s*(pack|packs|package|packages|bag|bags|box|boxes|can|cans|jar|jars|bottle|bottles)/i,
    /(\\d+)\\s*(dozen|doz)/i,
    /(\\d+)\\s+(.+)/,
    /(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\\s+(.+)/i,
    /(\\d+\\/\\d+)\\s+(.+)/,
    /(\\d+\\s+\\d+\\/\\d+)\\s+(.+)/,
  ];

  let quantity = null;
  let unit = null;
  let itemName = cleaned;

  for (const pattern of quantityPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      quantity = match[1];
      if (match[2]) {
        const unitMatch = match[2].match(/^(lb|lbs|pound|pounds|oz|ounce|ounces|kg|kilogram|kilograms|g|gram|grams|l|liter|liters|ml|milliliter|milliliters|gal|gallon|gallons|cup|cups|tbsp|tablespoon|tablespoons|tsp|teaspoon|teaspoons|pack|packs|package|packages|bag|bags|box|boxes|can|cans|jar|jars|bottle|bottles|dozen|doz)s?\\s*(.*)$/i);
        
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
    message: 'HulkCart API is running! 💚',
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
      .split('\\n')
      .filter(line => line.trim())
      .map((line, index) => ({
        id: \`item_\${Date.now()}_\${index}\`,
        original: line.trim(),
        itemName: line.replace(/^[-*•]\\s*/, '').trim()
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
      .split(/[\\n;,]/)
      .map(line => line.trim())
      .filter(line => line && !line.match(/^(grocery list|shopping list|to buy|items needed):?$/i));

    const items = lines.map((line, index) => ({
      id: \`item_\${Date.now()}_\${index}\`,
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
        id: \`mock_\${Date.now()}_1\`,
        name: query,
        price: (Math.random() * 10 + 1).toFixed(2),
        unit: 'each',
        inStock: Math.random() > 0.2,
        imageUrl: \`https://via.placeholder.com/150?text=\${encodeURIComponent(query)}\`
      },
      {
        id: \`mock_\${Date.now()}_2\`,
        name: \`Organic \${query}\`,
        price: (Math.random() * 15 + 5).toFixed(2),
        unit: 'each',
        inStock: Math.random() > 0.1,
        imageUrl: \`https://via.placeholder.com/150?text=Organic+\${encodeURIComponent(query)}\`
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
  console.log(\`
    💚 HulkCart Server SMASH into action! 💚
    🚀 Server running on http://localhost:\${PORT}
    📡 Ready to parse grocery lists...
  \`);
});`;

fs.writeFileSync(
  path.join(__dirname, 'server', 'server.js'),
  enhancedServerContent
);

// 4. Update root package.json
console.log('📋 Updating root package.json scripts...');
const rootPackageJson = {
  "name": "hulkcart",
  "version": "1.0.0",
  "description": "AI-powered grocery list converter for Instacart",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "cd server && npm run dev",
    "client:dev": "cd client && npm start",
    "install:all": "npm install && cd server && npm install && cd client && npm install",
    "build": "cd client && npm run build",
    "start": "cd server && npm start",
    "test": "npm run test:server && npm run test:client",
    "test:server": "cd server && npm test",
    "test:client": "cd client && npm test",
    "clean": "rm -rf node_modules server/node_modules client/node_modules",
    "fresh-install": "npm run clean && npm run install:all"
  },
  "devDependencies": {
    "concurrently": "^7.6.0"
  },
  "workspaces": [
    "client",
    "server"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/hulkcart.git"
  },
  "keywords": [
    "grocery",
    "instacart",
    "ai",
    "shopping",
    "list",
    "parser"
  ],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=14.0.0",
    "npm": ">=6.0.0"
  }
};

fs.writeFileSync(
  path.join(__dirname, 'package.json'),
  JSON.stringify(rootPackageJson, null, 2)
);

// 5. Update .env file with correct ports
console.log('🔧 Setting up environment variables...');
const envContent = `# HulkCart Environment Variables
NODE_ENV=development
PORT=3001

# Client Configuration
REACT_APP_API_URL=http://localhost:3001

# Database (for future use)
DATABASE_URL=postgresql://user:password@localhost:5432/hulkcart

# Redis (for future use)
REDIS_URL=redis://localhost:6379

# Instacart API (for future use)
INSTACART_API_KEY=your_api_key_here
INSTACART_ENV=development

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# External Services
OPENAI_API_KEY=optional_for_enhanced_matching
SENTRY_DSN=your_sentry_dsn_here

# Frontend URL
CLIENT_URL=http://localhost:3000
`;

fs.writeFileSync(path.join(__dirname, '.env'), envContent);

// 6. Create a simple client index.css
console.log('🎨 Creating client styles...');
const clientStyles = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f5;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}

button:hover {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

* {
  box-sizing: border-box;
}
`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'index.css'),
  clientStyles
);

// 7. Update client index.js to include styles
console.log('📱 Updating client index.js...');
const clientIndexContent = `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

fs.writeFileSync(
  path.join(__dirname, 'client', 'src', 'index.js'),
  clientIndexContent
);

// 8. Create development startup script
console.log('🚀 Creating development startup script...');
const startupScript = `#!/bin/bash
# start-dev.sh - Development startup script

echo "🛒 Starting HulkCart Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies if not already installed
if [ ! -d "node_modules" ] || [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm run install:all
fi

# Start development servers
echo "🚀 Starting development servers..."
echo "   Server: http://localhost:3001"
echo "   Client: http://localhost:3000"
echo ""
echo "💚 HulkCart is ready to SMASH through grocery lists!"
echo ""

npm run dev
`;

fs.writeFileSync(path.join(__dirname, 'start-dev.sh'), startupScript);

// Make the script executable (Unix systems)
try {
  fs.chmodSync(path.join(__dirname, 'start-dev.sh'), '755');
} catch (err) {
  console.log('ℹ️  Note: Could not make start-dev.sh executable. Run: chmod +x start-dev.sh');
}

console.log('✨ Complete HulkCart Development Fix Applied!');
console.log('');
console.log('🎯 Next Steps:');
console.log('1. Run: npm run install:all');
console.log('2. Run: npm run dev');
console.log('3. Open http://localhost:3000 for the client');
console.log('4. Server API available at http://localhost:3001');
console.log('');
console.log('🚀 Alternative: Run ./start-dev.sh for automated startup');
console.log('');
console.log('🔧 Configuration Summary:');
console.log('   • Server: Port 3001 (Enhanced parsing & mock Instacart API)');
console.log('   • Client: Port 3000 (Advanced UI with InstacartIntegration)');
console.log('   • Proxy: Client automatically proxies API calls to server');
console.log('   • Environment: Development mode with mock data');
console.log('');
console.log('💚 HulkCart is ready to SMASH through grocery lists!');