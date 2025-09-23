// setup.js - Run this with: node setup.js
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up HulkCart project structure...\n');

// Create directories
const dirs = [
  'server/src',
  'server/src/routes',
  'server/src/services',
  'client/public',
  'client/src',
  'database',
  'docs'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Create server.js
const serverCode = `const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'HulkCart API is running! 💚',
    endpoints: {
      health: '/health',
      parse: 'POST /api/grocery-list/parse',
      stores: 'GET /api/stores',
      match: 'POST /api/grocery-list/match'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Basic grocery list parsing endpoint
app.post('/api/grocery-list/parse', (req, res) => {
  const { listText } = req.body;
  
  // Simple parsing for now
  const items = listText
    .split('\\n')
    .filter(line => line.trim())
    .map((line, index) => ({
      id: \`item_\${index}\`,
      original: line,
      itemName: line.replace(/^[-*•]\\s*/, '').trim()
    }));
  
  res.json({
    success: true,
    items,
    itemCount: items.length
  });
});

app.listen(PORT, () => {
  console.log(\`✅ Server running on http://localhost:\${PORT}\`);
});
`;

fs.writeFileSync(path.join(__dirname, 'server', 'server.js'), serverCode);
console.log('✅ Created server/server.js');

// Create client index.html
const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%PUBLIC_URL%/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#00D084" />
    <meta name="description" content="AI-powered grocery list converter for Instacart" />
    <title>HulkCart - Smash Through Grocery Lists</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'client', 'public', 'index.html'), indexHtml);
console.log('✅ Created client/public/index.html');

// Create React App.js
const appJs = `import React, { useState } from 'react';

function App() {
  const [groceryList, setGroceryList] = useState('');
  const [parsedItems, setParsedItems] = useState([]);

  const handleParse = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/grocery-list/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listText: groceryList })
      });
      const data = await response.json();
      setParsedItems(data.items);
    } catch (error) {
      console.error('Error parsing list:', error);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: '#00D084', fontSize: '48px' }}>🛒 HulkCart 💚</h1>
        <p style={{ fontSize: '20px', color: '#666' }}>
          Smash through grocery lists with AI power!
        </p>
      </header>

      <div style={{ marginBottom: '20px' }}>
        <h2>Paste Your AI-Generated Grocery List:</h2>
        <textarea
          value={groceryList}
          onChange={(e) => setGroceryList(e.target.value)}
          placeholder="- 2 pounds chicken breast\\n- 1 dozen eggs\\n- Fresh spinach\\n- 3 avocados"
          style={{
            width: '100%',
            height: '200px',
            padding: '10px',
            fontSize: '16px',
            border: '2px solid #ddd',
            borderRadius: '8px'
          }}
        />
        <button
          onClick={handleParse}
          style={{
            marginTop: '10px',
            padding: '12px 24px',
            backgroundColor: '#00D084',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '18px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Parse List
        </button>
      </div>

      {parsedItems.length > 0 && (
        <div>
          <h3>Parsed Items ({parsedItems.length}):</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {parsedItems.map(item => (
              <li key={item.id} style={{
                padding: '10px',
                margin: '5px 0',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px'
              }}>
                ✅ {item.itemName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
`;

fs.writeFileSync(path.join(__dirname, 'client', 'src', 'App.js'), appJs);
console.log('✅ Created client/src/App.js');

// Create React index.js
const indexJs = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

fs.writeFileSync(path.join(__dirname, 'client', 'src', 'index.js'), indexJs);
console.log('✅ Created client/src/index.js');

// Create .env.example
const envExample = `# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hulkcart

# Redis
REDIS_URL=redis://localhost:6379

# Instacart API
INSTACART_API_KEY=your_api_key_here

# Security
JWT_SECRET=your_jwt_secret_here
`;

fs.writeFileSync(path.join(__dirname, '.env.example'), envExample);
console.log('✅ Created .env.example');

// Create .gitignore
const gitignore = `# Dependencies
node_modules/
package-lock.json

# Environment variables
.env
.env.local

# Production builds
dist/
build/

# Logs
logs/
*.log

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
`;

fs.writeFileSync(path.join(__dirname, '.gitignore'), gitignore);
console.log('✅ Created .gitignore');

console.log('\n✨ Setup complete! Now run:');
console.log('1. npm run dev');
console.log('2. Open http://localhost:3001 for the app');
console.log('3. Open http://localhost:3000 for the API\n');