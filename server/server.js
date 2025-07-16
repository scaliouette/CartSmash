const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

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
    .split('\n')
    .filter(line => line.trim())
    .map((line, index) => ({
      id: `item_${index}`,
      original: line,
      itemName: line.replace(/^[-*•]\s*/, '').trim()
    }));
  
  res.json({
    success: true,
    items,
    itemCount: items.length
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
