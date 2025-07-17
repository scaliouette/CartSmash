import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import ParsedResultsDisplay from './components/ParsedResultsDisplay';
import InstacartIntegration from './components/InstacartIntegration';
import EnhancedAIHelper from './components/EnhancedAIHelper';
import confetti from 'canvas-confetti';

// AI Recipe Suggestion Component
function AIRecipeSuggestions({ onRecipeSelect }) {
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  
  const aiRecipeSuggestions = [
    {
      name: "Chicken Stir-Fry",
      image: "🥘",
      ingredients: ["2 lbs chicken breast", "2 bell peppers", "1 onion", "2 tbsp soy sauce", "1 tbsp garlic", "2 tbsp oil", "1 cup broccoli"],
      cookTime: "25 mins",
      difficulty: "Easy",
      description: "A quick and healthy dinner perfect for busy weeknights"
    },
    {
      name: "Mediterranean Bowl",
      image: "🥗",
      ingredients: ["1 cup quinoa", "1 cucumber", "2 tomatoes", "1/2 cup feta cheese", "1/4 cup olives", "2 tbsp olive oil", "1 lemon"],
      cookTime: "20 mins",
      difficulty: "Easy",
      description: "Fresh and nutritious Mediterranean flavors"
    },
    {
      name: "Pasta Carbonara",
      image: "🍝",
      ingredients: ["1 lb spaghetti", "6 oz pancetta", "4 eggs", "1 cup parmesan", "2 cloves garlic", "Black pepper", "Salt"],
      cookTime: "30 mins",
      difficulty: "Medium",
      description: "Classic Italian comfort food"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRecipeIndex((prev) => (prev + 1) % aiRecipeSuggestions.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentRecipe = aiRecipeSuggestions[currentRecipeIndex];

  return (
    <div style={styles.aiRecipeSection}>
      <h2 style={styles.recipeSectionTitle}>What recipe would you like to make?</h2>
      
      <div style={styles.featuredRecipe}>
        <div style={styles.recipeHeader}>
          <div style={styles.aiLabel}>
            <div style={styles.aiIcon}>✨</div>
            <span style={styles.aiText}>AI</span>
            <span style={styles.suggestionText}>How about {currentRecipe.name}?</span>
          </div>
          <div style={styles.recipeEmoji}>{currentRecipe.image}</div>
        </div>
        
        <p style={styles.recipeDescription}>{currentRecipe.description}</p>
        
        <div style={styles.ingredientGrid}>
          {currentRecipe.ingredients.slice(0, 4).map((ingredient, index) => (
            <div key={index} style={styles.ingredientTag}>
              {ingredient}
            </div>
          ))}
          {currentRecipe.ingredients.length > 4 && (
            <div style={styles.moreIngredientsTag}>
              +{currentRecipe.ingredients.length - 4} more
            </div>
          )}
        </div>
        
        <div style={styles.recipeStats}>
          <span style={styles.recipeStat}>🕒 {currentRecipe.cookTime}</span>
          <span style={styles.recipeStat}>📊 {currentRecipe.difficulty}</span>
          <span style={styles.recipeStat}>⭐ 4.8/5</span>
        </div>
        
        <div style={styles.recipeActions}>
          <button
            onClick={() => onRecipeSelect(currentRecipe)}
            style={styles.addIngredientsBtn}
          >
            Add Ingredients to List
          </button>
          <button
            onClick={() => window.open('https://claude.ai/chat', '_blank')}
            style={styles.customRecipeBtn}
          >
            Ask AI for Custom Recipe
          </button>
        </div>
      </div>

      <div style={styles.recipeGrid}>
        {aiRecipeSuggestions.map((recipe, index) => (
          <div
            key={index}
            style={{
              ...styles.recipeCard,
              ...(index === currentRecipeIndex ? styles.activeRecipeCard : {})
            }}
            onClick={() => setCurrentRecipeIndex(index)}
          >
            <div style={styles.recipeCardEmoji}>{recipe.image}</div>
            <h3 style={styles.recipeCardTitle}>{recipe.name}</h3>
            <p style={styles.recipeCardMeta}>{recipe.cookTime} • {recipe.difficulty}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecipeSelect(recipe);
              }}
              style={styles.useRecipeBtn}
            >
              Use This Recipe
            </button>
          </div>
        ))}
      </div>
      
      <button style={styles.exploreRecipesBtn}>
        <span style={styles.chefIcon}>👨‍🍳</span>
        Explore More Recipes
      </button>
    </div>
  );
}

// Enhanced SMASH Button with viral effects
function SmashButton({ onSubmit, isDisabled, itemCount, isLoading }) {
  const [isSmashing, setIsSmashing] = useState(false);
  const [buttonText, setButtonText] = useState('🛒 SMASH 🛒');

  const triggerConfetti = () => {
    const count = 200;
    const defaults = { origin: { y: 0.7 } };

    function fire(particleRatio, opts) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio)
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
      colors: ['#FF6B35', '#F7931E', '#FFD23F']
    });

    fire(0.2, {
      spread: 60,
      colors: ['#FF6B35', '#F7931E', '#FFD23F', '#FFFFFF']
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
      colors: ['#FF6B35', '#F7931E', '#FFD23F']
    });
  };

  const handleSmash = async (e) => {
    e.preventDefault();
    setIsSmashing(true);
    triggerConfetti();
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    const smashTexts = [
      '💥 SMASHING! 💥',
      '🔥 DESTROYING! 🔥', 
      '⚡ PROCESSING! ⚡',
      '🚀 LAUNCHING! 🚀'
    ];
    
    let textIndex = 0;
    const textInterval = setInterval(() => {
      setButtonText(smashTexts[textIndex % smashTexts.length]);
      textIndex++;
    }, 300);

    try {
      await onSubmit(e);
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#28a745', '#20c997', '#17a2b8']
        });
      }, 500);
    } finally {
      clearInterval(textInterval);
      setButtonText('🛒 SMASH 🛒');
      setIsSmashing(false);
    }
  };

  return (
    <button 
      onClick={handleSmash}
      disabled={isDisabled || isLoading}
      style={{
        ...styles.smashButton,
        background: isDisabled ? '#ccc' : 'linear-gradient(45deg, #FF6B35, #F7931E, #FFD23F)',
        transform: isSmashing ? 'scale(0.98)' : 'scale(1)',
        boxShadow: isSmashing 
          ? '0 0 20px rgba(255, 107, 53, 0.8), inset 0 0 20px rgba(255, 107, 53, 0.3)'
          : '0 4px 15px rgba(255, 107, 53, 0.4)',
        animation: isSmashing ? 'shake 0.5s ease-in-out infinite' : 'none',
      }}
    >
      {buttonText}
    </button>
  );
}

// Enhanced Grocery List Form
function GroceryListForm() {
  const [inputText, setInputText] = useState('');
  const [parsedItems, setParsedItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [cartAction, setCartAction] = useState('merge');
  const [showResults, setShowResults] = useState(false);
  
  const { currentUser, saveCartToFirebase } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputText.trim()) {
      setError('Please enter a grocery list');
      return;
    }

    setIsLoading(true);
    setError('');
    setParsedItems([]);
    setShowResults(false);

    try {
      const response = await fetch('/api/cart/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: inputText,
          action: cartAction,
          userId: currentUser?.uid || null
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      let items = data.cart || data.items || [];
      
      if (items && items.length > 0) {
        setParsedItems(items);
        setShowResults(true);
        
        if (currentUser) {
          try {
            await saveCartToFirebase(items);
          } catch (firebaseError) {
            console.warn('Failed to save cart to Firebase:', firebaseError);
          }
        }
      } else {
        setError('No items were parsed from your list');
      }
      
    } catch (err) {
      console.error('Parse error:', err);
      setError(`Failed to parse grocery list: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeSelect = (recipe) => {
    const recipeList = recipe.ingredients.join('\n');
    setInputText(recipeList);
  };

  const handleItemsChange = (updatedItems) => {
    setParsedItems(updatedItems);
    
    if (currentUser) {
      try {
        saveCartToFirebase(updatedItems);
      } catch (firebaseError) {
        console.warn('Failed to save updated cart to Firebase:', firebaseError);
      }
    }
  };

  const handleNewList = () => {
    setInputText('');
    setParsedItems([]);
    setShowResults(false);
    setError('');
  };

  return (
    <div style={styles.container}>
      {/* Hero Section */}
      <div style={styles.heroSection}>
        <h1 style={styles.heroTitle}>
          Smash That List.
          <br />
          <span style={styles.heroAccent}>Instantly.</span>
        </h1>
        <p style={styles.heroSubtitle}>
          Turn any AI-generated grocery list into a ready-to-order Instacart cart in seconds.
        </p>
      </div>

      {/* Enhanced AI Helper */}
      <div style={styles.aiHelperSection}>
        <EnhancedAIHelper />
      </div>

      {/* Main Input Section */}
      <form onSubmit={handleSubmit} style={styles.mainForm}>
        <div style={styles.inputSection}>
          <label style={styles.inputLabel}>
            Paste Grocery List
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={styles.textarea}
            placeholder="Paste your AI-generated grocery list here...

Example:
2 lbs chicken breast
1 cup quinoa
2 bell peppers
1 onion
2 tbsp olive oil"
            rows="8"
          />
        </div>
        
        <div style={styles.actionSelector}>
          <label style={styles.actionLabel}>Cart Action:</label>
          <div style={styles.actionOptions}>
            <label style={styles.actionOption}>
              <input
                type="radio"
                value="merge"
                checked={cartAction === 'merge'}
                onChange={(e) => setCartAction(e.target.value)}
              />
              <span>🔀 Merge with existing cart</span>
            </label>
            <label style={styles.actionOption}>
              <input
                type="radio"
                value="replace"
                checked={cartAction === 'replace'}
                onChange={(e) => setCartAction(e.target.value)}
              />
              <span>🔥 Replace entire cart</span>
            </label>
          </div>
        </div>

        {error && (
          <div style={styles.errorMessage}>
            ❌ {error}
          </div>
        )}

        <div style={styles.buttonGroup}>
          <SmashButton
            onSubmit={handleSubmit}
            isDisabled={!inputText.trim()}
            isLoading={isLoading}
            itemCount={parsedItems.length}
          />
          
          {showResults && (
            <button
              type="button"
              onClick={handleNewList}
              style={styles.newListButton}
            >
              📝 New List
            </button>
          )}
        </div>
      </form>

      {/* AI Recipe Suggestions */}
      <AIRecipeSuggestions onRecipeSelect={handleRecipeSelect} />

      {/* Results Display */}
      {showResults && parsedItems.length > 0 && (
        <ParsedResultsDisplay 
          items={parsedItems} 
          currentUser={currentUser}
          onItemsChange={handleItemsChange}
        />
      )}

      {/* Instacart Integration */}
      {showResults && parsedItems.length > 0 && (
        <InstacartIntegration 
          items={parsedItems}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// Auth Status Component
function AuthStatus() {
  const { currentUser, signOut, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (isLoading) return (
    <div style={styles.authStatus}>
      Loading...
    </div>
  );

  if (currentUser) {
    return (
      <div style={styles.authStatusLoggedIn}>
        <span style={styles.userGreeting}>
          👋 {currentUser.displayName || currentUser.email.split('@')[0]}
        </span>
        <button 
          onClick={signOut}
          style={styles.signOutButton}
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={styles.authStatus}>
        <button
          onClick={() => setShowAuthModal(true)}
          style={styles.signInButton}
        >
          🔐 Sign In to Save Carts
        </button>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
}

// Main App Component
function App() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <AuthProvider>
      <div style={styles.app}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logo}>
              <div style={styles.logoIcon}>🛒</div>
              <span style={styles.logoText}>CART SMASH</span>
            </div>
            
            <div style={styles.headerActions}>
              <button style={styles.loginButton}>Log In</button>
              <button style={styles.ctaButton}>Start Converting Your List</button>
            </div>
          </div>
        </header>

        <AuthStatus />
        
        <main style={styles.main}>
          <GroceryListForm />
        </main>
        
        {/* Features Section */}
        <section style={styles.featuresSection}>
          <div style={styles.featuresGrid}>
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>✨</div>
              <h3 style={styles.featureTitle}>AI-Powered</h3>
              <p style={styles.featureDescription}>Advanced AI parsing handles any grocery list format</p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>⚡</div>
              <h3 style={styles.featureTitle}>Lightning Fast</h3>
              <p style={styles.featureDescription}>Convert lists to carts in under 5 seconds</p>
            </div>
            
            <div style={styles.featureCard}>
              <div style={styles.featureIcon}>👥</div>
              <h3 style={styles.featureTitle}>Social Ready</h3>
              <p style={styles.featureDescription}>Share recipes and shopping lists with friends</p>
            </div>
          </div>
        </section>
      </div>
    </AuthProvider>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: 'linear-gradient(to-br, from-orange-50, to-yellow-50)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  header: {
    backgroundColor: 'white',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    padding: '16px 24px',
  },
  
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  logoIcon: {
    padding: '8px',
    backgroundColor: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    borderRadius: '8px',
    fontSize: '20px',
  },
  
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  
  loginButton: {
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    padding: '8px 16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'color 0.2s',
  },
  
  ctaButton: {
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 24px',
  },
  
  container: {
    width: '100%',
  },
  
  heroSection: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  
  heroTitle: {
    fontSize: 'clamp(36px, 8vw, 64px)',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '24px',
    lineHeight: '1.1',
  },
  
  heroAccent: {
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  
  heroSubtitle: {
    fontSize: '20px',
    color: '#6b7280',
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: '1.6',
  },
  
  aiHelperSection: {
    marginBottom: '32px',
  },
  
  mainForm: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    marginBottom: '48px',
  },
  
  inputSection: {
    marginBottom: '24px',
  },
  
  inputLabel: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.5',
    minHeight: '160px',
    transition: 'border-color 0.2s',
    outline: 'none',
  },
  
  actionSelector: {
    marginBottom: '24px',
  },
  
  actionLabel: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '12px',
  },
  
  actionOptions: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  
  actionOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  
  errorMessage: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    marginBottom: '24px',
    fontSize: '16px',
  },
  
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  
  smashButton: {
    flex: 1,
    border: 'none',
    padding: '16px 32px',
    color: 'white',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  
  newListButton: {
    padding: '16px 24px',
    backgroundColor: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
  
  aiRecipeSection: {
    marginBottom: '48px',
  },
  
  recipeSectionTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: '32px',
  },
  
  featuredRecipe: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
    marginBottom: '32px',
  },
  
  recipeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  
  aiLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  aiIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: 'linear-gradient(45deg, #10b981, #3b82f6)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
  },
  
  aiText: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  
  suggestionText: {
    color: '#6b7280',
  },
  
  recipeEmoji: {
    fontSize: '48px',
  },
  
  recipeDescription: {
    color: '#6b7280',
    fontSize: '16px',
    marginBottom: '24px',
  },
  
  ingredientGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  
  ingredientTag: {
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
  },
  
  moreIngredientsTag: {
    padding: '12px',
    backgroundColor: '#fef3cd',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#d97706',
    fontWeight: '600',
  },
  
  recipeStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '24px',
  },
  
  recipeStat: {
    fontSize: '14px',
    color: '#6b7280',
  },
  
  recipeActions: {
    display: 'flex',
    gap: '16px',
  },
  
  addIngredientsBtn: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  
  customRecipeBtn: {
    padding: '12px 24px',
    border: '2px solid #FF6B35',
    color: '#FF6B35',
    backgroundColor: 'transparent',
    borderRadius: '8px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  
  recipeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  
  recipeCard: {
    padding: '24px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: 'white',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    border: '2px solid transparent',
    textAlign: 'center',
  },
  
  activeRecipeCard: {
    background: 'linear-gradient(135deg, #fef3cd, #fed7aa)',
    borderColor: '#f59e0b',
  },
  
  recipeCardEmoji: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  
  recipeCardTitle: {
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px',
  },
  
  recipeCardMeta: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  
  useRecipeBtn: {
    width: '100%',
    padding: '8px 16px',
    backgroundColor: '#FF6B35',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  
  exploreRecipesBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    margin: '0 auto',
    padding: '16px 32px',
    backgroundColor: 'linear-gradient(45deg, #3b82f6, #8b5cf6)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  
  chefIcon: {
    fontSize: '20px',
  },
  
  featuresSection: {
    padding: '48px 24px',
    backgroundColor: '#f9fafb',
  },
  
  featuresGrid: {
    maxWidth: '1000px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '32px',
  },
  
  featureCard: {
    textAlign: 'center',
    padding: '24px',
  },
  
  featureIcon: {
    width: '64px',
    height: '64px',
    backgroundColor: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '24px',
  },
  
  featureTitle: {
    fontWeight: 'bold',
    fontSize: '20px',
    color: '#1f2937',
    marginBottom: '8px',
  },
  
  featureDescription: {
    color: '#6b7280',
  },
  
  authStatus: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: 1000,
  },
  
  authStatusLoggedIn: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #c3e6cb',
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  
  userGreeting: {
    color: '#155724',
    fontWeight: 'bold',
  },
  
  signOutButton: {
    padding: '6px 12px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  
  signInButton: {
    padding: '12px 20px',
    background: 'linear-gradient(45deg, #FF6B35, #F7931E)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 10px rgba(255, 107, 53, 0.3)',
    transition: 'transform 0.2s ease',
  },
};

export default App;