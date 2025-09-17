#!/usr/bin/env node

/**
 * CartSmash MCP Server
 * Exposes CartSmash functionality as Model Context Protocol tools
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const axios = require('axios');
require('dotenv').config();


// CartSmash API base URL
const CARTSMASH_API_BASE = process.env.CARTSMASH_API_URL || 'https://cartsmash-api.onrender.com';

class CartSmashMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "cartsmash-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "create_meal_plan",
            description: "Generate an AI-powered meal plan with recipes",
            inputSchema: {
              type: "object",
              properties: {
                preferences: {
                  type: "object",
                  properties: {
                    dietaryRestrictions: { type: "array", items: { type: "string" } },
                    cookingTime: { type: "string" },
                    servings: { type: "number" },
                    cuisine: { type: "string" },
                    difficulty: { type: "string" }
                  }
                },
                days: { type: "number", default: 7 },
                mealsPerDay: { type: "number", default: 3 }
              },
              required: []
            }
          },
          {
            name: "create_instacart_recipe",
            description: "Create an Instacart recipe page from recipe data",
            inputSchema: {
              type: "object",
              properties: {
                title: { type: "string" },
                instructions: { type: "array", items: { type: "string" } },
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "string" },
                      unit: { type: "string" }
                    },
                    required: ["name"]
                  }
                },
                servings: { type: "number" },
                cookingTime: { type: "string" },
                dietaryRestrictions: { type: "array", items: { type: "string" } }
              },
              required: ["title", "instructions", "ingredients"]
            }
          },
          {
            name: "find_retailers",
            description: "Find nearby grocery retailers using Instacart",
            inputSchema: {
              type: "object",
              properties: {
                postalCode: { type: "string" },
                countryCode: { type: "string", default: "US" }
              },
              required: ["postalCode"]
            }
          },
          {
            name: "parse_recipe_from_text",
            description: "Parse a recipe from natural language text using AI",
            inputSchema: {
              type: "object",
              properties: {
                recipeText: { type: "string" },
                preferences: {
                  type: "object",
                  properties: {
                    dietaryRestrictions: { type: "array", items: { type: "string" } },
                    servings: { type: "number" }
                  }
                }
              },
              required: ["recipeText"]
            }
          },
          {
            name: "generate_shopping_list",
            description: "Generate a shopping list from recipe ingredients",
            inputSchema: {
              type: "object",
              properties: {
                recipes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      ingredients: { type: "array", items: { type: "object" } }
                    }
                  }
                },
                consolidate: { type: "boolean", default: true }
              },
              required: ["recipes"]
            }
          },
          {
            name: "analyze_nutrition",
            description: "Analyze nutritional information for recipes or ingredients",
            inputSchema: {
              type: "object",
              properties: {
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      quantity: { type: "string" },
                      unit: { type: "string" }
                    }
                  }
                }
              },
              required: ["ingredients"]
            }
          }
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "create_meal_plan":
            return await this.createMealPlan(args);

          case "create_instacart_recipe":
            return await this.createInstacartRecipe(args);

          case "find_retailers":
            return await this.findRetailers(args);

          case "parse_recipe_from_text":
            return await this.parseRecipeFromText(args);

          case "generate_shopping_list":
            return await this.generateShoppingList(args);

          case "analyze_nutrition":
            return await this.analyzeNutrition(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing ${name}: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async createMealPlan(args) {
    const response = await axios.post(`${CARTSMASH_API_BASE}/api/meal-plans/generate-meal-plan`, {
      preferences: args.preferences || {},
      days: args.days || 7,
      mealsPerDay: args.mealsPerDay || 3
    });

    const mealPlan = response.data;

    return {
      content: [
        {
          type: "text",
          text: `Generated meal plan with ${mealPlan.meals?.length || 0} meals:\n\n${this.formatMealPlan(mealPlan)}`
        }
      ]
    };
  }

  async createInstacartRecipe(args) {
    const response = await axios.post(`${CARTSMASH_API_BASE}/api/instacart/recipe/create`, {
      title: args.title,
      instructions: args.instructions,
      ingredients: args.ingredients,
      servings: args.servings,
      cookingTime: args.cookingTime,
      dietaryRestrictions: args.dietaryRestrictions
    });

    const recipe = response.data;

    return {
      content: [
        {
          type: "text",
          text: `Successfully created Instacart recipe!\n\nRecipe ID: ${recipe.recipeId}\nURL: ${recipe.instacartUrl}\nIngredients: ${recipe.ingredientsCount} items`
        }
      ]
    };
  }

  async findRetailers(args) {
    const response = await axios.get(`${CARTSMASH_API_BASE}/api/instacart/retailers`, {
      params: {
        postalCode: args.postalCode,
        countryCode: args.countryCode || 'US'
      }
    });

    const retailers = response.data;

    return {
      content: [
        {
          type: "text",
          text: `Found ${retailers.length} retailers near ${args.postalCode}:\n\n${this.formatRetailers(retailers)}`
        }
      ]
    };
  }

  async parseRecipeFromText(args) {
    const response = await axios.post(`${CARTSMASH_API_BASE}/api/meal-plans/parse-meal-plan`, {
      recipeText: args.recipeText,
      preferences: args.preferences || {}
    });

    const parsedRecipe = response.data;

    return {
      content: [
        {
          type: "text",
          text: `Parsed recipe successfully:\n\n${this.formatRecipe(parsedRecipe)}`
        }
      ]
    };
  }

  async generateShoppingList(args) {
    // Extract all ingredients from recipes
    const allIngredients = [];

    for (const recipe of args.recipes) {
      allIngredients.push(...recipe.ingredients.map(ing => ({
        ...ing,
        source: recipe.title
      })));
    }

    if (args.consolidate) {
      const consolidated = this.consolidateIngredients(allIngredients);
      return {
        content: [
          {
            type: "text",
            text: `Generated consolidated shopping list:\n\n${this.formatShoppingList(consolidated)}`
          }
        ]
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Generated shopping list:\n\n${this.formatShoppingList(allIngredients)}`
        }
      ]
    };
  }

  async analyzeNutrition(args) {
    // This would integrate with a nutrition API or service
    // For now, return a basic analysis
    const totalIngredients = args.ingredients.length;

    return {
      content: [
        {
          type: "text",
          text: `Nutrition analysis for ${totalIngredients} ingredients:\n\n${this.formatNutritionAnalysis(args.ingredients)}`
        }
      ]
    };
  }

  // Helper formatting methods
  formatMealPlan(mealPlan) {
    if (!mealPlan.meals) return "No meals in plan";

    return mealPlan.meals.map((meal, index) =>
      `${index + 1}. ${meal.title}\n   - ${meal.ingredients?.length || 0} ingredients\n   - Cooking time: ${meal.cookingTime || 'Not specified'}`
    ).join('\n\n');
  }

  formatRetailers(retailers) {
    return retailers.slice(0, 10).map(retailer =>
      `• ${retailer.name} (${retailer.retailer_key})`
    ).join('\n');
  }

  formatRecipe(recipe) {
    const ingredients = recipe.ingredients?.map(ing =>
      `• ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim()
    ).join('\n') || 'No ingredients';

    const instructions = recipe.instructions?.map((inst, index) =>
      `${index + 1}. ${inst}`
    ).join('\n') || 'No instructions';

    return `**${recipe.title}**\n\nIngredients:\n${ingredients}\n\nInstructions:\n${instructions}`;
  }

  formatShoppingList(ingredients) {
    return ingredients.map(ing =>
      `• ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}${ing.source ? ` (for ${ing.source})` : ''}`.trim()
    ).join('\n');
  }

  formatNutritionAnalysis(ingredients) {
    // Basic nutritional categorization
    const categories = {
      proteins: [],
      vegetables: [],
      grains: [],
      dairy: [],
      other: []
    };

    ingredients.forEach(ing => {
      const name = ing.name.toLowerCase();
      if (name.includes('chicken') || name.includes('beef') || name.includes('fish') || name.includes('egg')) {
        categories.proteins.push(ing.name);
      } else if (name.includes('tomato') || name.includes('lettuce') || name.includes('carrot') || name.includes('pepper')) {
        categories.vegetables.push(ing.name);
      } else if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('flour')) {
        categories.grains.push(ing.name);
      } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
        categories.dairy.push(ing.name);
      } else {
        categories.other.push(ing.name);
      }
    });

    let analysis = '';
    Object.entries(categories).forEach(([category, items]) => {
      if (items.length > 0) {
        analysis += `**${category.charAt(0).toUpperCase() + category.slice(1)}:** ${items.join(', ')}\n`;
      }
    });

    return analysis || 'Unable to categorize ingredients';
  }

  consolidateIngredients(ingredients) {
    const consolidated = new Map();

    ingredients.forEach(ing => {
      const key = ing.name.toLowerCase();
      if (consolidated.has(key)) {
        const existing = consolidated.get(key);
        // Simple consolidation logic - would need more sophisticated unit conversion
        existing.sources = existing.sources || [];
        existing.sources.push(ing.source);
      } else {
        consolidated.set(key, { ...ing, sources: ing.source ? [ing.source] : [] });
      }
    });

    return Array.from(consolidated.values());
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("CartSmash MCP server running on stdio");
  }
}

// Run the server
const server = new CartSmashMCPServer();
server.run().catch(console.error);