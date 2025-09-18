// client/src/components/SimplifiedAIHelper.js - Clean, Simple AI Interface
import React, { useState } from 'react';
import { safeExtractIngredientString } from '../utils/ingredientUtils';

const SimplifiedAIHelper = ({ onProductsGenerated }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [selectedService, setSelectedService] = useState('claude');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!prompt.trim()) {
      setError('Please enter a request');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Use the simplified API endpoint
      const endpoint = selectedService === 'claude' ? '/claude' : '/chatgpt';
      const apiUrl = process.env.NODE_ENV === 'production' 
        ? `https://cartsmash-server.vercel.app/api/ai-simple${endpoint}`
        : `http://localhost:${process.env.REACT_APP_SERVER_PORT || 3001}/api/ai-simple${endpoint}`;

      console.log('📡 Calling simplified AI API:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Simplified AI response:', data);

      if (data.success) {
        setResponse(data);
        
        // Pass products to parent component if callback provided
        if (onProductsGenerated && data.products) {
          onProductsGenerated(data.products);
        }
      } else {
        throw new Error(data.error || 'AI request failed');
      }

    } catch (error) {
      console.error('❌ Simplified AI error:', error);
      setError(error.message || 'Failed to process your request');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResponse(null);
    setError(null);
    setPrompt('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>🤖 Simplified AI Assistant</h3>
        <p style={styles.subtitle}>
          Simple, reliable AI-powered grocery lists and recipes
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Service Selection */}
        <div style={styles.serviceSelector}>
          <label style={styles.label}>AI Service:</label>
          <div style={styles.buttonGroup}>
            <button
              type="button"
              onClick={() => setSelectedService('claude')}
              style={{
                ...styles.serviceButton,
                ...(selectedService === 'claude' ? styles.serviceButtonActive : {})
              }}
            >
              🤖 Claude
            </button>
            <button
              type="button"
              onClick={() => setSelectedService('chatgpt')}
              style={{
                ...styles.serviceButton,
                ...(selectedService === 'chatgpt' ? styles.serviceButtonActive : {})
              }}
            >
              🧠 ChatGPT
            </button>
          </div>
        </div>

        {/* Input */}
        <div style={styles.inputGroup}>
          <label htmlFor="ai-prompt" style={styles.label}>
            What would you like help with?
          </label>
          <textarea
            id="ai-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Examples:
• Create a grocery list for a family of 4
• I need a meal plan for this week  
• Help me make chicken pasta
• Shopping list for healthy snacks"
            style={styles.textarea}
            rows={4}
            disabled={loading}
          />
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            style={{
              ...styles.submitButton,
              ...(loading ? styles.submitButtonDisabled : {})
            }}
          >
            {loading ? '🔄 Processing...' : '✨ Generate'}
          </button>
          
          {(response || error) && (
            <button
              type="button"
              onClick={clearResults}
              style={styles.clearButton}
            >
              🗑️ Clear
            </button>
          )}
        </div>
      </form>

      {/* Error Display */}
      {error && (
        <div style={styles.error}>
          <strong>❌ Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {response && (
        <div style={styles.results}>
          <div style={styles.resultHeader}>
            <h4 style={styles.resultTitle}>✅ Results</h4>
            <div style={styles.resultStats}>
              <span style={styles.stat}>
                🛒 {response.stats?.productsFound || 0} products
              </span>
              <span style={styles.stat}>
                📝 {response.stats?.recipesFound || 0} recipes
              </span>
              <span style={styles.stat}>
                🤖 {response.model || 'AI'}
              </span>
            </div>
          </div>

          {/* Products List */}
          {response.products && response.products.length > 0 && (
            <div style={styles.section}>
              <h5 style={styles.sectionTitle}>🛒 Grocery List</h5>
              <ul style={styles.productList}>
                {response.products.map((product, index) => (
                  <li key={index} style={styles.productItem}>
                    <span style={styles.quantity}>{product.quantity}</span>
                    <span style={styles.unit}>{product.unit}</span>
                    <span style={styles.productName}>{product.productName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recipes */}
          {response.recipes && response.recipes.length > 0 && (
            <div style={styles.section}>
              <h5 style={styles.sectionTitle}>📝 Recipes</h5>
              {response.recipes.map((recipe, index) => (
                <div key={index} style={styles.recipe}>
                  <h6 style={styles.recipeName}>{recipe.name}</h6>
                  
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div style={styles.recipeSection}>
                      <strong>Ingredients:</strong>
                      <ul style={styles.ingredientList}>
                        {recipe.ingredients.map((ingredient, idx) => (
                          <li key={idx} style={styles.ingredient}>
                            {safeExtractIngredientString(ingredient)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {recipe.instructions && recipe.instructions.length > 0 && (
                    <div style={styles.recipeSection}>
                      <strong>Instructions:</strong>
                      <ol style={styles.instructionList}>
                        {recipe.instructions.map((instruction, idx) => (
                          <li key={idx} style={styles.instruction}>
                            {instruction}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Full Response (Collapsible) */}
          <details style={styles.details}>
            <summary style={styles.summary}>📄 View Full Response</summary>
            <pre style={styles.rawResponse}>{response.response}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: '0 0 8px 0',
    color: '#333',
    fontSize: '20px'
  },
  subtitle: {
    margin: '0',
    color: '#666',
    fontSize: '14px'
  },
  form: {
    marginBottom: '20px'
  },
  serviceSelector: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#333'
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px'
  },
  serviceButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: '14px'
  },
  serviceButtonActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderColor: '#007bff'
  },
  inputGroup: {
    marginBottom: '16px'
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'Arial, sans-serif',
    resize: 'vertical',
    minHeight: '100px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  submitButtonDisabled: {
    backgroundColor: '#6c757d',
    cursor: 'not-allowed'
  },
  clearButton: {
    padding: '8px 16px',
    backgroundColor: '#dc3545',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid #f5c6cb',
    marginBottom: '20px'
  },
  results: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '20px'
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #eee'
  },
  resultTitle: {
    margin: '0',
    color: '#333'
  },
  resultStats: {
    display: 'flex',
    gap: '12px',
    fontSize: '12px'
  },
  stat: {
    backgroundColor: '#e9ecef',
    padding: '4px 8px',
    borderRadius: '12px',
    color: '#495057'
  },
  section: {
    marginBottom: '20px'
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    color: '#333'
  },
  productList: {
    listStyle: 'none',
    padding: '0',
    margin: '0'
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  quantity: {
    fontWeight: 'bold',
    minWidth: '40px',
    color: '#007bff'
  },
  unit: {
    minWidth: '60px',
    color: '#666',
    fontSize: '14px'
  },
  productName: {
    flex: 1,
    color: '#333'
  },
  recipe: {
    backgroundColor: '#f8f9fa',
    padding: '16px',
    borderRadius: '4px',
    marginBottom: '12px'
  },
  recipeName: {
    margin: '0 0 12px 0',
    color: '#333',
    borderBottom: '1px solid #ddd',
    paddingBottom: '8px'
  },
  recipeSection: {
    marginBottom: '12px'
  },
  ingredientList: {
    margin: '8px 0',
    paddingLeft: '20px'
  },
  ingredient: {
    marginBottom: '4px',
    color: '#555'
  },
  instructionList: {
    margin: '8px 0',
    paddingLeft: '20px'
  },
  instruction: {
    marginBottom: '8px',
    color: '#555',
    lineHeight: '1.4'
  },
  details: {
    marginTop: '20px',
    border: '1px solid #ddd',
    borderRadius: '4px'
  },
  summary: {
    padding: '12px',
    backgroundColor: '#f8f9fa',
    cursor: 'pointer',
    borderBottom: '1px solid #ddd'
  },
  rawResponse: {
    padding: '12px',
    margin: '0',
    backgroundColor: '#fff',
    fontSize: '12px',
    lineHeight: '1.4',
    whiteSpace: 'pre-wrap',
    overflow: 'auto',
    maxHeight: '300px'
  }
};

export default SimplifiedAIHelper;