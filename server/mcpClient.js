#!/usr/bin/env node

/**
 * CartSmash MCP Client
 * Provides a programmatic interface to interact with the CartSmash MCP server
 */

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");
const { spawn } = require('child_process');
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

class CartSmashMCPClient {
  constructor() {
    this.client = null;
    this.serverProcess = null;
  }

  async connect() {
    try {
      // Start the MCP server process
      this.serverProcess = spawn('node', ['mcpServer.js'], {
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'inherit']
      });

      // Create transport using the server process's stdio
      const transport = new StdioClientTransport({
        reader: this.serverProcess.stdout,
        writer: this.serverProcess.stdin
      });

      // Create and connect client
      this.client = new Client(
        {
          name: "cartsmash-mcp-client",
          version: "1.0.0",
        },
        {
          capabilities: {}
        }
      );

      await this.client.connect(transport);
      console.log("✅ Connected to CartSmash MCP server");

      return true;
    } catch (error) {
      console.error("❌ Failed to connect to MCP server:", error);
      return false;
    }
  }

  async listTools() {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    try {
      const response = await this.client.request(
        { method: "tools/list" },
        ListToolsRequestSchema
      );

      return response.tools;
    } catch (error) {
      console.error("Error listing tools:", error);
      throw error;
    }
  }

  async callTool(toolName, args = {}) {
    if (!this.client) {
      throw new Error("Client not connected. Call connect() first.");
    }

    try {
      const response = await this.client.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args
          }
        },
        CallToolRequestSchema
      );

      return response;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      throw error;
    }
  }

  async createMealPlan(preferences = {}, days = 7, mealsPerDay = 3) {
    return await this.callTool("create_meal_plan", {
      preferences,
      days,
      mealsPerDay
    });
  }

  async createInstacartRecipe(recipeData) {
    return await this.callTool("create_instacart_recipe", recipeData);
  }

  async findRetailers(postalCode, countryCode = "US") {
    return await this.callTool("find_retailers", {
      postalCode,
      countryCode
    });
  }

  async parseRecipeFromText(recipeText, preferences = {}) {
    return await this.callTool("parse_recipe_from_text", {
      recipeText,
      preferences
    });
  }

  async generateShoppingList(recipes, consolidate = true) {
    return await this.callTool("generate_shopping_list", {
      recipes,
      consolidate
    });
  }

  async analyzeNutrition(ingredients) {
    return await this.callTool("analyze_nutrition", {
      ingredients
    });
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
    }

    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }

    console.log("✅ Disconnected from CartSmash MCP server");
  }
}

// CLI interface for testing
async function main() {
  const client = new CartSmashMCPClient();

  try {
    // Connect to server
    const connected = await client.connect();
    if (!connected) {
      process.exit(1);
    }

    // List available tools
    console.log("\n📋 Available Tools:");
    const tools = await client.listTools();
    tools.forEach(tool => {
      console.log(`  • ${tool.name}: ${tool.description}`);
    });

    // Example usage based on command line arguments
    const args = process.argv.slice(2);

    if (args.length === 0) {
      console.log("\n🎯 Usage Examples:");
      console.log("  node mcpClient.js meal-plan");
      console.log("  node mcpClient.js retailers 95670");
      console.log("  node mcpClient.js recipe 'Pasta with tomato sauce'");
      process.exit(0);
    }

    const command = args[0];

    switch (command) {
      case "meal-plan":
        console.log("\n🍽️ Generating meal plan...");
        const mealPlan = await client.createMealPlan({
          dietaryRestrictions: ["vegetarian"],
          cookingTime: "30-45 minutes",
          servings: 4
        }, 3, 2);
        console.log(mealPlan.content[0].text);
        break;

      case "retailers":
        const postalCode = args[1] || "95670";
        console.log(`\n🏪 Finding retailers near ${postalCode}...`);
        const retailers = await client.findRetailers(postalCode);
        console.log(retailers.content[0].text);
        break;

      case "recipe":
        const recipeText = args[1] || "Simple pasta with tomato sauce";
        console.log(`\n📝 Parsing recipe: "${recipeText}"...`);
        const parsedRecipe = await client.parseRecipeFromText(recipeText);
        console.log(parsedRecipe.content[0].text);
        break;

      default:
        console.log(`❌ Unknown command: ${command}`);
        break;
    }

  } catch (error) {
    console.error("❌ Client error:", error);
  } finally {
    await client.disconnect();
  }
}

// Export for use as module
module.exports = CartSmashMCPClient;

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}