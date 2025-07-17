// client/src/components/AIAssistantHelper.js
import React, { useState } from 'react';

function AIAssistantHelper() {
  const [showHelper, setShowHelper] = useState(false);
  
  const aiPrompts = [
    {
      name: "Weekly Meal Plan",
      prompt: "Create a 7-day healthy meal plan with a complete grocery shopping list for a family of 4. Include breakfast, lunch, dinner, and snacks. Focus on nutritious, budget-friendly meals.",
      icon: "📅",
      category: "meal-planning"
    },
    {
      name: "Quick Dinners",
      prompt: "Give me 5 quick 30-minute dinner recipes with a complete shopping list of all ingredients needed.",
      icon: "⚡",
      category: "recipes"
    },
    {
      name: "Healthy Snacks",
      prompt: "List healthy snack ingredients for the week - include fresh fruits, nuts, yogurt, and other nutritious options with quantities.",
      icon: "🥗",
      category: "snacks"
    },
    {
      name: "Pantry Essentials",
      prompt: "What basic pantry staples should I always have? Include baking essentials, canned goods, spices, and cooking basics with quantities.",
      icon: "🏠",
      category: "pantry"
    },
    {
      name: "Special Diet",
      prompt: "Create a grocery list for a keto diet with meal ideas and all necessary ingredients for one week.",
      icon: "🌱",
      category: "diet"
    }
  ];

  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    // Show toast notification
    const toast = document.createElement('div');
    toast.innerHTML = '✅ Copied! Now ask your AI assistant.';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #28a745;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-weight: bold;
      z-index: 10000;
      animation: slideIn 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 3000);
  };

  return (
    <>
      <style>
        {`
          @keyframes slideIn {
            from { transform: translateX(-50%) translateY(-20px); opacity: 0; }
            to { transform: translateX(-50%) translateY(0); opacity: 1; }
          }
        `}
      </style>
      
      <div style={{
        background: 'linear-gradient(135deg, #e3f2fd, #bbdefb)',
        padding: '20px',
        borderRadius: '15px',
        marginBottom: '25px',
        border: '2px solid #2196f3',
        boxShadow: '0 4px 15px rgba(33, 150, 243, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '15px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h3 style={{ color: '#0d47a1', margin: 0, fontSize: '20px' }}>
              🤖 AI Assistant Helper
            </h3>
            <p style={{ color: '#1565c0', margin: '5px 0 0 0', fontSize: '14px' }}>
              Get help from ChatGPT, Claude, or any AI, then paste the result here!
            </p>
          </div>
          <button
            onClick={() => setShowHelper(!showHelper)}
            style={{
              padding: '10px 16px',
              background: '#2196f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = '#1976d2'}
            onMouseLeave={(e) => e.target.style.background = '#2196f3'}
          >
            {showHelper ? '🔼 Hide' : '🔽 Show'} AI Prompts
          </button>
        </div>

        {showHelper && (
          <div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '15px',
              borderRadius: '10px',
              marginBottom: '15px'
            }}>
              <h4 style={{ color: '#0d47a1', marginTop: 0 }}>📋 Quick AI Prompts</h4>
              <p style={{ color: '#1565c0', fontSize: '14px', marginBottom: '15px' }}>
                <strong>Step 1:</strong> Copy any prompt below<br/>
                <strong>Step 2:</strong> Ask your AI assistant (ChatGPT, Claude, etc.)<br/>
                <strong>Step 3:</strong> Paste their response into Cart Smash below!
              </p>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px'
              }}>
                {aiPrompts.map((prompt, index) => (
                  <div
                    key={index}
                    style={{
                      background: 'white',
                      border: '2px solid #e3f2fd',
                      borderRadius: '8px',
                      padding: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}
                    onClick={() => copyPrompt(prompt.prompt)}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = '#2196f3';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = '#e3f2fd';
                      e.target.style.transform = 'translateY(0px)';
                      e.target.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <span style={{ fontSize: '18px', marginRight: '8px' }}>
                        {prompt.icon}
                      </span>
                      <span style={{
                        fontWeight: 'bold',
                        color: '#0d47a1',
                        fontSize: '14px'
                      }}>
                        {prompt.name}
                      </span>
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: '#666',
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      Click to copy prompt →
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro tip section */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '15px',
              borderRadius: '10px',
              border: '1px solid #2196f3'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <span style={{ fontSize: '20px', marginRight: '8px' }}>💡</span>
                <strong style={{ color: '#0d47a1' }}>Pro Tips for AI Users:</strong>
              </div>
              <ul style={{ color: '#1565c0', fontSize: '14px', marginBottom: 0, paddingLeft: '20px' }}>
                <li>Works with <strong>any AI assistant</strong> - ChatGPT, Claude, Bard, etc.</li>
                <li>Paste <strong>entire AI responses</strong> - Cart Smash will extract the grocery items</li>
                <li>Include <strong>meal plans, recipes, or shopping lists</strong> - any format works!</li>
                <li>Add <strong>quantities and preferences</strong> in your AI prompt for better results</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default AIAssistantHelper;