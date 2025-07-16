const express = require('express'); 
const cors = require('cors'); 
require('dotenv').config(); 
 
const app = express(); 
const PORT = process.env.PORT || 3000; 
 
// Middleware 
app.use(cors()); 
app.use(express.json()); 
 
// Routes 
app.get('/', (req, res) => { 
  res.json({ message: 'HulkCart API is running!' }); 
}); 
 
app.get('/health', (req, res) => { 
  res.json({ status: 'healthy', timestamp: new Date() }); 
}); 
 
app.post('/api/grocery-list/parse', (req, res) => { 
  const { listText } = req.body; 
  const items = listText.split('\n').filter(line => line.trim()).map((line, index) => ({ 
    id: `item_${index}`, 
    original: line, 
    itemName: line.replace(/[-*]\\s*/, '').trim() 
  })); 
  res.json({ success: true, items, itemCount: items.length }); 
}); 
 
app.listen(PORT, () => { 
  console.log(`Server running on http://localhost:${PORT}`); 
}); 
