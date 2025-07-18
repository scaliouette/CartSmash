// client/src/components/SmartAIAssistant.js
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
      prompt: 'Create a healthy 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and snacks.',
      category: 'planning'
    },
    {
      icon: '💰',
      title: 'Budget Shopping',
      prompt: 'Create a budget-friendly grocery list for $75 per week for 2 people. Focus on nutritious, filling meals.',
      category: 'budget'
    },
    {
      icon: '⚡',
      title: 'Quick Dinners',
      prompt: 'Give me 5 quick 30-minute dinner recipes with a complete shopping list. Family-friendly options please.',
      category: 'quick'
    },
    {
      icon: '🌱',
      title: 'Healthy Options',
      prompt: 'Create a clean eating grocery list focused on whole foods, lean proteins, and fresh vegetables for one week.',
      category: 'health'
    },
    {
      icon: '🎉',
      title: 'Party Planning',
      prompt: 'Plan a birthday party for 15 people with appetizers, main course, and desserts. Include complete shopping list.',
      category: 'party'
    },
    {
      icon: '🥗',
      title: 'Special Diet',
      prompt: 'Create a keto-friendly grocery list and meal plan for one week with all necessary ingredients.',
      category: 'diet'
    }
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
      
      const aiMessage = {
        role: 'assistant',
        content: data.response || data.message,
        timestamp: new Date(),
        model: selectedModel,
        groceryList: data.groceryList // Backend should extract grocery items
      };

      setMessages(prev => [...prev, aiMessage]);

      // If the response contains a grocery list, offer to add it to cart
      if (data.groceryList && data.groceryList.length > 0) {
        setTimeout(() => {
          if (window.confirm(`Found ${data.groceryList.length} grocery items! Add them to your cart?`)) {
            onGroceryListGenerated(data.groceryList.join('\n'));
            setIsOpen(false);
          }
        }, 1000);
      }

    } catch (error) {
      console.error('AI request failed:', error);
      
      // Fallback: Extract grocery items from a mock response
      const fallbackResponse = generateFallbackResponse(message);
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse.content,
        timestamp: new Date(),
        model: selectedModel,
        groceryList: fallbackResponse.groceryList,
        isFallback: true
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

  const generateFallbackResponse = (prompt) => {
    // This would normally come from your AI backend
    // For demo purposes, generating a realistic response
    
    const groceryItems = [
      '2 lbs chicken breast',
      '1 lb ground turkey',
      '2 cups quinoa', 
      '1 bag spinach',
      '3 bell peppers',
      '2 onions',
      '1 dozen eggs',
      '1 container Greek yogurt',
      '2 lbs sweet potatoes',
      '1 container olive oil',
      '1 lb carrots',
      '2 cans black beans'
    ];

    const response = `Here's a healthy meal plan with shopping list:

**WEEKLY MEAL PLAN**

**Monday**: Quinoa chicken bowl with roasted vegetables
**Tuesday**: Turkey and sweet potato hash  
**Wednesday**: Greek yogurt parfait with spinach smoothie
**Thursday**: Black bean and pepper stir-fry
**Friday**: Baked chicken with roasted carrots

**SHOPPING LIST:**
${groceryItems.map(item => `• ${item}`).join('\n')}

This plan focuses on lean proteins, complex carbs, and plenty of vegetables for balanced nutrition throughout the week.`;

    return {
      content: response,
      groceryList: groceryItems
    };
  };

  const handleQuickPrompt = (prompt) => {
    handleSendMessage(prompt.prompt);
  };

  const clearChat = () => {
    setMessages([]);
    setShowQuickPrompts(true);
  };

  const extractGroceryList = (content) => {
    // Simple extraction - look for bullet points or numbered lists
    const lines = content.split('\n');
    const groceryItems = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.match(/^[•\-\*\d+\.]/)) {
        const cleaned = trimmed.replace(/^[•\-\*\d+\.\s]+/, '');
        if (cleaned && !cleaned.toLowerCase().includes('meal') && !cleaned.toLowerCase().includes('day')) {
          groceryItems.push(cleaned);
        }
      }
    }
    
    return groceryItems;
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
                          <button
                            onClick={() => {
                              onGroceryListGenerated(message.groceryList.join('\n'));
                              setIsOpen(false);
                            }}
                            style={{
                              marginTop: '15px',
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