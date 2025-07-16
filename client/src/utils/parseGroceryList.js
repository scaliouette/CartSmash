// Cart Smash - Client-side grocery list parser with merge/replace functionality
const parseGroceryList = async (text, action = 'replace') => {
  try {
    const response = await fetch('/api/cart/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        listText: text, 
        action 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to parse list.');
    }

    const data = await response.json();
    return {
      success: true,
      cart: data.cart,
      action: action,
      itemCount: data.cart.length,
      itemsAdded: data.itemsAdded,
      totalItems: data.totalItems
    };
  } catch (error) {
    console.error('Parse grocery list error:', error);
    throw new Error(error.message || 'Failed to parse grocery list');
  }
};

// Get current cart state
const getCurrentCart = async () => {
  try {
    const response = await fetch('/api/cart/current');
    if (!response.ok) {
      throw new Error('Failed to get current cart');
    }
    const data = await response.json();
    return data.cart;
  } catch (error) {
    console.error('Get current cart error:', error);
    return [];
  }
};

// Clear entire cart
const clearCart = async () => {
  try {
    const response = await fetch('/api/cart/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to clear cart');
    }
    
    return { success: true, cart: [] };
  } catch (error) {
    console.error('Clear cart error:', error);
    throw error;
  }
};

// Remove specific item from cart
const removeCartItem = async (itemId) => {
  try {
    const response = await fetch(`/api/cart/item/${itemId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error('Failed to remove item');
    }
    
    const data = await response.json();
    return data.cart;
  } catch (error) {
    console.error('Remove cart item error:', error);
    throw error;
  }
};

export { parseGroceryList, getCurrentCart, clearCart, removeCartItem };
export default parseGroceryList;