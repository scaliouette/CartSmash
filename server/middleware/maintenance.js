#!/usr/bin/env node

// server/scripts/maintenance.js - Toggle maintenance mode
const fs = require('fs');
const path = require('path');

const action = process.argv[2];

if (!action || !['on', 'off'].includes(action)) {
  console.log('Usage: npm run maintenance:on or npm run maintenance:off');
  process.exit(1);
}

const configPath = path.join(__dirname, '..', 'config', 'settings.json');

try {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  config.system.maintenanceMode = action === 'on';
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`✅ Maintenance mode ${action === 'on' ? 'ENABLED' : 'DISABLED'}`);
  console.log('Restart the server for changes to take effect.');
  
} catch (error) {
  console.error('❌ Failed to update maintenance mode:', error.message);
  process.exit(1);
}