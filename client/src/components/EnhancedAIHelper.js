// client/src/components/EnhancedAIHelper.js
import React, { useState } from 'react';

function EnhancedAIHelper() {
  const [activeTab, setActiveTab] = useState('prompts');
  // eslint-disable-next-line no-unused-vars
  const [selectedAI, setSelectedAI] = useState('both');

  const aiAssistants = {
    claude: {
      name: 'Claude (Anthropic)',
      icon: '🧠',
      color: '#D97706',
      strengths: ['Detailed meal planning', 'Dietary restrictions', 'Nutritional analysis', 'Recipe combinations'],
      bestFor: 'Complex meal planning and health-conscious lists',
      example: `Here's a 7-day heart-healthy meal plan:

MONDAY - Mediterranean Day
Breakfast: Greek yogurt with berries (1 cup plain Greek yogurt, 1/2 cup mixed berries, 1 tbsp honey)
Lunch: Quinoa tabbouleh (1 cup quinoa, 2 tomatoes, 1 cucumber, 1/4 cup olive oil)
Dinner: Baked salmon with vegetables (1 lb salmon, 2 lbs asparagus, 1 lemon)

TUESDAY - Plant-Based Power
Breakfast: Overnight oats (1 cup rolled oats, 1 cup almond milk, 1 banana)
...

SHOPPING LIST:
• 1 cup plain Greek yogurt
• 1/2 cup mixed berries
• 1 tbsp honey
• 1 cup quinoa
• 2 large tomatoes
• 1 cucumber
• 1/4 cup olive oil
• 1 lb salmon fillet
• 2 lbs fresh asparagus
• 2 lemons
• 1 cup rolled oats
• 1 cup almond milk
• 3 bananas`,
      url: 'https://claude.ai'
    },
    chatgpt: {
      name: 'ChatGPT (OpenAI)',
      icon: '🤖',
      color: '#059669',
      strengths: ['Quick lists', 'Budget optimization', 'Party planning', 'Bulk shopping'],
      bestFor: 'Fast, practical grocery lists and bulk shopping',
      example: `Quick Weekly Grocery List (Family of 4, $150 budget):

PROTEINS:
- 3 lbs ground beef ($12)
- 2 lbs chicken thighs ($8)
- 1 dozen eggs ($3)
- 1 lb turkey deli meat ($6)

PRODUCE:
- 5 lbs potatoes ($3)
- 2 lbs carrots ($2)
- 1 bag spinach ($3)
- 3 lbs bananas ($2)
- 2 lbs apples ($4)

PANTRY:
- 2 lbs rice ($2)
- 1 loaf bread ($2)
- 1 lb pasta ($1)
- 1 jar pasta sauce ($2)

DAIRY:
- 1 gallon milk ($4)
- 1 lb cheese ($5)
- 1 container yogurt ($4)

Total: ~$150`,
      url: 'https://chat.openai.com'
    }
  };

  const enhancedPrompts = [
    {
      id: 'meal-planning',
      name: 'Weekly Meal Planning',
      icon: '📅',
      aiRecommendation: 'claude',
      prompt: 'Create a detailed 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and healthy snacks. Focus on balanced nutrition and include exact quantities for all ingredients.',
      why: 'Claude excels at detailed meal planning with nutritional considerations'
    },
    {
      id: 'budget-shopping',
      name: 'Budget Shopping List',
      icon: '💰',
      aiRecommendation: 'chatgpt',
      prompt: 'Create a budget-friendly grocery list for $100 per week for a family of 4. Include proteins, vegetables, fruits, and pantry staples. Show approximate prices for each item and prioritize nutritious, filling meals.',
      why: 'ChatGPT is great at optimizing for budget constraints'
    },
    {
      id: 'dietary-restrictions',
      name: 'Special Diet Planning',
      icon: '🌱',
      aiRecommendation: 'claude',
      prompt: 'Create a grocery list for a gluten-free, dairy-free family of 3. Include meal ideas and all necessary ingredients for breakfast, lunch, dinner, and snacks for one week. Ensure nutritional completeness.',
      why: 'Claude provides detailed analysis of dietary restrictions and nutrition'
    },
    {
      id: 'party-planning',
      name: 'Party Shopping',
      icon: '🎉',
      aiRecommendation: 'chatgpt',
      prompt: 'Create a complete shopping list for a birthday party for 20 people. Include appetizers, main dishes, desserts, drinks, and party supplies. Focus on crowd-pleasing options and easy preparation.',
      why: 'ChatGPT handles practical party planning and bulk quantities well'
    },
    {
      id: 'healthy-cooking',
      name: 'Healthy Lifestyle',
      icon: '🥗',
      aiRecommendation: 'claude',
      prompt: 'Create a grocery list focused on clean eating and whole foods. Include ingredients for anti-inflammatory meals, high-protein options, and nutrient-dense vegetables. Provide meal prep ideas.',
      why: 'Claude provides detailed nutritional guidance and health-focused meal planning'
    },
    {
      id: 'quick-meals',
      name: 'Quick & Easy Meals',
      icon: '⚡',
      aiRecommendation: 'chatgpt',
      prompt: 'Create a grocery list for 10 different meals that can each be prepared in 30 minutes or less. Include all ingredients needed and focus on simple, family-friendly recipes.',
      why: 'ChatGPT excels at practical, time-saving meal solutions'
    }
  ];

  const copyPromptWithAI = (prompt, recommendedAI) => {
    const aiInfo = aiAssistants[recommendedAI];
    const fullPrompt = `${prompt}\n\n[Best results with ${aiInfo.name} - ${aiInfo.bestFor}]`;

    navigator.clipboard.writeText(fullPrompt);

    // Enhanced notification - Using safe DOM manipulation instead of innerHTML
    const toast = document.createElement('div');

    // Create the container div
    const container = document.createElement('div');
    container.style.cssText = 'display: flex; align-items: center; gap: 8px;';

    // Create the icon span
    const iconSpan = document.createElement('span');
    iconSpan.textContent = aiInfo.icon;

    // Create the text container div
    const textDiv = document.createElement('div');

    // Create the strong element
    const strongEl = document.createElement('strong');
    strongEl.textContent = `Copied for ${aiInfo.name}!`;

    // Create the small element
    const smallEl = document.createElement('small');
    smallEl.textContent = `Open ${aiInfo.name} and paste this prompt`;

    // Assemble the DOM structure
    textDiv.appendChild(strongEl);
    textDiv.appendChild(document.createElement('br'));
    textDiv.appendChild(smallEl);

    container.appendChild(iconSpan);
    container.appendChild(textDiv);
    toast.appendChild(container);

    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: ${aiInfo.color};
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      min-width: 250px;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 4000);
  };

  const openAIAssistant = (aiKey) => {
    const ai = aiAssistants[aiKey];
    window.open(ai.url, '_blank');
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff, #dbeafe)',
      padding: '25px',
      borderRadius: '20px',
      marginBottom: '30px',
      border: '3px solid #3b82f6',
      boxShadow: '0 8px 25px rgba(59, 130, 246, 0.2)'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '25px'
      }}>
        <h2 style={{
          color: '#1e40af',
          margin: 0,
          fontSize: '28px',
          fontWeight: 'bold'
        }}>
          🤖 AI-Powered Grocery Planning
        </h2>
        <p style={{
          color: '#3730a3',
          margin: '8px 0 0 0',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          Get personalized grocery lists from the world's best AI assistants
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '25px',
        gap: '10px'
      }}>
        {[
          { id: 'prompts', label: '📝 Smart Prompts', desc: 'AI-optimized grocery requests' },
          { id: 'compare', label: '⚖️ AI Comparison', desc: 'Which AI for what task' },
          { id: 'examples', label: '💡 Examples', desc: 'See AI outputs side-by-side' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: activeTab === tab.id ? '#3b82f6' : 'white',
              color: activeTab === tab.id ? 'white' : '#1e40af',
              border: `2px solid ${activeTab === tab.id ? '#3b82f6' : '#e5e7eb'}`,
              borderRadius: '10px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
          >
            <div>{tab.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>{tab.desc}</div>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'prompts' && (
        <div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '15px',
            marginBottom: '20px'
          }}>
            <h3 style={{ color: '#1e40af', marginTop: 0 }}>🎯 Optimized AI Prompts</h3>
            <p style={{ color: '#374151', marginBottom: '20px' }}>
              Each prompt is optimized for specific AI assistants to give you the best results:
            </p>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '15px'
            }}>
              {enhancedPrompts.map(prompt => {
                const recommendedAI = aiAssistants[prompt.aiRecommendation];
                return (
                  <div
                    key={prompt.id}
                    style={{
                      background: 'white',
                      border: `2px solid ${recommendedAI.color}`,
                      borderRadius: '12px',
                      padding: '20px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                    onClick={() => copyPromptWithAI(prompt.prompt, prompt.aiRecommendation)}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-3px)';
                      e.target.style.boxShadow = `0 8px 25px ${recommendedAI.color}40`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0px)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    {/* AI Recommendation Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '15px',
                      background: recommendedAI.color,
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {recommendedAI.icon} Best with {recommendedAI.name.split(' ')[0]}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '12px',
                      marginTop: '10px'
                    }}>
                      <span style={{ fontSize: '24px', marginRight: '12px' }}>
                        {prompt.icon}
                      </span>
                      <div>
                        <h4 style={{
                          margin: 0,
                          color: '#1f2937',
                          fontSize: '16px'
                        }}>
                          {prompt.name}
                        </h4>
                      </div>
                    </div>

                    <p style={{
                      fontSize: '13px',
                      color: '#6b7280',
                      marginBottom: '15px',
                      lineHeight: '1.4'
                    }}>
                      {prompt.why}
                    </p>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        fontWeight: 'bold'
                      }}>
                        Click to copy prompt →
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAIAssistant(prompt.aiRecommendation);
                        }}
                        style={{
                          padding: '6px 12px',
                          background: recommendedAI.color,
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                      >
                        Open {recommendedAI.name.split(' ')[0]} →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compare' && (
        <div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#1e40af', marginTop: 0 }}>⚖️ AI Assistant Comparison</h3>
            <p style={{ color: '#374151', marginBottom: '25px' }}>
              Different AI assistants excel at different types of grocery planning:
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '20px'
            }}>
              {Object.entries(aiAssistants).map(([key, ai]) => (
                <div
                  key={key}
                  style={{
                    background: 'white',
                    border: `3px solid ${ai.color}`,
                    borderRadius: '15px',
                    padding: '25px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    fontSize: '48px',
                    marginBottom: '15px'
                  }}>
                    {ai.icon}
                  </div>
                  
                  <h4 style={{
                    color: ai.color,
                    margin: '0 0 10px 0',
                    fontSize: '20px',
                    fontWeight: 'bold'
                  }}>
                    {ai.name}
                  </h4>
                  
                  <p style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginBottom: '20px'
                  }}>
                    {ai.bestFor}
                  </p>

                  <div style={{ marginBottom: '20px' }}>
                    <strong style={{ color: '#374151', fontSize: '14px' }}>Strengths:</strong>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: '10px 0',
                      fontSize: '13px',
                      color: '#6b7280'
                    }}>
                      {ai.strengths.map((strength, index) => (
                        <li key={index} style={{ marginBottom: '5px' }}>
                          ✓ {strength}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => openAIAssistant(key)}
                    style={{
                      padding: '12px 24px',
                      background: ai.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                  >
                    Try {ai.name.split(' ')[0]} Now →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'examples' && (
        <div>
          <div style={{
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '20px',
            borderRadius: '15px'
          }}>
            <h3 style={{ color: '#1e40af', marginTop: 0 }}>💡 Example AI Outputs</h3>
            <p style={{ color: '#374151', marginBottom: '25px' }}>
              See how different AIs respond to the same prompt: "Create a healthy meal plan with shopping list"
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '20px'
            }}>
              {Object.entries(aiAssistants).map(([key, ai]) => (
                <div
                  key={key}
                  style={{
                    background: 'white',
                    border: `2px solid ${ai.color}`,
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}
                >
                  <div style={{
                    background: ai.color,
                    color: 'white',
                    padding: '15px',
                    textAlign: 'center',
                    fontWeight: 'bold'
                  }}>
                    {ai.icon} {ai.name} Output
                  </div>
                  
                  <div style={{
                    padding: '20px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    backgroundColor: '#f9fafb',
                    color: '#374151',
                    lineHeight: '1.4',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {ai.example}
                  </div>
                  
                  <div style={{
                    padding: '15px',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(ai.example);
                        alert(`${ai.name} example copied! Paste into Cart Smash above.`);
                      }}
                      style={{
                        padding: '8px 16px',
                        background: ai.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      📋 Copy This Example
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div style={{
        background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
        color: 'white',
        padding: '20px',
        borderRadius: '15px',
        textAlign: 'center',
        marginTop: '25px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>
          🚀 Ready to Transform AI Ideas into Real Groceries?
        </h4>
        <p style={{ margin: '0 0 15px 0', fontSize: '14px', opacity: 0.9 }}>
          Copy any prompt above → Ask your AI → Paste the result → Hit SMASH → Get delivery!
        </p>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '15px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => openAIAssistant('claude')}
            style={{
              padding: '10px 20px',
              background: aiAssistants.claude.color,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🧠 Try Claude
          </button>
          <button
            onClick={() => openAIAssistant('chatgpt')}
            style={{
              padding: '10px 20px',
              background: aiAssistants.chatgpt.color,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            🤖 Try ChatGPT
          </button>
        </div>
      </div>

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

export default EnhancedAIHelper;