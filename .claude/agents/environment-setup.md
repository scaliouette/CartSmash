# Agent System Environment Setup Guide
**Maintained by: CAO (Chief AI Officer) & DevLead (Development Manager)**
**Last Updated: 2025-09-29**

## Overview
This document provides comprehensive setup instructions for the CartSmash Agent System environment. All agents must have their environment properly configured to function within the system.

## Required Environment Variables

### Core Agent System
```bash
# Agent System Configuration
AGENT_SYSTEM_ENABLED=true
AGENT_AUDIT_ENABLED=true
AGENT_CHAT_HISTORY_DAYS=30
AGENT_WORK_JOURNAL_RETENTION=90
AGENT_MAX_CONCURRENT_TASKS=10
AGENT_TASK_TIMEOUT_MINUTES=30

# WebSocket Configuration
WEBSOCKET_PORT=3002
WEBSOCKET_MAX_CONNECTIONS=100
WEBSOCKET_HEARTBEAT_INTERVAL=30000

# Redis Configuration (for caching and session management)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0
REDIS_CACHE_TTL=3600

# MongoDB Collections for Agents
MONGODB_AGENT_DB=cartsmash_agents
MONGODB_AGENT_MESSAGES_COLLECTION=agent_messages
MONGODB_AGENT_WORK_COLLECTION=agent_work_entries
MONGODB_AGENT_AUDIT_COLLECTION=agent_audit_logs
```

### Agent Authentication
```bash
# JWT Configuration for Agent Communication
AGENT_JWT_SECRET=your_agent_jwt_secret
AGENT_JWT_EXPIRY=24h
AGENT_API_KEY=your_agent_api_key
```

### API Service Limits (Important for Agent Operations)
```bash
# Spoonacular API (Product Data)
SPOONACULAR_API_KEY=8d19259c6b764d38b6cc0b72396131ae
SPOONACULAR_DAILY_LIMIT=50
SPOONACULAR_CACHE_ENABLED=true
SPOONACULAR_CACHE_TTL=86400

# OpenAI API (AI Meal Planning)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# Anthropic API (Advanced Parsing)
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-opus-20240229
ANTHROPIC_MAX_TOKENS=4000
```

## Installation Steps

### 1. Install Dependencies

#### Server Dependencies
```bash
cd server
npm install

# New dependencies for agent system
npm install socket.io redis
```

#### Client Dependencies
```bash
cd client
npm install

# New dependency for real-time communication
npm install socket.io-client
```

### 2. Redis Setup

#### Local Development
```bash
# macOS
brew install redis
brew services start redis

# Windows (WSL/Docker)
docker run -d -p 6379:6379 --name redis redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

#### Production (Render/Heroku)
- Add Redis add-on to your deployment
- Update REDIS_URL with provided connection string

### 3. MongoDB Schema Setup

Run these commands in MongoDB shell or Atlas:

```javascript
// Create agent-specific indexes
db.agent_messages.createIndex({ "from.agentId": 1, "createdAt": -1 });
db.agent_messages.createIndex({ "to.channel": 1, "createdAt": -1 });
db.agent_messages.createIndex({ "content.text": "text", "tags": "text" });

db.agent_work_entries.createIndex({ "agentId": 1, "createdAt": -1 });
db.agent_work_entries.createIndex({ "actionType": 1, "status": 1 });
db.agent_work_entries.createIndex({ "impact.level": 1, "createdAt": -1 });

db.agent_audit_logs.createIndex({ "agentId": 1, "timestamp": -1 });
db.agent_audit_logs.createIndex({ "action": 1, "riskLevel": 1 });
```

### 4. WebSocket Server Configuration

The WebSocket server runs alongside the main Express server:

```javascript
// Automatic initialization in server.js
const httpServer = createServer(app);
const wsServer = new AgentWebSocketServer(httpServer);
```

Default WebSocket endpoints:
- `/socket.io` - Main WebSocket connection
- Namespaces:
  - `/agent-chat` - Agent communication
  - `/agent-status` - Real-time status updates
  - `/work-updates` - Work notifications

### 5. Agent Registration

Each agent must be registered in the system:

```javascript
// Example agent registration
agentMonitoringService.registerAgent({
  id: 'dashboard-improvement-agent',
  alias: 'Dash',
  name: 'Dashboard Specialist',
  role: 'Dashboard Development',
  capabilities: ['dashboard', 'ui', 'reporting'],
  tools: ['Read', 'Edit', 'Grep', 'Write']
});
```

## Development Environment

### Local Development Setup

1. **Environment File (.env)**
```bash
# Copy the example env file
cp .env.example .env

# Edit with your local settings
nano .env
```

2. **Start Services**
```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start MongoDB
mongod

# Terminal 3: Start Server with WebSocket
cd server
npm run dev

# Terminal 4: Start Client
cd client
npm start
```

3. **Access Points**
- Client: `http://localhost:3000`
- Server API: `http://localhost:3001`
- WebSocket: `ws://localhost:3001/socket.io`
- Admin Dashboard: `http://localhost:3000/admin`

### Testing Agent Communication

1. **Test WebSocket Connection**
```javascript
// Client-side test
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token',
    agentId: 'test-agent'
  }
});

socket.on('connect', () => {
  console.log('Connected to agent system');
});
```

2. **Test Agent Message**
```bash
curl -X POST http://localhost:3001/api/agent/chat/message \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "from": {"agentId": "test-agent", "agentAlias": "Test"},
    "to": {"channel": "general", "type": "channel"},
    "content": {"text": "Test message"}
  }'
```

## Production Deployment

### Render Deployment

1. **Environment Variables**
   - Add all required env vars in Render Dashboard
   - Ensure REDIS_URL points to Redis instance

2. **Build Command**
```bash
npm install && npm run build
```

3. **Start Command**
```bash
npm start
```

### Vercel Deployment (Client)

1. **Environment Variables**
   - Add REACT_APP_API_URL
   - Add REACT_APP_WS_URL for WebSocket

2. **Build Settings**
   - Framework: Create React App
   - Build Command: `npm run build`
   - Output Directory: `build`

## Monitoring & Maintenance

### Health Checks

1. **Agent System Health**
```bash
curl http://localhost:3001/api/agent/status/system
```

2. **WebSocket Connections**
```bash
curl http://localhost:3001/api/agent/websocket/stats
```

3. **Audit Trail Integrity**
```bash
curl -X POST http://localhost:3001/api/agent/audit/verify
```

### Log Locations

- **Agent Activity**: `logs/agent-activity.log`
- **Agent Audit**: `logs/agent-audit.log`
- **WebSocket**: `logs/websocket.log`
- **System**: `logs/system.log`

### Performance Tuning

```bash
# Optimize Redis memory
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# MongoDB optimization
db.agent_messages.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify WebSocket port is open
   - Check authentication token

2. **Redis Connection Error**
   - Verify Redis is running
   - Check REDIS_URL format
   - Test connection: `redis-cli ping`

3. **Agent Not Responding**
   - Check agent registration
   - Verify agent is online in monitoring service
   - Review audit logs for errors

4. **High Memory Usage**
   - Clear old messages: `db.agent_messages.remove({ createdAt: { $lt: new Date(Date.now() - 30*24*60*60*1000) } })`
   - Optimize Redis: `redis-cli FLUSHDB`

### Debug Commands

```bash
# Check agent status
curl http://localhost:3001/api/agent/status/dashboard-improvement-agent

# View recent audit entries
curl http://localhost:3001/api/agent/audit/trail?limit=10

# Check WebSocket connections
curl http://localhost:3001/api/agent/websocket/connections
```

## Security Considerations

1. **API Keys**: Never commit API keys to repository
2. **JWT Tokens**: Rotate AGENT_JWT_SECRET regularly
3. **Redis**: Always use password in production
4. **MongoDB**: Enable authentication and use connection string with credentials
5. **WebSocket**: Implement rate limiting for connections
6. **Audit**: Review audit logs weekly for suspicious activity

## Agent Development Guidelines

### Creating New Agents

1. Define agent in `.claude/agents/[agent-name].md`
2. Register in `agentMonitoringService.js`
3. Add to communication hub
4. Create necessary API endpoints
5. Update documentation

### Agent Best Practices

1. Always log actions to audit service
2. Handle errors gracefully
3. Respect rate limits
4. Use caching when appropriate
5. Follow security guidelines
6. Document all changes

## Support & Resources

- **Documentation**: `/docs/agent-system`
- **API Reference**: `/api/agent/docs`
- **Admin Dashboard**: `/admin` → AI Agents tab
- **Monitoring**: Real-time monitoring in Admin Dashboard

---

**Note**: This document is maintained by CAO and DevLead agents. Any changes to the environment setup must be reviewed and approved by these agents to ensure system stability and security.