// client/src/components/AIIntegrationDemo.js
import React, { useState } from 'react';

function AIIntegrationDemo() {
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [showResults, setShowResults] = useState(false);

  const demoPrompts = [
    {
      id: 'healthy-week',
      title: 'Healthy Week Meal Plan',
      prompt: 'Create a healthy meal plan for one week with grocery shopping list',
      claudeResult: `# 7-Day Healthy Meal Plan & Shopping List

## WEEKLY OVERVIEW
This plan focuses on whole foods, lean proteins, and plenty of vegetables while maintaining balanced macronutrients.

## DAY 1 (MONDAY) - Mediterranean Focus
**Breakfast:** Greek yogurt parfait with berries and nuts
**Lunch:** Quinoa Mediterranean bowl with chickpeas
**Dinner:** Baked salmon with roasted vegetables
**Snack:** Apple slices with almond butter

## DAY 2 (TUESDAY) - Plant-Powered
**Breakfast:** Overnight oats with banana and chia seeds
**Lunch:** Lentil and vegetable soup with whole grain bread
**Dinner:** Grilled chicken with sweet potato and steamed broccoli
**Snack:** Carrot sticks with hummus

## COMPLETE SHOPPING LIST:

### PROTEINS:
• 1 lb salmon fillet
• 2 lbs boneless chicken breast
• 1 large container Greek yogurt (32oz)
• 1 dozen eggs
• 2 cans chickpeas (15oz each)
• 1 lb dried red lentils

### PRODUCE:
• 2 cups mixed berries (blueberries, strawberries)
• 4 large bananas
• 6 medium apples
• 2 large sweet potatoes
• 1 lb fresh broccoli
• 2 lbs carrots
• 1 cucumber
• 2 bell peppers (red, yellow)
• 1 red onion
• 1 bunch fresh spinach
• 2 lemons

### PANTRY:
• 2 cups quinoa
• 1 container rolled oats (32oz)
• 2 tbsp chia seeds
• 1 jar almond butter
• 1 container hummus
• 2 tbsp olive oil
• 1 loaf whole grain bread

### DAIRY:
• 1 small container feta cheese
• 1 bottle olive oil

**NUTRITIONAL FOCUS:** High in fiber, omega-3s, and plant-based proteins while maintaining portion control.`,
      
      chatgptResult: `Weekly Healthy Grocery List - Simple & Practical

PROTEINS (aim for 25-30g per meal):
- 2 lbs chicken breast ($8)
- 1 lb salmon ($12)
- 1 dozen eggs ($3)
- 1 container Greek yogurt ($4)
- 1 can chickpeas ($1)

VEGETABLES (fill half your plate):
- 1 bag spinach ($3)
- 2 lbs broccoli ($4)
- 1 bag carrots ($2)
- 2 bell peppers ($3)
- 1 cucumber ($1)
- 1 red onion ($1)

FRUITS (2-3 servings daily):
- 3 lbs bananas ($3)
- 1 lb apples ($3)
- 1 container berries ($4)

WHOLE GRAINS:
- 1 bag quinoa ($4)
- 1 container oats ($3)
- 1 loaf whole grain bread ($3)

HEALTHY FATS:
- 1 jar almond butter ($6)
- 1 bottle olive oil ($4)
- 1 avocado ($2)

MEAL PREP TIPS:
✓ Cook chicken and quinoa in bulk on Sunday
✓ Pre-cut vegetables for easy snacking
✓ Make overnight oats for quick breakfasts
✓ Portion out nuts and berries for snacks

TOTAL COST: ~$75
PREP TIME: 2 hours on Sunday
SERVES: 1 person for 7 days`
    },
    {
      id: 'budget-family',
      title: 'Budget Family Shopping',
      prompt: 'Create a budget grocery list for a family of 4 under $100',
      claudeResult: `# Budget-Conscious Family Meal Plan ($95 total)

## STRATEGIC APPROACH
Focus on versatile ingredients that can create multiple meals, bulk proteins, and seasonal produce for maximum value.

## PROTEIN FOUNDATION ($28):
• 3 lbs ground beef (80/20) - $12
  *Uses: tacos, spaghetti, stir-fry*
• 1 whole chicken (4-5 lbs) - $8
  *Uses: roasted dinner, soup, sandwiches*
• 2 dozen eggs - $6
  *Uses: breakfast, baking, protein addition*
• 1 lb dried beans (black) - $2
  *Uses: side dish, soup, Mexican dishes*

## PRODUCE SELECTION ($18):
• 5 lb bag potatoes - $3
• 2 lb bag carrots - $2
• 1 bag yellow onions (3 lbs) - $2
• 1 head lettuce - $2
• 3 bananas - $3
• 2 lbs apples - $4
• 1 bag frozen mixed vegetables - $2

## PANTRY STAPLES ($25):
• 2 lbs rice (long grain) - $2
• 2 lbs pasta - $2
• 1 loaf bread - $2
• 1 jar peanut butter - $3
• 1 can tomato sauce - $1
• 1 bottle cooking oil - $3
• Basic spices (salt, pepper, garlic powder) - $5
• 1 lb flour - $2
• 1 lb sugar - $2
• 1 container oats - $3

## DAIRY & ESSENTIALS ($24):
• 1 gallon milk - $4
• 1 lb cheese (cheddar block) - $5
• 1 lb butter - $4
• 1 container yogurt - $4
• 2 cans tuna - $3
• 1 jar jam/jelly - $4

## WEEKLY MENU EXAMPLES:
- **Monday:** Roasted chicken with potatoes and carrots
- **Tuesday:** Spaghetti with ground beef sauce
- **Wednesday:** Chicken soup with vegetables
- **Thursday:** Beef and bean tacos
- **Friday:** Tuna pasta salad
- **Saturday:** Egg fried rice with vegetables
- **Sunday:** Ground beef stir-fry

**COST BREAKDOWN:** 
- Proteins: $28 (29%)
- Produce: $18 (19%)
- Pantry: $25 (26%)
- Dairy: $24 (25%)
- **TOTAL: $95**`,

      chatgptResult: `$100 Family Grocery Budget (Family of 4)

PROTEINS ($30):
- 3 lbs ground beef - $15
- 1 whole chicken - $8
- 2 dozen eggs - $6
- 1 lb deli turkey - $4

PRODUCE ($20):
- 5 lb potatoes - $3
- 2 lb carrots - $2
- 1 bag onions - $2
- 1 head lettuce - $2
- 3 lbs bananas - $3
- 2 lbs apples - $4
- 1 bag frozen veggies - $2
- 2 tomatoes - $2

PANTRY ($25):
- 2 lbs rice - $2
- 2 lbs pasta - $2
- 1 loaf bread - $2
- 1 jar peanut butter - $3
- 1 can tomato sauce - $1
- 1 bottle oil - $3
- 1 lb flour - $2
- 1 container oats - $3
- Spices - $5
- 2 cans tuna - $2

DAIRY ($20):
- 1 gallon milk - $4
- 1 lb cheese - $5
- 1 lb butter - $4
- 1 container yogurt - $4
- 1 jar jam - $3

EXTRAS ($5):
- 1 box crackers - $3
- 1 bag chips - $2

TOTAL: $100

MONEY-SAVING TIPS:
✓ Buy generic brands
✓ Use whole chicken for multiple meals
✓ Cook rice/pasta in bulk
✓ Make egg dishes for cheap protein
✓ Use potatoes as filling base
✓ Shop sales and use coupons

MEAL IDEAS:
- Chicken dinner → leftover soup
- Ground beef → tacos AND spaghetti
- Eggs → breakfast, fried rice, baking
- Potatoes → baked, mashed, roasted`
    }
  ];

  const handlePromptSelect = (prompt) => {
    setSelectedPrompt(prompt);
    setShowResults(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    
    const toast = document.createElement('div');
    toast.innerHTML = '✅ Copied! Paste into Cart Smash above to try it!';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    setTimeout(() => document.body.removeChild(toast), 3000);
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
      padding: '25px',
      borderRadius: '20px',
      marginBottom: '30px',
      border: '3px solid #f59e0b',
      boxShadow: '0 8px 25px rgba(245, 158, 11, 0.2)'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '25px'
      }}>
        <h2 style={{
          color: '#92400e',
          margin: 0,
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          🔥 Live AI Comparison Demo
        </h2>
        <p style={{
          color: '#a16207',
          margin: '8px 0 0 0',
          fontSize: '16px'
        }}>
          See how Claude and ChatGPT handle the same grocery request differently
        </p>
      </div>

      {/* Prompt Selection */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.9)',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#92400e', marginTop: 0 }}>Choose a Demo Prompt:</h3>
        <div style={{
          display: 'flex',
          gap: '15px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}>
          {demoPrompts.map(prompt => (
            <button
              key={prompt.id}
              onClick={() => handlePromptSelect(prompt)}
              style={{
                padding: '15px 25px',
                background: selectedPrompt.id === prompt.id ? '#f59e0b' : 'white',
                color: selectedPrompt.id === prompt.id ? 'white' : '#92400e',
                border: '2px solid #f59e0b',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {prompt.title}
            </button>
          ))}
        </div>
      </div>

      {/* Results Comparison */}
      {showResults && selectedPrompt && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '20px',
          borderRadius: '15px'
        }}>
          <h3 style={{ color: '#92400e', marginTop: 0, textAlign: 'center' }}>
            📊 AI Response Comparison: "{selectedPrompt.title}"
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px',
            marginTop: '20px'
          }}>
            {/* Claude Result */}
            <div style={{
              background: 'white',
              border: '3px solid #d97706',
              borderRadius: '15px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#d97706',
                color: 'white',
                padding: '15px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                🧠 Claude Response
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  Detailed, nutrition-focused
                </div>
              </div>
              
              <div style={{
                padding: '20px',
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                lineHeight: '1.4',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {selectedPrompt.claudeResult}
              </div>
              
              <div style={{
                padding: '15px',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <button
                  onClick={() => copyToClipboard(selectedPrompt.claudeResult)}
                  style={{
                    padding: '10px 20px',
                    background: '#d97706',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📋 Copy Claude Result
                </button>
              </div>
            </div>

            {/* ChatGPT Result */}
            <div style={{
              background: 'white',
              border: '3px solid #059669',
              borderRadius: '15px',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#059669',
                color: 'white',
                padding: '15px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '16px'
              }}>
                🤖 ChatGPT Response
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  Practical, budget-focused
                </div>
              </div>
              
              <div style={{
                padding: '20px',
                fontSize: '12px',
                fontFamily: 'monospace',
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                lineHeight: '1.4',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {selectedPrompt.chatgptResult}
              </div>
              
              <div style={{
                padding: '15px',
                borderTop: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <button
                  onClick={() => copyToClipboard(selectedPrompt.chatgptResult)}
                  style={{
                    padding: '10px 20px',
                    background: '#059669',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  📋 Copy ChatGPT Result
                </button>
              </div>
            </div>
          </div>

          {/* Key Differences */}
          <div style={{
            background: 'linear-gradient(135deg, #fff7ed, #fed7aa)',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '20px'
          }}>
            <h4 style={{ color: '#9a3412', marginTop: 0 }}>🎯 Key Differences:</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '15px'
            }}>
              <div>
                <strong style={{ color: '#d97706' }}>🧠 Claude Strengths:</strong>
                <ul style={{ fontSize: '14px', color: '#92400e', marginTop: '5px' }}>
                  <li>Detailed nutritional analysis</li>
                  <li>Comprehensive meal planning</li>
                  <li>Health-focused recommendations</li>
                  <li>Structured, organized format</li>
                </ul>
              </div>
              <div>
                <strong style={{ color: '#059669' }}>🤖 ChatGPT Strengths:</strong>
                <ul style={{ fontSize: '14px', color: '#065f46', marginTop: '5px' }}>
                  <li>Practical cost breakdowns</li>
                  <li>Money-saving tips</li>
                  <li>Quick meal prep ideas</li>
                  <li>Realistic portion sizes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}

export default AIIntegrationDemo;