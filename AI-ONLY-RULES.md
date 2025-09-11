# CartSmash AI-Only Architecture Rules

## CRITICAL SYSTEM REQUIREMENTS

**This system operates EXCLUSIVELY on AI services with NO manual fallbacks or regex patterns.**

## Core Principles

### ✅ AI-ONLY Processing
- All text parsing is performed by Claude (Anthropic) and GPT (OpenAI)
- Zero manual regex patterns or traditional text processing rules
- No emergency fallback systems or manual parsing methods
- Pure AI processing for all grocery list, recipe, and ingredient parsing

### ⚠️ AI Service Dependency
- System requires functional AI services (Anthropic or OpenAI APIs)
- Graceful failure when AI services are unavailable
- Clear error messages indicating AI service requirement
- No degraded functionality - AI services are mandatory

## AI-Only Components

### Core Parsing Modules
1. **`ingredientParser.js`** - AI-only ingredient parsing
   - Handles quantity, unit, and product name extraction via AI
   - No manual fraction parsing or unit normalization rules

2. **`simpleRecipeExtractor.js`** - AI-only recipe extraction
   - Recipe title, ingredients, and instructions via AI
   - No manual pattern matching for recipe sections

3. **`simpleProductParser.js`** - AI-only shopping list loading  
   - Shopping list parsing and product extraction via AI
   - No manual bullet point or line item processing

4. **`aiProductParser.js`** - AI-only grocery list parsing
   - Main grocery list processing engine using AI
   - Handles bullet cleaning and quantity parsing via AI prompts

### Route Integration
- **`cart.js`** - Uses AI parsers with async/await error handling
- **`aiSimplified.js`** - Pure AI routing with no manual fallbacks

## Enforcement Rules

### 🚫 PROHIBITED
- Manual regex patterns for text parsing
- Emergency fallback parsing systems
- Traditional text processing rules
- Manual pattern matching algorithms
- Hardcoded parsing templates

### ✅ REQUIRED
- AI API calls for all parsing operations
- Proper error handling when AI services fail
- Clear error messages indicating AI requirement
- Async/await patterns for AI service calls
- Graceful degradation to error states (not manual parsing)

## Error Handling Protocol

When AI services are unavailable:
1. Return clear error messages indicating AI service requirement
2. Use HTTP 400/500 status codes as appropriate
3. Include helpful debugging information
4. **NEVER** fall back to manual parsing methods

## Development Guidelines

### Adding New Parsing Features
1. Must use AI service calls (Anthropic/OpenAI)
2. Include proper error handling for AI failures
3. Test with AI service unavailable scenarios
4. Document AI prompt requirements

### Code Review Checklist
- [ ] No manual regex patterns added
- [ ] AI service calls properly implemented
- [ ] Error handling for AI failures included
- [ ] No emergency fallback methods created
- [ ] Async/await patterns used correctly

## Deployment Notes

This architecture ensures:
- Consistent high-quality parsing via AI
- No maintenance of complex regex patterns
- Scalable parsing that improves with AI models
- Clear dependency on AI services
- Future-proof architecture aligned with AI advancement

**Last Updated:** 2025-09-11T05:00:00Z  
**Architecture Version:** AI-Only v1.0