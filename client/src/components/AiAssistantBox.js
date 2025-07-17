import React, { useState } from 'react';

const AiAssistantBox = () => {
  const [selectedAI, setSelectedAI] = useState('claude');
  const [showDemo, setShowDemo] = useState(false);

  const aiOptions = {
    claude: {
      name: 'Claude',
      icon: '🤖',
      color: '#FF6B35',
      description: 'Perfect for detailed meal planning and nutrition focus',
      prompt: 'Create a healthy weekly meal plan with shopping list for a family of 4',
      strengths: ['Detailed nutrition analysis', 'Balanced meal planning', 'Dietary restrictions'],
      url: 'https://claude.ai/chat'
    },
    chatgpt: {
      name: 'ChatGPT',
      icon: '✨',
      color: '#10a37f',
      description: 'Great for budget-friendly lists and quick practical solutions',
      prompt: 'Give me a budget grocery list for quick weeknight dinners under $50',
      strengths: ['Budget optimization', 'Quick meal ideas', 'Practical cooking tips'],
      url: 'https://chat.openai.com'
    }
  };

  const demoConversations = {
    claude: {
      user: "I need a healthy meal plan for this week",
      assistant: "I'd be happy to create a nutritious weekly meal plan! Here's a balanced approach:\n\n**MONDAY - Mediterranean Monday**\n🥗 Lunch: Greek quinoa bowl\n🍽️ Dinner: Baked salmon with roasted vegetables\n\n**TUESDAY - Taco Tuesday**\n🌮 Lunch: Black bean and sweet potato salad\n🍽️ Dinner: Lean ground turkey tacos with avocado\n\n**Shopping List:**\n• 2 lbs wild-caught salmon\n• 1 lb ground turkey (93/7 lean)\n• 2 cups quinoa\n• 6 bell peppers (assorted colors)\n• 3 avocados\n• 2 cans black beans\n• Greek yogurt (plain, large container)\n• Fresh spinach (5 oz bag)\n• Sweet potatoes (3 large)\n• Olive oil (extra virgin)\n\nWould you like me to continue with the rest of the week and add nutrition information?"
    },
    chatgpt: {
      user: "Give me a budget grocery list for quick dinners",
      assistant: "Here's a budget-friendly list for 5 quick dinners under $50:\n\n**DINNER IDEAS:**\n1. Spaghetti with meat sauce\n2. Chicken fried rice\n3. Bean and cheese quesadillas\n4. Tuna pasta salad\n5. Scrambled egg breakfast-for-dinner\n\n**SHOPPING LIST ($45-50):**\n• Spaghetti pasta - $1.50\n• Ground beef (1 lb) - $5.00\n• Pasta sauce jar - $2.00\n• Frozen mixed vegetables - $2.50\n• Rice (2 lb bag) - $2.00\n• Chicken thighs (2 lbs) - $4.00\n• Flour tortillas - $2.50\n• Canned tuna (4 pack) - $4.00\n• Eggs (dozen) - $3.00\n• Cheese (shredded) - $4.00\n• Onions (3 lb bag) - $2.00\n• Cooking oil - $3.00\n• Butter - $4.00\n• Milk - $3.50\n\nEach meal serves 4 and takes under 30 minutes!"
    }
  };

  const optimizedPrompts = [
    {
      title: "Weekly Meal Planning",
      prompt: "Create a 7-day meal plan with shopping list for [family size]. Include breakfast, lunch, and dinner with [dietary preferences]. Focus on [budget/health/time] constraints.",
      icon: "📅"
    },
    {
      title: "Quick Weeknight Dinners",
      prompt: "Give me 5 quick dinner ideas that take under 30 minutes using common ingredients. Include a consolidated shopping list.",
      icon: "⚡"
    },
    {
      title: "Healthy Eating on a Budget",
      prompt: "Create a healthy grocery list for under $75 per week for [people count]. Include nutritious meals that won't break the bank.",
      icon: "💰"
    },
    {
      title: "Meal Prep Sunday",
      prompt: "Plan 4 meal prep recipes that can be made on Sunday for the work week. Include prep instructions and grocery list.",
      icon: "🥘"
    },
    {
      title: "Special Diet Planning",
      prompt: "Create a grocery list and meal ideas for [keto/vegan/gluten-free/etc] diet. Include 3 days of meals with snacks.",
      icon: "🌱"
    },
    {
      title: "Recipe Scaling",
      prompt: "Take this recipe [paste recipe] and scale it for [number] people. Give me the adjusted grocery list.",
      icon: "📊"
    }
  ];

  const copyPrompt = (prompt) => {
    navigator.clipboard.writeText(prompt);
    // Could add a toast notification here
  };

  const openAI = (aiType) => {
    window.open(aiOptions[aiType].url, '_blank');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>🤖 AI Meal Planning Assistant</h2>
        <p style={styles.subtitle}>
          Get the most out of Claude and ChatGPT for your grocery shopping
        </p>
      </div>

      {/* AI Selection */}
      <div style={styles.aiSelector}>
        {Object.entries(aiOptions).map(([key, ai]) => (
          <div
            key={key}
            style={{
              ...styles.aiOption,
              ...(selectedAI === key ? styles.aiOptionActive : {}),
              borderColor: selectedAI === key ? ai.color : '#e5e7eb'
            }}
            onClick={() => setSelectedAI(key)}
          >
            <div style={styles.aiIcon}>{ai.icon}</div>
            <div style={styles.aiInfo}>
              <h3 style={styles.aiName}>{ai.name}</h3>
              <p style={styles.aiDescription}>{ai.description}</p>
              <div style={styles.aiStrengths}>
                {ai.strengths.map((strength, index) => (
                  <span key={index} style={styles.strengthTag}>
                    {strength}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openAI(key);
              }}
              style={{
                ...styles.launchButton,
                backgroundColor: ai.color
              }}
            >
              Launch {ai.name}
            </button>
          </div>
        ))}
      </div>

      {/* Demo Toggle */}
      <div style={styles.demoSection}>
        <button
          onClick={() => setShowDemo(!showDemo)}
          style={styles.demoToggle}
        >
          {showDemo ? '📋 Hide' : '👀 Show'} Live Demo Comparison
        </button>
        
        {showDemo && (
          <div style={styles.demoContainer}>
            <div style={styles.demoGrid}>
              {Object.entries(demoConversations).map(([key, conversation]) => (
                <div key={key} style={styles.demoCard}>
                  <div style={styles.demoHeader}>
                    <span style={styles.demoAI}>
                      {aiOptions[key].icon} {aiOptions[key].name}
                    </span>
                  </div>
                  <div style={styles.demoConversation}>
                    <div style={styles.userMessage}>
                      <strong>You:</strong> {conversation.user}
                    </div>
                    <div style={styles.assistantMessage}>
                      <strong>{aiOptions[key].name}:</strong>
                      <div style={styles.responseText}>
                        {conversation.assistant}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Optimized Prompts */}
      <div style={styles.promptsSection}>
        <h3 style={styles.promptsTitle}>🎯 Optimized Prompts for Cart Smash</h3>
        <div style={styles.promptsGrid}>
          {optimizedPrompts.map((prompt, index) => (
            <div key={index} style={styles.promptCard}>
              <div style={styles.promptHeader}>
                <span style={styles.promptIcon}>{prompt.icon}</span>
                <h4 style={styles.promptTitle}>{prompt.title}</h4>
              </div>
              <p style={styles.promptText}>{prompt.prompt}</p>
              <div style={styles.promptActions}>
                <button
                  onClick={() => copyPrompt(prompt.prompt)}
                  style={styles.copyButton}
                >
                  📋 Copy Prompt
                </button>
                <button
                  onClick={() => openAI(selectedAI)}
                  style={styles.useButton}
                >
                  Use with {aiOptions[selectedAI].name}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage Tips */}
      <div style={styles.tipsSection}>
        <h3 style={styles.tipsTitle}>💡 Pro Tips for Cart Smash Success</h3>
        <div style={styles.tipsList}>
          <div style={styles.tip}>
            <span style={styles.tipNumber}>1</span>
            <div style={styles.tipContent}>
              <strong>Be Specific:</strong> Include family size, dietary restrictions, and budget in your prompts
            </div>
          </div>
          <div style={styles.tip}>
            <span style={styles.tipNumber}>2</span>
            <div style={styles.tipContent}>
              <strong>Ask for Lists:</strong> Always request "include a shopping list" in your prompt
            </div>
          </div>
          <div style={styles.tip}>
            <span style={styles.tipNumber}>3</span>
            <div style={styles.tipContent}>
              <strong>Copy & Paste:</strong> Copy the grocery list portion and paste directly into Cart Smash
            </div>
          </div>
          <div style={styles.tip}>
            <span style={styles.tipNumber}>4</span>
            <div style={styles.tipContent}>
              <strong>Hit SMASH:</strong> Watch as your AI-generated list becomes a real Instacart order!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    marginBottom: '32px',
    border: '2px solid rgba(255, 107, 53, 0.1)',
  },
  
  header: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  
  subtitle: {
    fontSize: '16px',
    color: '#6b7280',
    lineHeight: '1.5',
  },
  
  aiSelector: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  
  aiOption: {
    padding: '20px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  
  aiOptionActive: {
    backgroundColor: '#fef3cd',
    transform: 'scale(1.02)',
  },
  
  aiIcon: {
    fontSize: '32px',
    minWidth: '40px',
  },
  
  aiInfo: {
    flex: 1,
  },
  
  aiName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '4px',
  },
  
  aiDescription: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  
  aiStrengths: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  
  strengthTag: {
    fontSize: '12px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  
  launchButton: {
    padding: '8px 16px',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  
  demoSection: {
    marginBottom: '32px',
  },
  
  demoToggle: {
    width: '100%',
    padding: '12px 24px',
    backgroundColor: '#f3f4f6',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  demoContainer: {
    marginTop: '16px',
  },
  
  demoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '16px',
  },
  
  demoCard: {
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  
  demoHeader: {
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  
  demoAI: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  demoConversation: {
    padding: '16px',
  },
  
  userMessage: {
    marginBottom: '12px',
    padding: '8px 12px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    fontSize: '14px',
  },
  
  assistantMessage: {
    fontSize: '14px',
  },
  
  responseText: {
    marginTop: '8px',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    whiteSpace: 'pre-line',
    lineHeight: '1.4',
  },
  
  promptsSection: {
    marginBottom: '32px',
  },
  
  promptsTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px',
  },
  
  promptsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
  },
  
  promptCard: {
    padding: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    transition: 'border-color 0.2s',
  },
  
  promptHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  
  promptIcon: {
    fontSize: '20px',
  },
  
  promptTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  promptText: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.4',
    marginBottom: '12px',
  },
  
  promptActions: {
    display: 'flex',
    gap: '8px',
  },
  
  copyButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  
  useButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  
  tipsSection: {
    backgroundColor: '#f9fafb',
    padding: '24px',
    borderRadius: '12px',
  },
  
  tipsTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px',
  },
  
  tipsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  
  tip: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  
  tipNumber: {
    width: '24px',
    height: '24px',
    backgroundColor: '#FF6B35',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold',
    flexShrink: 0,
  },
  
  tipContent: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.5',
  },
};

export default AiAssistantBox;