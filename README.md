# CartSmash

AI‑Powered Grocery List Destroyer — smash through grocery lists with superhuman efficiency.

## Features
- Convert any AI‑generated grocery list
- Instacart integration
- High‑accuracy item matching
- Bulk processing
- Delightful “SMASH” experience

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/cartsmash.git

# Install dependencies
cd cartsmash
npm run install:all

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Start development servers
npm run dev
```

## Usage
1. Paste your grocery list — any format works
2. Hit the SMASH button
3. Review parsed items (quantities, categories)
4. Add to Instacart

## Tech Stack
- Frontend: React, JavaScript, CSS
- Backend: Node.js, Express
- AI/ML: **AI-ONLY Architecture** - Claude (Anthropic) & GPT (OpenAI)
- Parsing: **Pure AI Processing** - No manual regex patterns or fallbacks
- Infra: Vercel/Render (configurable), MongoDB Atlas, Firebase

## Brand Colors
- Primary Orange: `#FF6B35`
- Secondary Orange: `#F7931E`
- Accent Yellow: `#FFD23F`

## Mobile Ready
- Touch‑friendly SMASH button
- Haptic feedback
- Responsive design
- PWA capable

## AI-Only Architecture Rules

**CRITICAL: This system operates exclusively on AI services with NO manual fallbacks**

- ✅ **All parsing is AI-powered** - Claude (Anthropic) and GPT (OpenAI) only
- ✅ **No manual regex patterns** - Zero traditional text processing rules
- ✅ **No emergency fallbacks** - System requires functional AI services
- ✅ **Pure AI processing** - Ingredient parsing, recipe extraction, shopping list loading
- ⚠️ **AI services required** - System will fail gracefully if AI APIs are unavailable

### Components (AI-Only):
- `ingredientParser.js` - AI-only ingredient parsing
- `simpleRecipeExtractor.js` - AI-only recipe extraction  
- `simpleProductParser.js` - AI-only shopping list loading
- `aiProductParser.js` - AI-only grocery list parsing

## Roadmap
- [x] Core SMASH functionality
- [x] **AI-Only Architecture Implementation**
- [x] Advanced AI parsing engine
- [ ] Social sharing features
- [ ] Cart battles/challenges
- [ ] Influencer partnerships
- [ ] Voice commands

## License
MIT License — see LICENSE file

Made by the CartSmash team.

