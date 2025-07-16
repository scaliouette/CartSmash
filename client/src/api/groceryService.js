// api/groceryService.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class GroceryService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    const url = this.baseURL + endpoint;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'HTTP error! status: ' + response.status);
      }

      return data;
    } catch (error) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to server. Please ensure the backend is running on port 3001.');
      }
      throw error;
    }
  }

  async checkHealth() {
    return this.request('/health');
  }

  async parseGroceryList(listText) {
    return this.request('/api/grocery-list/parse', {
      method: 'POST',
      body: JSON.stringify({ listText }),
    });
  }

  async parseGroceryListAdvanced(listText, options = {}) {
    return this.request('/api/grocery-list/parse-advanced', {
      method: 'POST',
      body: JSON.stringify({ listText, options }),
    });
  }

  async searchInstacart(query, limit = 5) {
    return this.request('/api/instacart/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit }),
    });
  }

  validateGroceryList(listText) {
    if (!listText || typeof listText !== 'string') {
      return {
        valid: false,
        error: 'List cannot be empty'
      };
    }

    const trimmed = listText.trim();
    if (trimmed.length === 0) {
      return {
        valid: false,
        error: 'List cannot be empty'
      };
    }

    const lines = trimmed.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return {
        valid: false,
        error: 'No valid items found in the list'
      };
    }

    if (lines.length > 100) {
      return {
        valid: false,
        error: 'List is too long (maximum 100 items)'
      };
    }

    return {
      valid: true,
      lineCount: lines.length
    };
  }
}

const groceryService = new GroceryService();
export { GroceryService, groceryService as default };