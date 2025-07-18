// client/src/components/SmartAIAssistant.js - FIXED VERSION
import React, { useState, useRef, useEffect } from 'react';

function SmartAIAssistant({ onGroceryListGenerated }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude');
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  const messagesEndRef = useRef(null);

  const aiModels = {
    claude: {
      name: 'Claude (Anthropic)',
      icon: '🧠',
      color: '#D97706',
      description: 'Best for detailed meal planning and nutrition',
      endpoint: '/api/ai/claude'
    },
    chatgpt: {
      name: 'ChatGPT (OpenAI)', 
      icon: '🤖',
      color: '#059669',
      description: 'Great for quick lists and budget planning',
      endpoint: '/api/ai/chatgpt'
    }
  };

  const quickPrompts = [
    {
      icon: '📅',
      title: 'Weekly Meal Plan',
      prompt: 'Create a healthy 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and snacks. Format the grocery list as individual items, one per line.',
      category: 'planning'
    },
    {
      icon: '💰',
      title: 'Budget Shopping',
      prompt: 'Create a budget-friendly grocery list for $75 per week for 2 people. Focus on nutritious, filling meals. Format as a simple grocery list with each item on a separate line.',
      category: 'budget'
    },
    {
      icon: '⚡',
      title: 'Quick Dinners',
      prompt: 'Give me 5 quick 30-minute dinner recipes with a complete shopping list. Family-friendly options please. Provide just the grocery list at the end, one item per line.',
      category: 'quick'
    },
    {
      icon: '🌱',
      title: 'Healthy Options',
      prompt: 'Create a clean eating grocery list focused on whole foods, lean proteins, and fresh vegetables for one week. List each grocery item on a separate line.',
      category: 'health'
    },
    {
      icon: '🎉',
      title: 'Party Planning',
      prompt: 'Plan a birthday party for 15 people with appetizers, main course, and desserts. Include complete shopping list with each item on a separate line.',
      category: 'party'
    },
    {
      icon: '🥗',
      title: 'Special Diet',
      prompt: 'Create a keto-friendly grocery list and meal plan for one week with all necessary ingredients. List each grocery item on a separate line.',
      category: 'diet'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ✅ IMPROVED: Enhanced grocery list extraction
  const extractGroceryItems = (text) => {
    console.log('🔍 Extracting grocery items from AI response...');
    
    const lines = text.split('\n');
    const groceryItems = [];
    let inGrocerySection = false;
    
    // Keywords that indicate grocery list sections
    const groceryHeaders = ['shopping list', 'grocery list', 'ingredients', 'you need', 'buy', 'purchase'];
    const excludePatterns = [
      /recipe/i, /instructions/i, /directions/i, /steps/i, /method/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /breakfast|lunch|dinner|snack/i, /day \d+/i, /week \d+/i,
      /serves/i, /calories/i, /prep time/i, /cook time/i, /total:/i
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if we're entering a grocery list section
      if (groceryHeaders.some(header => line.toLowerCase().includes(header))) {
        inGrocerySection = true;
        continue;
      }
      
      // If we hit a new section header, we might be leaving grocery section
      if (line.match(/^\*\*[^*]+\*\*$/) || line.match(/^#{1,6}\s/)) {
        if (!groceryHeaders.some(header => line.toLowerCase().includes(header))) {
          inGrocerySection = false;
        }
        continue;
      }
      
      // Look for bullet points, numbers, or dashes (grocery list items)
      const bulletMatch = line.match(/^[•\-\*\d+\.\)\s]*(.+)$/);
      if (bulletMatch) {
        let cleanedItem = bulletMatch[1].trim();
        
        // Remove markdown formatting
        cleanedItem = cleanedItem.replace(/\*\*/g, '').replace(/\*/g, '');
        
        // Skip if it matches exclude patterns
        if (excludePatterns.some(pattern => pattern.test(cleanedItem))) {
          continue;
        }
        
        // Skip if it's too short or looks like a header
        if (cleanedItem.length < 3 || cleanedItem.endsWith(':')) {
          continue;
        }
        
        // Skip if it contains cooking instructions
        if (cleanedItem.toLowerCase().includes('cook') || 
            cleanedItem.toLowerCase().includes('bake') ||
            cleanedItem.toLowerCase().includes('heat') ||
            cleanedItem.toLowerCase().includes('serve')) {
          continue;
        }
        
        // Check if it looks like a grocery item
        const hasQuantity = /^\d+/.test(cleanedItem) || 
                           cleanedItem.match(/\b\d+\s*(lb|lbs|oz|cup|cups|tbsp|tsp|clove|cloves|bunch|bag|container|jar|can|bottle|loaf|dozen|pack)\b/i);
        
        const hasCommonFood = /\b(chicken|beef|pork|fish|salmon|turkey|eggs|milk|cheese|bread|rice|pasta|oil|onion|garlic|tomato|potato|apple|banana|spinach|lettuce|yogurt|butter|flour|sugar|salt|pepper|beans|lentils|quinoa|oats|carrot|broccoli|avocado|strawberry|blueberry)\b/i.test(cleanedItem);
        
        // If we're in a grocery section OR it has quantity OR it's a common food, include it
        if (inGrocerySection || hasQuantity || hasCommonFood) {
          if (!groceryItems.includes(cleanedItem)) {
            groceryItems.push(cleanedItem);
          }
        }
      }
    }
    
    console.log(`✅ Extracted ${groceryItems.length} grocery items:`, groceryItems.slice(0, 5));
    return groceryItems;
  };

  const handleSendMessage = async (message = inputText) => {
    if (!message.trim() || isLoading) return;

    const userMessage = { 
      role: 'user', 
      content: message, 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setShowQuickPrompts(false);

    try {
      const selectedModelData = aiModels[selectedModel];
      console.log(`🤖 Sending request to ${selectedModelData.name}...`);
      
      const response = await fetch(selectedModelData.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: message,
          context: 'grocery_list_generation'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('🎯 AI Response received:', data);
      
      // ✅ IMPROVED: Extract grocery items from the response text
      const aiResponseText = data.response || data.message || '';
      let extractedItems = [];
      
      // First try the server-provided grocery list
      if (data.groceryList && Array.isArray(data.groceryList) && data.groceryList.length > 0) {
        extractedItems = data.groceryList;
      } else {
        // If no grocery list provided, extract from the response text
        extractedItems = extractGroceryItems(aiResponseText);
      }
      
      const aiMessage = {
        role: 'assistant',
        content: aiResponseText,
        timestamp: new Date(),
        model: selectedModel,
        groceryList: extractedItems,
        isFallback: data.fallback || false
      };

      setMessages(prev => [...prev, aiMessage]);

      // ✅ IMPROVED: Auto-offer to add grocery items if found
      if (extractedItems && extractedItems.length > 0) {
        console.log(`🛒 Found ${extractedItems.length} grocery items, offering to add to cart...`);
        setTimeout(() => {
          const confirmMessage = `Found ${extractedItems.length} grocery items! Add them to your cart?\n\nFirst few items:\n${extractedItems.slice(0, 3).map(item => `• ${item}`).join('\n')}${extractedItems.length > 3 ? '\n...and more' : ''}`;
          
          if (window.confirm(confirmMessage)) {
            // Format the items properly for the main form
            const formattedList = extractedItems.join('\n');
            console.log('📝 Sending grocery list to main form:', formattedList);
            
            onGroceryListGenerated(formattedList);
            setIsOpen(false);
          }
        }, 1000);
      } else {
        console.log('⚠️ No grocery items found in AI response');
      }

    } catch (error) {
      console.error('🚨 AI request failed:', error);
      
      // ✅ IMPROVED: Better fallback with more realistic grocery extraction
      const fallbackResponse = generateFallbackResponse(message);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        model: selectedModel,
        groceryList: fallbackResponse.groceryList,
        isFallback: true,
        error: true
      }]);

      if (fallbackResponse.groceryList.length > 0) {
        setTimeout(() => {
          if (window.confirm(`Found ${fallbackResponse.groceryList.length} grocery items! Add them to your cart?`)) {
            onGroceryListGenerated(fallbackResponse.groceryList.join('\n'));
            setIsOpen(false);
          }
        }, 1000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ IMPROVED: Better fallback response generation
  const generateFallbackResponse = (prompt) => {
    console.log('🔄 Generating fallback response for:', prompt.substring(0, 50));
    
    let groceryItems = [];
    let response = '';

    if (prompt.toLowerCase().includes('meal plan') || prompt.toLowerCase().includes('weekly')) {
      groceryItems = [
        '2 lbs chicken breast',
        '1 lb ground turkey',
        '2 cups quinoa', 
        '1 bag spinach (5oz)',
        '3 bell peppers',
        '2 large onions',
        '1 dozen eggs',
        '1 container Greek yogurt (32oz)',
        '2 lbs sweet potatoes',
        '1 bottle olive oil',
        '2 lbs carrots',
        '2 cans black beans',
        '1 loaf whole grain bread',
        '1 gallon milk',
        '1 lb cheddar cheese'
      ];

      response = `Here's a healthy weekly meal plan with shopping list:

**WEEKLY MEAL PLAN**

**Monday**: Quinoa chicken bowl with roasted vegetables
**Tuesday**: Turkey and sweet potato hash  
**Wednesday**: Greek yogurt parfait with spinach smoothie
**Thursday**: Black bean and pepper stir-fry
**Friday**: Baked chicken with roasted carrots

**SHOPPING LIST:**
${groceryItems.map(item => `• ${item}`).join('\n')}

This plan focuses on lean proteins, complex carbs, and plenty of vegetables for balanced nutrition.`;

    } else if (prompt.toLowerCase().includes('budget')) {
      groceryItems = [
        '3 lbs ground turkey',
        '1 whole chicken',
        '2 dozen eggs',
        '1 lb dried black beans',
        '5 lb bag potatoes',
        '2 lb bag carrots',
        '1 bag yellow onions',
        '1 head cabbage',
        '3 lbs bananas',
        '5 lbs rice',
        '2 lbs pasta',
        '1 container oats',
        '1 jar peanut butter',
        '1 bottle cooking oil'
      ];

      response = `Budget-friendly grocery plan for the week:

**BUDGET GROCERIES ($75 total)**

${groceryItems.map(item => `• ${item}`).join('\n')}

This plan maximizes nutrition per dollar while providing satisfying, filling meals.`;

    } else if (prompt.toLowerCase().includes('quick') || prompt.toLowerCase().includes('30 minute')) {
      groceryItems = [
        '2 lbs ground beef',
        '2 lbs chicken thighs',
        '1 dozen eggs',
        '2 lbs spaghetti',
        '2 cups jasmine rice',
        '8 flour tortillas',
        '3 bell peppers',
        '1 bag frozen mixed vegetables',
        '6 cloves garlic',
        '1 large onion',
        '1 bottle soy sauce',
        '1 bottle olive oil',
        '1 bag shredded cheese'
      ];

      response = `Quick 30-minute dinner shopping list:

**QUICK MEAL INGREDIENTS:**

${groceryItems.map(item => `• ${item}`).join('\n')}

Perfect for busy weeknights with simple, fast preparation!`;

    } else {
      // Default response
      groceryItems = [
        '2 lbs protein of choice',
        '1 bag mixed vegetables',
        '3 pieces fruit',
        '1 dozen eggs',
        '1 gallon milk',
        '2 cups rice',
        '1 loaf bread',
        '1 bottle olive oil',
        '1 onion',
        '2 cloves garlic'
      ];

      response = `Here's a basic grocery list based on your request:

**ESSENTIAL GROCERIES:**

${groceryItems.map(item => `• ${item}`).join('\n')}

This covers basic nutrition needs with flexibility for various meals.`;
    }

    return { content: response, groceryList: groceryItems };
  };

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt.prompt);
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
  };

  const selectedModelData = aiModels[selectedModel];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '30px',
          right: '30px',
          width: '70px',
          height: '70px',
          backgroundColor: selectedModelData.color,
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
          e.target.style.boxShadow = '0 6px 25px rgba(0,0,0,0.4)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';
        }}
      >
        {selectedModelData.icon}
      </button>

      {/* AI Chat Modal */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '800px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 50px rgba(0,0,0,0.3)'
          }}>
            {/* Header */}
            <div style={{
              background: `linear-gradient(135deg, ${selectedModelData.color}, ${selectedModelData.color}dd)`,
              color: 'white',
              padding: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px' }}>
                  {selectedModelData.icon} AI Grocery Assistant
                </h2>
                <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
                  {selectedModelData.description}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Model Selector */}
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  {Object.entries(aiModels).map(([key, model]) => (
                    <option key={key} value={key} style={{ color: 'black' }}>
                      {model.icon} {model.name.split(' ')[0]}
                    </option>
                  ))}
                </select>
                
                <button
                  onClick={clearChat}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  🗑️ Clear
                </button>
                
                <button
                  onClick={() => setIsOpen(false)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '18px'
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              backgroundColor: '#f8f9fa'
            }}>
              {messages.length === 0 && showQuickPrompts ? (
                <div>
                  <h3 style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
                    🎯 What would you like help with?
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '15px',
                    marginBottom: '30px'
                  }}>
                    {quickPrompts.map((prompt, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickPrompt(prompt)}
                        style={{
                          padding: '20px',
                          backgroundColor: 'white',
                          border: `2px solid ${selectedModelData.color}20`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = selectedModelData.color;
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = `${selectedModelData.color}20`;
                          e.target.style.transform = 'translateY(0px)';
                        }}
                      >
                        <div style={{
                          fontSize: '24px',
                          marginBottom: '10px'
                        }}>
                          {prompt.icon}
                        </div>
                        <h4 style={{
                          margin: '0 0 8px 0',
                          color: '#333',
                          fontSize: '16px'
                        }}>
                          {prompt.title}
                        </h4>
                        <p style={{
                          margin: 0,
                          color: '#666',
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}>
                          {prompt.prompt.substring(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      style={{
                        marginBottom: '20px',
                        display: 'flex',
                        justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        padding: '15px 20px',
                        borderRadius: message.role === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px',
                        backgroundColor: message.role === 'user' ? selectedModelData.color : 'white',
                        color: message.role === 'user' ? 'white' : '#333',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}>
                        {message.role === 'assistant' && (
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            {aiModels[message.model]?.icon} {aiModels[message.model]?.name.split(' ')[0]}
                            {message.isFallback && (
                              <span style={{ 
                                background: '#ffc107', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                Demo Mode
                              </span>
                            )}
                            {message.error && (
                              <span style={{ 
                                background: '#dc3545', 
                                color: 'white', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                fontSize: '10px'
                              }}>
                                Error - Using Fallback
                              </span>
                            )}
                          </div>
                        )}
                        
                        <div style={{
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5',
                          fontSize: '14px'
                        }}>
                          {message.content}
                        </div>
                        
                        {message.groceryList && message.groceryList.length > 0 && (
                          <div style={{ marginTop: '15px' }}>
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              marginBottom: '8px'
                            }}>
                              ✅ Found {message.groceryList.length} grocery items
                            </div>
                            <button
                              onClick={() => {
                                onGroceryListGenerated(message.groceryList.join('\n'));
                                setIsOpen(false);
                              }}
                              style={{
                                padding: '10px 15px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold'
                              }}
                            >
                              🛒 Add {message.groceryList.length} Items to Cart
                            </button>
                          </div>
                        )}
                        
                        <div style={{
                          fontSize: '10px',
                          color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : '#999',
                          marginTop: '8px'
                        }}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        padding: '15px 20px',
                        borderRadius: '20px 20px 20px 5px',
                        backgroundColor: 'white',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: `3px solid ${selectedModelData.color}`,
                          borderTop: '3px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <span style={{ color: '#666' }}>
                          {selectedModelData.name.split(' ')[0]} is thinking...
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div style={{
              padding: '20px',
              borderTop: '1px solid #eee',
              backgroundColor: 'white'
            }}>
              <div style={{
                display: 'flex',
                gap: '15px',
                alignItems: 'flex-end'
              }}>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Ask for meal plans, grocery lists, recipes, or anything food-related..."
                  style={{
                    flex: 1,
                    padding: '15px',
                    border: '2px solid #eee',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    minHeight: '60px',
                    maxHeight: '120px',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = selectedModelData.color}
                  onBlur={(e) => e.target.style.borderColor = '#eee'}
                />
                
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputText.trim() || isLoading}
                  style={{
                    padding: '15px 25px',
                    backgroundColor: !inputText.trim() || isLoading ? '#ccc' : selectedModelData.color,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: !inputText.trim() || isLoading ? 'not-allowed' : 'pointer',
                    minWidth: '80px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {isLoading ? '...' : '🚀 Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
}

export default SmartAIAssistant;