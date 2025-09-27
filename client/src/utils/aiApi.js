export const askClaude = async (prompt, options = {}) => {
  const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

  try {
    const res = await fetch(`${API_URL}/api/ai/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, options })
    });

    const data = await res.json();

    // Handle 503 or other service errors gracefully
    if (!res.ok || data.error === 'AI service temporarily unavailable') {
      console.warn('AI service unavailable, returning fallback response');
      return {
        success: false,
        error: 'AI service temporarily unavailable',
        message: 'The AI service is temporarily unavailable. You can still add items manually.',
        response: '',
        products: [],
        groceryList: [],
        fallback: true,
        source: 'client_fallback'
      };
    }

    return data;
  } catch (error) {
    console.error('Failed to connect to AI service:', error);
    return {
      success: false,
      error: 'Network error',
      message: 'Unable to connect to the AI service. Please check your connection and try again.',
      response: '',
      products: [],
      groceryList: [],
      fallback: true,
      source: 'client_error'
    };
  }
};

export const askChatGPT = async (prompt, options = {}) => {
  const API_URL = process.env.REACT_APP_API_URL || 'https://cartsmash-api.onrender.com';

  try {
    const res = await fetch(`${API_URL}/api/ai/chatgpt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, options })
    });

    const data = await res.json();

    // Handle 503 or other service errors gracefully
    if (!res.ok || data.error === 'AI service temporarily unavailable') {
      console.warn('AI service unavailable, returning fallback response');
      return {
        success: false,
        error: 'AI service temporarily unavailable',
        message: 'The AI service is temporarily unavailable. You can still add items manually.',
        response: '',
        products: [],
        groceryList: [],
        fallback: true,
        source: 'client_fallback'
      };
    }

    return data;
  } catch (error) {
    console.error('Failed to connect to AI service:', error);
    return {
      success: false,
      error: 'Network error',
      message: 'Unable to connect to the AI service. Please check your connection and try again.',
      response: '',
      products: [],
      groceryList: [],
      fallback: true,
      source: 'client_error'
    };
  }
};
