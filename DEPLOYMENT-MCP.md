# CartSmash MCP Deployment Guide

## Overview

This guide covers deploying CartSmash with integrated Claude MCP (Model Context Protocol) support to Render.

## Architecture

```
Claude Desktop/Client
    ↓ (MCP Protocol)
CartSmash MCP Server
    ↓ (HTTP API)
CartSmash API Server (Render)
    ↓ (External APIs)
Instacart API, AI Services
```

## Deployment Options

### Option 1: Render Multi-Service Deployment (Recommended)

Using the provided `render.yaml` configuration:

```yaml
services:
  # Main API Service
  - type: web
    name: cartsmash-api
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start

  # MCP HTTP Service (optional)
  - type: web
    name: cartsmash-mcp
    env: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm run mcp:http
```

**Deploy with:**
```bash
# Push to GitHub and connect to Render
# Or deploy directly with Render CLI
render deploy --service-type=web
```

### Option 2: Single Service with MCP Routes

Integrate MCP endpoints directly into the main Express server:

```javascript
// In server/server.js, add:
const mcpRoutes = require('./mcpRoutes');
app.use('/mcp', mcpRoutes);
```

### Option 3: External MCP Client

Connect to deployed CartSmash API from external MCP server using Claude Desktop.

## Configuration Files

### 1. Claude Desktop Configuration

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cartsmash-production": {
      "command": "node",
      "args": ["path/to/CartSmash/server/mcpServer.js"],
      "env": {
        "CARTSMASH_API_URL": "https://cartsmash-api.onrender.com",
        "NODE_ENV": "production"
      }
    },
    "cartsmash-local": {
      "command": "node",
      "args": ["path/to/CartSmash/server/mcpServer.js"],
      "env": {
        "CARTSMASH_API_URL": "http://localhost:3001",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 2. Environment Variables

Required for Render deployment:

```bash
# Core API
NODE_ENV=production
PORT=10000
MONGODB_URI=[from database]
FIREBASE_PROJECT_ID=[your project]
FIREBASE_PRIVATE_KEY=[your key]
FIREBASE_CLIENT_EMAIL=[your email]
JWT_SECRET=[generated]

# External APIs
KROGER_CLIENT_ID=[your id]
KROGER_CLIENT_SECRET=[your secret]
OPENAI_API_KEY=[your key]
ANTHROPIC_API_KEY=[your key]
INSTACART_API_KEY=[your key]

# MCP Specific
CARTSMASH_API_URL=https://cartsmash-api.onrender.com
MCP_PORT=10001
```

## Available MCP Tools

After deployment, Claude will have access to these tools:

### 🍽️ Meal Planning
- **create_meal_plan**: Generate AI-powered meal plans
- **parse_recipe_from_text**: Convert natural language to structured recipes

### 🛒 Shopping & Recipes
- **create_instacart_recipe**: Create Instacart recipe pages
- **find_retailers**: Find nearby grocery stores
- **generate_shopping_list**: Consolidate ingredients into shopping lists

### 📊 Analysis
- **analyze_nutrition**: Categorize and analyze nutritional content

## Testing Your Deployment

### 1. Test API Endpoints

```bash
# Health check
curl https://cartsmash-api.onrender.com/api/health

# Test Instacart integration
curl "https://cartsmash-api.onrender.com/api/instacart/retailers?postalCode=95670"
```

### 2. Test MCP HTTP Interface

If using the HTTP MCP service:

```bash
# Health check
curl https://cartsmash-mcp.onrender.com/health

# List tools
curl https://cartsmash-mcp.onrender.com/mcp/tools

# Test tool
curl "https://cartsmash-mcp.onrender.com/mcp/tools/find-retailers?postalCode=95670"
```

### 3. Test Claude Desktop Integration

In Claude Desktop (after configuring):

```
"Create a 5-day Mediterranean meal plan"
"Find grocery stores near zip code 10001"
"Create an Instacart recipe for chicken alfredo"
```

## Local Development Setup

### 1. Start Services

```bash
# Terminal 1: Main API
cd server
npm run dev

# Terminal 2: MCP Server (if using HTTP version)
npm run mcp:http:dev

# Terminal 3: Test MCP client
node mcpClient.js meal-plan
```

### 2. Configure Claude Desktop for Local

Update your Claude Desktop config to use localhost URLs for development.

## Deployment Checklist

### Pre-Deployment
- [ ] Environment variables configured in Render
- [ ] Database connection string updated
- [ ] API keys for external services added
- [ ] MCP dependencies installed (`@modelcontextprotocol/sdk`)

### Post-Deployment
- [ ] API health check passes
- [ ] Instacart integration working
- [ ] MCP tools accessible via HTTP
- [ ] Claude Desktop configuration updated
- [ ] Test end-to-end MCP workflow

### Production Verification
- [ ] All environment variables in sync
- [ ] HTTPS endpoints working
- [ ] API rate limits configured
- [ ] Error logging enabled
- [ ] MCP tools responding correctly

## Troubleshooting

### Common Issues

**1. MCP Server Connection Failed**
- Verify file paths in Claude Desktop config
- Check environment variables
- Ensure CartSmash API is running

**2. API Endpoint Errors**
- Check Render service logs
- Verify environment variables
- Test endpoints directly with curl

**3. Tool Execution Failures**
- Verify API keys for external services
- Check network connectivity
- Review server logs for errors

### Debug Commands

```bash
# Check MCP server directly
node server/mcpServer.js

# Test with MCP inspector
npx @modelcontextprotocol/inspector node server/mcpServer.js

# Check API connectivity
curl -v https://cartsmash-api.onrender.com/api/health
```

## Security Considerations

### API Keys
- Store sensitive keys in Render environment variables
- Never commit API keys to repository
- Use different keys for development/production

### MCP Access
- MCP server runs locally and connects to remote API
- No sensitive data stored in MCP configuration
- Secure communication via HTTPS

### Rate Limiting
- Implement rate limiting on MCP endpoints
- Monitor API usage to prevent abuse
- Set appropriate timeouts

## Performance Optimization

### Caching
- Enable recipe caching in Instacart integration
- Cache retailer data for better response times
- Implement memory caching for frequent requests

### Scaling
- Use Render's auto-scaling features
- Monitor resource usage
- Optimize API response times

## Monitoring

### Health Checks
- API health endpoint: `/api/health`
- MCP health endpoint: `/health`
- Database connectivity checks

### Logging
- Winston logging for API errors
- MCP tool execution logging
- External API call monitoring

### Metrics
- API response times
- MCP tool usage statistics
- Error rates and patterns

## Next Steps

1. **Deploy to Render** using the provided configuration
2. **Configure Claude Desktop** with your deployment URL
3. **Test integration** with sample queries
4. **Monitor performance** and optimize as needed
5. **Extend tools** by adding new MCP capabilities

## Support

For deployment issues:
- Check Render service logs
- Review API documentation
- Test MCP tools independently
- Verify Claude Desktop configuration

For MCP-specific issues:
- Review MCP protocol documentation
- Test with MCP inspector tool
- Check Claude Desktop integration guide