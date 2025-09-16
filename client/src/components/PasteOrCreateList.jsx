import React, { useState, useEffect } from 'react';
import { Send, Sparkles, Loader2, Copy, Check, ShoppingCart, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const GroceryListForm = ({ 
  currentCart, 
  setCurrentCart, 
  savedRecipes, 
  setSavedRecipes,
  saveCartAsList,
  saveRecipe,
  loadRecipeToCart 
}) => {
  const { currentUser } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [copiedItems, setCopiedItems] = useState(false);
  const [error, setError] = useState(null);
  const [listName, setListName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

 const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';;

  const quickTemplates = [
    {
      id: 'weekly',
      icon: '📅',
      title: 'Weekly Meal Plan',
      text: "Create a 7-day meal plan with complete grocery shopping list for a family of 4. Include breakfast, lunch, and dinner with healthy, balanced meals.",
      category: 'meal-planning'
    },
    {
      id: 'budget',
      icon: '💰',
      title: 'Budget Shopping',
      text: "Create a budget-friendly grocery list for $75 per week for 2 people. Focus on nutritious, filling meals using affordable ingredients.",
      category: 'budget'
    },
    {
      id: 'quick',
      icon: '⚡',
      title: 'Quick Dinners',
      text: "Give me 5 quick 30-minute dinner recipes using basic store-bought ingredients (sauces, pre-made items). Include the complete grocery list.",
      category: 'quick-meals'
    },
    {
      id: 'healthy',
      icon: '🥗',
      title: 'Healthy Options',
      text: "Create a clean eating grocery list and meal plan focused on whole foods, lean proteins, and fresh vegetables. No processed foods.",
      category: 'healthy'
    },
    {
      id: 'party',
      icon: '🎉',
      title: 'Party Planning',
      text: "Create a grocery list for a party of 20 people. Include appetizers, main dishes, drinks, and desserts.",
      category: 'entertaining'
    },
    {
      id: 'diet',
      icon: '🍽️',
      title: 'Special Diet',
      text: "Create a week's grocery list for a keto/low-carb diet for 2 people. Include breakfast, lunch, dinner, and snacks.",
      category: 'special-diet'
    }
  ];

  const handleProcessList = async () => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/cart/parse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listText: inputText,
          action: currentCart.length > 0 ? 'merge' : 'replace',
          userId: currentUser?.uid,
          useAI: true,
          options: {
            mergeDuplicates: true,
            strictMode: true
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCurrentCart(data.cart);
        setInputText('');
        setSelectedCategory(null);
      } else {
        throw new Error(data.error || 'Failed to process list');
      }
    } catch (error) {
      console.error('Error processing list:', error);
      setError(error.message || 'Failed to process list. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTemplateClick = (template) => {
    setInputText(template.text);
    setSelectedCategory(template.category);
    document.getElementById('grocery-input')?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyCartToClipboard = () => {
    if (currentCart.length > 0) {
      const itemsList = currentCart
        .map(item => `${item.quantity} ${item.unit !== 'each' ? item.unit : ''} ${item.productName}`)
        .join('\n');
      navigator.clipboard.writeText(itemsList);
      setCopiedItems(true);
      setTimeout(() => setCopiedItems(false), 2000);
    }
  };

  const handleSaveCart = async () => {
    const name = listName || `Shopping List ${new Date().toLocaleDateString()}`;
    const savedList = await saveCartAsList(name);
    if (savedList) {
      setShowSaveDialog(false);
      setListName('');
      alert(`List saved as "${name}"`);
    }
  };

  const clearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      setCurrentCart([]);
    }
  };

  const removeItem = (index) => {
    setCurrentCart(prev => prev.filter((_, i) => i !== index));
  };

  const getCategoryColor = (category) => {
    const colors = {
      'dairy': 'bg-blue-100 text-blue-800 border-blue-300',
      'produce': 'bg-green-100 text-green-800 border-green-300',
      'meat': 'bg-red-100 text-red-800 border-red-300',
      'pantry': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'frozen': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'bakery': 'bg-orange-100 text-orange-800 border-orange-300',
      'beverages': 'bg-purple-100 text-purple-800 border-purple-300',
      'other': 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[category] || colors['other'];
  };

  const sendToKroger = async () => {
    if (!currentUser) {
      alert('Please sign in to send items to Kroger');
      return;
    }

    // Check for selected store from StoresPage
    let storeId = '01400943'; // Default fallback store
    try {
      const savedStore = localStorage.getItem('selectedStore');
      if (savedStore) {
        const storeData = JSON.parse(savedStore);
        storeId = storeData.locationId;
        console.log('🏪 Using selected store:', storeData.name, storeId);
      }
    } catch (error) {
      console.log('Using default store due to error:', error);
    }

    // Suggest selecting a store if using default
    if (storeId === '01400943') {
      const shouldSelectStore = window.confirm(
        'No store selected. Would you like to choose your Kroger store first for better accuracy?\n\nClick OK to select store, or Cancel to use default store.'
      );
      if (shouldSelectStore) {
        // Navigate to stores page
        if (window.location.hash) {
          window.location.hash = '#stores';
        }
        return;
      }
    }
    
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_URL}/api/kroger-orders/cart/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-id': currentUser.email || currentUser.uid
        },
        body: JSON.stringify({
          cartItems: currentCart,
          storeId: storeId,
          modality: 'PICKUP'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully sent ${data.itemsAdded} items to Kroger!`);
      } else if (data.needsAuth) {
        if (window.confirm('You need to connect your Kroger account. Authenticate now?')) {
          window.location.href = `${API_URL}/api/auth/kroger/login?userId=${currentUser.email}`;
        }
      } else {
        throw new Error(data.error || 'Failed to send to Kroger');
      }
    } catch (error) {
      console.error('Error sending to Kroger:', error);
      alert('Failed to send items to Kroger. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grocery-list-container max-w-6xl mx-auto p-4">
      {/* Main Input Section - Paste or Create */}
      <div className="input-section bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <Sparkles className="w-6 h-6 text-orange-500 mr-2" />
          <h1 className="text-2xl font-bold text-gray-800">Paste or Create Grocery List</ดวน>
        </div>
        
        <textarea
          id="grocery-input"
          className="w-full h-48 p-4 border-2 border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all text-gray-700"
          placeholder="Paste your grocery list here or type items like:
• 2 lbs chicken breast
• 1 gallon milk
• 3 bananas

Or describe what you need: 'Ingredients for tacos for 6 people'"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        />
        
        <div className="flex gap-4 mt-4">
          <button
            onClick={handleProcessList}
            disabled={!inputText.trim() || isProcessing}
            className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all font-semibold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing with AI...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                {currentCart.length > 0 ? 'Add to Cart' : 'Process with AI'}
              </>
            )}
          </button>
          
          {inputText.trim() && (
            <button
              onClick={() => setInputText('')}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Quick Templates */}
      <div className="templates-section bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Quick Templates</h3>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
        
        {showTemplates && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {quickTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className={`p-4 border-2 rounded-lg hover:shadow-md transition-all text-left ${
                  selectedCategory === template.category 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="text-3xl mb-2">{template.icon}</div>
                <div className="font-semibold text-sm text-gray-800">{template.title}</div>
                <div className="text-xs text-gray-500 mt-1">Click to use template</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Cart Display */}
      {currentCart.length > 0 && (
        <div className="cart-section bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Current Cart ({currentCart.length} items)
            </h3>
            <div className="flex gap-2">
              <button
                onClick={copyCartToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {copiedItems ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span className="text-sm">Copy List</span>
                  </>
                )}
              </button>
              <button
                onClick={clearCart}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm">Clear</span>
              </button>
            </div>
          </div>
          
          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {currentCart.map((item, idx) => (
              <div 
                key={idx} 
                className="relative bg-gray-50 p-3 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow group"
              >
                <button
                  onClick={() => removeItem(idx)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="pr-6">
                  <div className="font-medium text-gray-800">
                    {item.quantity} {item.unit !== 'each' && item.unit} {item.productName}
                  </div>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full mt-2 border ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  {item.confidence && (
                    <div className="mt-2">
                      <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            item.confidence >= 0.8 ? 'bg-green-500' : 
                            item.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${item.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button 
              onClick={() => setShowSaveDialog(true)}
              className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center font-semibold"
            >
              <Save className="w-5 h-5 mr-2" />
              Save List
            </button>
            <button 
              onClick={sendToKroger}
              disabled={isProcessing}
              className="flex-1 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center font-semibold disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Send to Kroger
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Save Shopping List</h3>
            <input
              type="text"
              placeholder="Enter list name..."
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleSaveCart}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setListName('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroceryListForm;