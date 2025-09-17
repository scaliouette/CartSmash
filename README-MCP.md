# CartSmash MCP Integration

This document describes how to integrate CartSmash with Claude using the Model Context Protocol (MCP).

## What is MCP?

The Model Context Protocol (MCP) is an open standard that enables secure connections between AI assistants and external systems. With MCP, Claude can directly access and interact with CartSmash's functionality.

## Features

The CartSmash MCP server exposes the following tools to Claude:

### 🍽️ Meal Planning
- **create_meal_plan**: Generate AI-powered meal plans with recipes
- **parse_recipe_from_text**: Convert natural language recipes into structured data

### 🛒 Shopping & Recipes
- **create_instacart_recipe**: Create Instacart recipe pages from recipe data
- **find_retailers**: Find nearby grocery retailers using Instacart
- **generate_shopping_list**: Generate consolidated shopping lists from recipes

### 📊 Analysis
- **analyze_nutrition**: Analyze nutritional information for recipes and ingredients

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install @modelcontextprotocol/sdk
```

### 2. Configure Claude Desktop

Add this configuration to your Claude Desktop settings:

**For Production (Render deployment):**
```json
{
  "mcpServers": {
    "cartsmash": {
      "command": "node",
      "args": ["server/mcpServer.js"],
      "cwd": "C:\\Users\\scali\\OneDrive\\Documents\\GitHub\\CartSmash",
      "env": {
        "CARTSMASH_API_URL": "https://cartsmash-api.onrender.com",
        "NODE_ENV": "production"
      }
    }
  }
}
```

**For Local Development:**
```json
{
  "mcpServers": {
    "cartsmash-local": {
      "command": "node",
      "args": ["server/mcpServer.js"],
      "cwd": "C:\\Users\\scali\\OneDrive\\Documents\\GitHub\\CartSmash",
      "env": {
        "CARTSMASH_API_URL": "http://localhost:3001",
        "NODE_ENV": "development"
      }
    }
  }
}
```

### 3. Start the Servers

**Local Development:**
```bash
# Terminal 1: Start CartSmash API server
cd server
npm run dev

# Terminal 2: Test MCP server independently
npm run mcp
```

**Production:**
The MCP server will connect to your deployed Render instance at `https://cartsmash-api.onrender.com`.

## Usage Examples

### With Claude Desktop

Once configured, you can interact with CartSmash directly through Claude:

```
"Create a 5-day vegetarian meal plan with quick recipes"

"Find grocery stores near zip code 95670"

"Create an Instacart recipe page for chicken alfredo pasta"

"Generate a shopping list for a week of Mediterranean meals"
```

### Programmatic Usage

```javascript
import CartSmashMCPClient from './server/mcpClient.js';

const client = new CartSmashMCPClient();
await client.connect();

// Generate meal plan
const mealPlan = await client.createMealPlan({
  dietaryRestrictions: ["gluten-free"],
  cookingTime: "30 minutes",
  servings: 4
}, 7, 3);

// Find retailers
const retailers = await client.findRetailers("10001", "US");

// Create Instacart recipe
const recipe = await client.createInstacartRecipe({
  title: "Quick Chicken Stir Fry",
  instructions: ["Heat oil", "Add chicken", "Add vegetables", "Serve"],
  ingredients: [
    { name: "chicken breast", quantity: "1", unit: "lb" },
    { name: "mixed vegetables", quantity: "2", unit: "cups" }
  ]
});

await client.disconnect();
```

### CLI Testing

```bash
# Test different commands
node server/mcpClient.js meal-plan
node server/mcpClient.js retailers 95670
node server/mcpClient.js recipe "Beef tacos with guacamole"
```

## Architecture

```
Claude Desktop
    ↓ (MCP Protocol)
CartSmash MCP Server
    ↓ (HTTP API)
CartSmash API Server (Render)
    ↓ (External APIs)
Instacart API, AI Services
```

## Deployment Integration

### Render Configuration

The MCP server can connect to your Render deployment by setting the environment variable:

```bash
CARTSMASH_API_URL=https://cartsmash-api.onrender.com
```

### Environment Variables

Required environment variables for MCP server:
- `CARTSMASH_API_URL`: Base URL for CartSmash API (default: https://cartsmash-api.onrender.com)
- `NODE_ENV`: Environment mode (development/production)

## Troubleshooting

### Common Issues

1. **Connection Failed**: Ensure CartSmash API server is running
2. **Tool Not Found**: Verify MCP server is properly configured in Claude Desktop
3. **Permission Denied**: Check file paths in Claude Desktop configuration
4. **API Errors**: Verify environment variables and API endpoints

### Debug Mode

Enable debug logging:
```bash
DEBUG=mcp* node server/mcpServer.js
```

### Testing MCP Server

Use the MCP Inspector for debugging:
```bash
npx @modelcontextprotocol/inspector node server/mcpServer.js
```

## Benefits

### For Users
- Direct integration with CartSmash through Claude conversations
- Natural language meal planning and recipe management
- Seamless shopping list generation
- Real-time grocery store finder

### For Developers
- Standardized tool interface for AI integration
- Easy extension of CartSmash capabilities
- Secure communication protocol
- Comprehensive error handling

## Future Enhancements

- Real-time meal plan collaboration
- Advanced nutrition analysis with detailed macros
- Integration with more grocery delivery services
- Recipe sharing and social features
- Smart pantry management

## Support

For issues with MCP integration:
1. Check server logs for errors
2. Verify Claude Desktop configuration
3. Test MCP server independently using the CLI client
4. Review API endpoint connectivity

## Related Documentation

- [CartSmash API Documentation](./CLAUDE.md)
- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [Claude Desktop MCP Setup](https://docs.anthropic.com/claude/docs/mcp)